import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';

const targets = await fetch(`http://127.0.0.1:${process.env.CDP_PORT}/json/list`).then(r => r.json());
const ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });
let id = 0;
const pending = new Map();
const errors = [];
let acceptDialogs = false;
let prompted = 0;
ws.addEventListener('message', ({ data }) => {
  const msg = JSON.parse(data);
  if (msg.id) { const job = pending.get(msg.id); if (job) { pending.delete(msg.id); if (msg.error) job.reject(new Error(JSON.stringify(msg.error))); else job.resolve(msg.result); } }
  else if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails);
  else if (msg.method === 'Page.javascriptDialogOpening') { prompted++; void send('Page.handleJavaScriptDialog', { accept: acceptDialogs }); }
});
const send = (method, params = {}) => new Promise((resolve, reject) => { const messageId = ++id; const timer = setTimeout(() => { pending.delete(messageId); reject(new Error(`CDP timeout: ${method}`)); }, 20000); pending.set(messageId, { resolve: result => { clearTimeout(timer); resolve(result); }, reject: error => { clearTimeout(timer); reject(error); } }); ws.send(JSON.stringify({ id: messageId, method, params })); });
const evaluate = async expression => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text); return r.result.value; };
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(expression, label) { for (let n = 0; n < 120; n++) { if (await evaluate(expression)) return; await wait(100); } throw new Error(`等待失败：${label}`); }
const button = (text, scope = 'document') => `[...${scope}.querySelectorAll('button')].find(e=>e.textContent.trim()===${JSON.stringify(text)}&&!e.disabled)`;
async function click(expression) {
  const point = await evaluate(`(()=>{const e=${expression};if(!e)throw Error('找不到按钮：'+${JSON.stringify(expression)});e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point });
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', buttons: 1, clickCount: 1, ...point });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', buttons: 0, clickCount: 1, ...point }); await wait(120);
}
async function fill(selector, value) { await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('找不到输入：'+${JSON.stringify(selector)});const p=e.tagName==='SELECT'?HTMLSelectElement.prototype:e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(p,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));})()`); await wait(60); }
const close = () => click(`document.querySelector('dialog [aria-label="关闭对话框"]')`);
async function view(name) { const selector = `nav [data-view="${name}"]`; if (!await evaluate(`document.querySelector(${JSON.stringify(selector)}).closest('details').open`)) await click(`document.querySelector(${JSON.stringify(selector)}).closest('details').querySelector('summary')`); await click(`document.querySelector(${JSON.stringify(selector)})`); }
const readState = () => evaluate(`new Promise((resolve,reject)=>{const r=indexedDB.open('xu-cang-erp-v1',1);r.onsuccess=()=>{const db=r.result;const t=db.transaction('workspace','readonly');const q=t.objectStore('workspace').get('main');q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);t.oncomplete=()=>db.close();};r.onerror=()=>reject(r.error);})`);
const compile = source => ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const modelUrl = `data:text/javascript;base64,${Buffer.from(compile(await readFile('app/erp/model.ts', 'utf8'))).toString('base64')}`;
const storageUrl = `data:text/javascript;base64,${Buffer.from(compile(await readFile('app/erp/storage.ts', 'utf8')).replace(/from ['"]\.\/model['"]/, `from '${modelUrl}'`)).toString('base64')}`;
const command = c => evaluate(`(async()=>{const {transact}=await import(${JSON.stringify(storageUrl)});return await transact(${JSON.stringify(c)})})()`);
const sync = () => evaluate(`(()=>{const c=new BroadcastChannel('xu-cang-erp-updates');c.postMessage('updated');c.close()})()`);
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const scope = "document.querySelector('dialog')";
await mkdir(path.resolve('artifacts/erp'), { recursive: true });
async function shot(name) {
  const small = await evaluate(`(()=>{const failures=[],w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);while(w.nextNode()){const n=w.currentNode,p=n.parentElement;if(!n.textContent.trim()||!p||p.closest('script,style'))continue;const r=document.createRange();r.selectNodeContents(n);const css=getComputedStyle(p);if(css.visibility!=='hidden'&&css.display!=='none'&&[...r.getClientRects()].some(x=>x.width>1&&x.height>1)&&parseFloat(css.fontSize)<12)failures.push({text:n.textContent.trim(),size:css.fontSize})}return failures})()`);
  assert.deepEqual(small, [], '可见文字最低 12px');
  await writeFile(path.resolve('artifacts/erp', name), Buffer.from((await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })).data, 'base64'));
}
async function save() { await click(button('保存采购退货草稿', scope)); await until(`document.querySelector('dialog')?.textContent.includes('操作记录')`, '保存采购退货'); return (await readState()).purchaseReturns.at(-1); }
async function confirm() {
  await click(button('确认采购退货出库', scope));
  assert.equal(await evaluate(`document.querySelector('dialog button[type="submit"]').disabled`), true);
  await click(`document.querySelector('[aria-label="确认采购退货已交接出库"]')`);
  await click(button('确认交接并退货出库', scope));
  await until(`document.querySelector('dialog')?.textContent.includes('确认采购退货交接出库')&&!document.querySelector('dialog button[type="submit"]')`, '采购退货出库');
}
async function fillReturn(productId, quantity, date = '') {
  await fill('dialog [aria-label="采购退货第1行商品"]', productId);
  await fill('dialog [aria-label="采购退货第1行数量"]', String(quantity));
  await fill('dialog [aria-label="采购退货第1行原因"]', '多购协商退回，本次实物已核对');
  if (date) await fill('dialog [aria-label="采购退货实际日期"]', date);
}
try {
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: process.env.PREVIEW_URL ?? 'http://localhost:3000/erp' });
  await until(`document.querySelectorAll('tbody tr').length===4`, '工作区载入');
  const original = await readState(); const legacy = structuredClone(original); delete legacy.purchaseReturns;
  await evaluate(`new Promise((resolve,reject)=>{const r=indexedDB.open('xu-cang-erp-v1',1);r.onsuccess=()=>{const db=r.result,t=db.transaction('workspace','readwrite');t.objectStore('workspace').put(${JSON.stringify(legacy)},'main');t.oncomplete=()=>{db.close();resolve(true)};t.onerror=()=>reject(t.error)}})`);
  await send('Page.reload'); await until(`document.querySelectorAll('tbody tr').length===4`, '旧集合补齐');
  assert.deepEqual((await readState()).purchaseReturns, []); assert.deepEqual((await readState()).products, original.products); assert.deepEqual((await readState()).salesReturns, original.salesReturns);
  const chair = original.products[0]; const desk = original.products[1];
  let state = await command({ type: 'add-supplier', name: '采购退货验收供货方' }); const supplier = state.suppliers.at(-1);
  state = await command({ type: 'save-receipt', supplierId: supplier.id, receiptDate: today(), deliveryNumber: 'PR-QA-001', note: '采购退货来源', lines: [{ productId: chair.id, quantity: 50, price: '10' }, { productId: desk.id, quantity: 10, price: '20' }] });
  const sourceId = state.receipts.at(-1).id;
  state = await command({ type: 'confirm-receipt', receiptId: sourceId }); const source = state.receipts.at(-1); const startStock = state.products[0].stock;
  await command({ type: 'update-supplier', supplierId: supplier.id, name: '更名后的采购退货供货方' });
  await sync(); await view('receipts'); await until(`document.querySelectorAll('tbody tr').length===1`, '采购来源载入');
  await click(button(source.number)); await click(button('创建采购退货单', scope));
  assert.equal(await evaluate(`document.querySelector('[aria-label="采购退货原入库单"]').value`), source.id);
  await fill('dialog [aria-label="采购退货第1行商品"]', chair.id);
  assert.equal(await evaluate(`document.querySelector('[aria-label="采购退货第1行数量"]').value`), '');
  await fillReturn(chair.id, 10); await shot('purchase-return-editor-desktop.png');
  const first = await save(); assert.equal((await readState()).products[0].stock, startStock);
  await click(button('确认采购退货出库', scope)); assert.equal(await evaluate(`document.querySelector('dialog button[type="submit"]').disabled`), true);
  await click(button('返回详情', scope)); await click(button('编辑草稿', scope)); await fill('dialog [aria-label="采购退货实际日期"]', today()); await save(); await confirm();
  state = await readState(); assert.equal(state.products[0].stock, startStock - 10); assert.deepEqual(state.receipts.find(r => r.id === sourceId), source);
  await shot('purchase-return-detail-desktop.png'); await click(button('查看本单流水', scope)); await until(`document.querySelector('h1').textContent==='库存流水'`, '采购退货流水');
  assert.equal(await evaluate(`document.querySelectorAll('tbody tr').length`), 1); await click(button(first.number)); await click(button('查看原入库单', scope));
  await until(`document.querySelector('dialog')?.textContent.includes('部分退货')`, '原入库退货摘要');
  assert.equal(await evaluate(`[...document.querySelectorAll('dialog button')].find(b=>b.textContent==='冲销入库').disabled`), true);
  await click(button('创建采购退货单', scope)); await fillReturn(chair.id, 5, today()); await save(); await confirm(); assert.equal((await readState()).products[0].stock, startStock - 15); await close();
  await click(button('新建采购退货单')); await fillReturn(chair.id, 5, today()); await save(); await click(button('确认采购退货出库', scope));
  assert.equal(await evaluate(`document.querySelector('dialog').textContent.includes('疑似重复退货')`), true);
  await click(`document.querySelector('[aria-label="确认采购退货已交接出库"]')`); assert.equal(await evaluate(`document.querySelector('dialog button[type="submit"]').disabled`), true);
  await click(`document.querySelector('[aria-label="已核对疑似重复退货"]')`); await click(button('确认交接并退货出库', scope));
  await until(`document.querySelector('dialog')?.textContent.includes('已人工核对疑似重复采购退货')&&!document.querySelector('dialog button[type="submit"]')`, '重复核对'); await close();
  await fill('[aria-label="筛选采购退货状态"]', 'returned'); await fill('[aria-label="筛选供应商"]', supplier.id); await fill('[aria-label="筛选商品"]', chair.id); await fill('[aria-label="创建日期从"]', today()); await fill('[aria-label="创建日期至"]', today());
  assert.equal(await evaluate(`document.querySelectorAll('tbody tr').length`), 3); await fill('[aria-label="搜索采购退货"]', '不存在'); assert.equal(await evaluate(`document.querySelectorAll('tbody tr').length`), 0); await click(button('重置筛选')); assert.equal(await evaluate(`document.querySelectorAll('tbody tr').length`), 3);
  await shot('purchase-return-list-desktop.png');
  await click(button('新建采购退货单')); await fillReturn(chair.id, 1); const beforePrompt = prompted; await close(); assert.ok(prompted > beforePrompt); assert.equal(await evaluate(`Boolean(document.querySelector('dialog'))`), true);
  const draft = await save(); await click(button('取消采购退货单', scope)); await fill('dialog [aria-label="取消采购退货原因"]', '供应商协商取消'); await click(button('确认取消采购退货单', scope)); await until(`document.querySelector('dialog')?.textContent.includes('供应商协商取消')&&!document.querySelector('dialog button[type="submit"]')`, '取消采购退货'); assert.equal((await readState()).purchaseReturns.find(r => r.id === draft.id).status, 'cancelled'); await close();
  await view('suppliers'); await click(button('查看采购退货')); await until(`document.querySelector('h1').textContent==='采购退货'`, '供应商反查'); assert.equal(await evaluate(`document.querySelector('[aria-label="筛选供应商"]').value`), supplier.id);
  await send('Page.reload'); await until(`document.querySelectorAll('tbody tr').length===4`, '刷新保留'); assert.equal((await readState()).purchaseReturns.length, 4);
  for (const width of [1024, 390]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 950, deviceScaleFactor: 1, mobile: false }); await view('purchaseReturns'); assert.equal(await evaluate('document.documentElement.scrollWidth'), width);
    await shot(`purchase-return-list-${width}.png`); await click(button('新建采购退货单')); await fill('dialog [aria-label="查找采购退货原入库单"]', supplier.name); assert.equal(await evaluate(`Boolean([...document.querySelector('[aria-label="采购退货原入库单"]').options].find(o=>o.value===${JSON.stringify(source.id)}&&o.textContent.includes(${JSON.stringify(supplier.name)})))`), true); await fill('dialog [aria-label="采购退货原入库单"]', source.id); await fillReturn(chair.id, 2, today());
    if (width === 390) { const bounds = await evaluate(`(()=>{const e=document.querySelector('[aria-label="采购退货第1行数量"]'),r=e.getBoundingClientRect();return {left:r.left,right:r.right,size:getComputedStyle(e).fontSize}})()`); assert.ok(bounds.left >= 0 && bounds.right <= width); assert.equal(bounds.size, '16px'); }
    await shot(`purchase-return-editor-${width}.png`);
    if (width === 390) { await save(); await confirm(); await shot('purchase-return-detail-390.png'); await close(); }
    else { acceptDialogs = true; await close(); acceptDialogs = false; }
  }
  const txResult = await evaluate(`(async()=>{
    const {transact}=await import(${JSON.stringify(storageUrl)});
    const make=(receiptId,p,q,note)=>({type:'save-purchase-return',receiptId,returnDate:${JSON.stringify(today())},note,lines:[{productId:p,quantity:q,reason:'真实事务验收'}]});
    const confirm=r=>({type:'confirm-purchase-return',purchaseReturnId:r.id,revision:r.revision,handedOver:true});
    const before=await transact();const a=(await transact(make(${JSON.stringify(source.id)},${JSON.stringify(chair.id)},20,'同源一'))).purchaseReturns.at(-1);const b=(await transact(make(${JSON.stringify(source.id)},${JSON.stringify(chair.id)},20,'同源二'))).purchaseReturns.at(-1);
    const results=await Promise.allSettled([a,a,b].map(r=>transact(confirm(r))));const after=await transact();
    const sourceRace={fulfilled:results.filter(r=>r.status==='fulfilled').length,rejected:results.filter(r=>r.status==='rejected').length,entries:after.ledger.filter(l=>l.purchaseReturnId===a.id).length,second:after.purchaseReturns.find(r=>r.id===b.id).status,delta:before.products.find(p=>p.id===${JSON.stringify(chair.id)}).stock-after.products.find(p=>p.id===${JSON.stringify(chair.id)}).stock};
    const createReceipt=async(p,q)=>{const saved=await transact({type:'save-receipt',supplierId:${JSON.stringify(supplier.id)},receiptDate:${JSON.stringify(today())},deliveryNumber:'',note:'竞态来源',lines:[{productId:p,quantity:q,price:'1'}]});const src=saved.receipts.at(-1);await transact({type:'confirm-receipt',receiptId:src.id});return src};
    const added=await transact({type:'add-product',name:'并发退货测试商品',sku:'PR-RACE',unit:'件',price:'1'});const p=added.products.at(-1);const s1=await createReceipt(p.id,8),s2=await createReceipt(p.id,8);const order=(await transact({type:'save-order',customerId:added.customers[0].id,deliveryDate:${JSON.stringify(today())},note:'扣到十件',lines:[{productId:p.id,quantity:6,price:'1'}]})).orders.at(-1);await transact({type:'submit',orderId:order.id});await transact({type:'ship',orderId:order.id});
    const r1=(await transact(make(s1.id,p.id,8,'库存一'))).purchaseReturns.at(-1);const r2=(await transact(make(s2.id,p.id,8,'库存二'))).purchaseReturns.at(-1);const sharedResults=await Promise.allSettled([r1,r2].map(r=>transact(confirm(r))));
    const shared={fulfilled:sharedResults.filter(r=>r.status==='fulfilled').length,rejected:sharedResults.filter(r=>r.status==='rejected').length,stock:(await transact()).products.find(x=>x.id===p.id).stock,source2:s2.id,productId:p.id};
    const reverseSource=await createReceipt(${JSON.stringify(desk.id)},4);const draft=(await transact(make(reverseSource.id,${JSON.stringify(desk.id)},2,'冲销先'))).purchaseReturns.at(-1);const reverseFirst=await Promise.allSettled([transact({type:'reverse-receipt',receiptId:reverseSource.id,reason:'录错'}),transact(confirm(draft))]);
    const returnSource=await createReceipt(${JSON.stringify(desk.id)},4);const ret=(await transact(make(returnSource.id,${JSON.stringify(desk.id)},2,'退货先'))).purchaseReturns.at(-1);const returnFirst=await Promise.allSettled([transact(confirm(ret)),transact({type:'reverse-receipt',receiptId:returnSource.id,reason:'录错'})]);
    const rollbackDoc=(await transact(make(${JSON.stringify(source.id)},${JSON.stringify(desk.id)},1,'存储回滚'))).purchaseReturns.at(-1);const snap=await transact();const put=IDBObjectStore.prototype.put;let rejected=false;try{IDBObjectStore.prototype.put=function(){throw new DOMException('模拟存储失败','QuotaExceededError')};await transact(confirm(rollbackDoc))}catch{rejected=true}finally{IDBObjectStore.prototype.put=put}const rollback={rejected,unchanged:JSON.stringify(snap)===JSON.stringify(await transact())};
    return {sourceRace,shared,invalidDraft:{id:draft.id,number:draft.number,receiptId:reverseSource.id,receiptNumber:reverseSource.number},reverseFirst:reverseFirst.map(r=>r.status),returnFirst:returnFirst.map(r=>r.status),rollback};
  })()`);
  assert.deepEqual(txResult.sourceRace, { fulfilled: 2, rejected: 1, entries: 1, second: 'draft', delta: 20 });
  assert.equal(txResult.shared.fulfilled, 1); assert.equal(txResult.shared.rejected, 1); assert.equal(txResult.shared.stock, 2);
  assert.deepEqual(txResult.reverseFirst, ['fulfilled', 'rejected']); assert.deepEqual(txResult.returnFirst, ['fulfilled', 'rejected']); assert.deepEqual(txResult.rollback, { rejected: true, unchanged: true });
  await sync(); await wait(200); await view('purchaseReturns'); await click(button('新建采购退货单')); await fill('dialog [aria-label="采购退货原入库单"]', txResult.shared.source2); await fillReturn(txResult.shared.productId, 5, today());
  assert.equal(await evaluate(`document.querySelector('dialog').textContent.includes('当前库存不足，可保存草稿')`), true); const shortageDraft=await save(); assert.equal(await evaluate(`[...document.querySelectorAll('dialog button')].find(b=>b.textContent==='确认采购退货出库').disabled`), true);
  await click(button('编辑草稿', scope)); await fill('dialog [aria-label="采购退货备注"]', '本页未保存的备注');
  await command({type:'save-purchase-return',purchaseReturnId:shortageDraft.id,revision:shortageDraft.revision,receiptId:shortageDraft.receiptId,returnDate:shortageDraft.returnDate,note:'其他页面已更新',lines:shortageDraft.lines}); await sync();
  await until(`document.querySelector('dialog')?.textContent.includes('其他页面更新')`, '旧修订提示'); assert.equal(await evaluate(`document.querySelector('dialog button[type="submit"]').disabled`), true); acceptDialogs=true;await close();acceptDialogs=false;
  await view('receipts'); await click(button(txResult.invalidDraft.receiptNumber));
  assert.equal(await evaluate(`document.querySelector('dialog').textContent.includes(${JSON.stringify(txResult.invalidDraft.number)})`), true, '已冲销原单仍应保留退货草稿入口');
  await click(`[...document.querySelectorAll('dialog button')].find(b=>b.textContent.includes(${JSON.stringify(txResult.invalidDraft.number)}))`);
  await until(`document.querySelector('dialog')?.textContent.includes('来源失效')`, '失效来源提示'); await click(button('取消采购退货单', scope)); await fill('dialog [aria-label="取消采购退货原因"]', '原单冲销后取消失效草稿'); await click(button('确认取消采购退货单', scope));
  await until(`document.querySelector('dialog')?.textContent.includes('原单冲销后取消失效草稿')&&!document.querySelector('dialog button[type="submit"]')`, '取消失效草稿');
  assert.equal(errors.length, 0, JSON.stringify(errors));
  console.log('PASS: 采购退货迁移、原单建单、部分分次、日期与交接、冲销互斥、重复勾选、取消及筛选追溯、刷新、手机完整出库、缺货草稿与修订保护；真实IndexedDB同源额度、不同源库存竞争、双向冲销竞态和存储失败回滚。');
} catch (error) { await writeFile(path.resolve('artifacts/erp/purchase-return-failure.png'), Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64')); console.error(await evaluate('document.body.innerText')); throw error; }
finally { ws.close(); }
