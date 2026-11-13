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
async function save() { await click(button('保存退货草稿', scope)); await until(`document.querySelector('dialog')?.textContent.includes('操作记录')`, '保存草稿'); return (await readState()).salesReturns.at(-1); }
async function confirm() {
  await click(button('确认退货入库', scope));
  assert.equal(await evaluate(`document.querySelector('dialog button[type="submit"]').disabled`), true);
  await click(`document.querySelector('[aria-label="确认退货已收妥并验收合格"]')`);
  await click(button('确认验收并入库', scope));
  await until(`document.querySelector('dialog')?.textContent.includes('确认销售退货验收入库')&&!document.querySelector('dialog button[type="submit"]')`, '退货入库');
}
try {
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: process.env.PREVIEW_URL ?? 'http://localhost:3000/erp' });
  await until(`document.querySelectorAll('tbody tr').length===4`, '初始工作区');
  const original = await readState(); const legacy = structuredClone(original); delete legacy.salesReturns;
  await evaluate(`new Promise((resolve,reject)=>{const r=indexedDB.open('xu-cang-erp-v1',1);r.onsuccess=()=>{const db=r.result,t=db.transaction('workspace','readwrite');t.objectStore('workspace').put(${JSON.stringify(legacy)},'main');t.oncomplete=()=>{db.close();resolve(true)};t.onerror=()=>reject(t.error)}})`);
  await send('Page.reload'); await until(`document.querySelectorAll('tbody tr').length===4`, '兼容迁移');
  assert.deepEqual((await readState()).salesReturns, []); assert.deepEqual((await readState()).products, original.products);
  const chair = original.products[0]; const desk = original.products[1];
  let state = await command({ type: 'save-order', customerId: original.customers[0].id, deliveryDate: today(), note: '退货验收来源', lines: [{ productId: chair.id, quantity: 30, price: '10' }, { productId: desk.id, quantity: 10, price: '20' }] });
  const order = state.orders.at(-1);
  await command({ type: 'submit', orderId: order.id }); const shipped = (await command({ type: 'ship', orderId: order.id })).orders.at(-1); await sync();
  await until(`document.querySelectorAll('tbody tr').length===5`, '新销售订单');
  await click(button(order.number)); await click(button('创建退货单', scope));
  assert.equal(await evaluate(`document.querySelector('[aria-label="退货原销售订单"]').value`), order.id);
  await fill('dialog [aria-label="退货第1行商品"]', chair.id);
  assert.equal(await evaluate(`document.querySelector('[aria-label="退货第1行数量"]').value`), '');
  await fill('dialog [aria-label="退货第1行数量"]', '5'); await fill('dialog [aria-label="退货第1行原因"]', '客户多购，核验完好');
  await shot('sales-return-editor-desktop.png');
  const first = await save(); assert.equal((await readState()).products[0].stock, chair.stock - 30);
  await click(button('确认退货入库', scope)); assert.equal(await evaluate(`document.querySelector('dialog button[type="submit"]').disabled`), true);
  await click(button('返回详情', scope)); await click(button('编辑草稿', scope)); await fill('dialog [aria-label="退货实收日期"]', today()); await save(); await confirm();
  state = await readState(); assert.equal(state.products[0].stock, chair.stock - 25); assert.equal(state.salesReturns[0].status, 'received'); assert.deepEqual(state.orders.at(-1), shipped);
  await shot('sales-return-detail-desktop.png');
  await click(button('查看本单流水', scope)); await until(`document.querySelector('h1')?.textContent==='库存流水'`, '退货流水');
  assert.equal(await evaluate(`document.querySelectorAll('tbody tr').length`), 1); await click(button(first.number)); await until(`document.querySelector('dialog')?.textContent.includes('销售退货')`, '流水返回退货');
  await click(button('查看原订单', scope)); await until(`document.querySelector('dialog')?.textContent.includes('部分退货')`, '原单摘要');
  await click(button('创建退货单', scope)); await fill('dialog [aria-label="退货第1行商品"]', chair.id); await fill('dialog [aria-label="退货第1行数量"]', '3'); await fill('dialog [aria-label="退货第1行原因"]', '第二批完好退回'); await fill('dialog [aria-label="退货实收日期"]', today()); await save(); await confirm();
  assert.equal((await readState()).products[0].stock, chair.stock - 22); await close();
  await fill('[aria-label="筛选退货状态"]', 'received'); await fill('[aria-label="筛选客户"]', original.customers[0].id); await fill('[aria-label="筛选商品"]', chair.id); await fill('[aria-label="创建日期从"]', today()); await fill('[aria-label="创建日期至"]', today());
  assert.equal(await evaluate(`document.querySelectorAll('tbody tr').length`), 2); await fill('[aria-label="搜索退货"]', '不存在的退货单'); assert.equal(await evaluate(`document.querySelectorAll('tbody tr').length`), 0); await click(button('重置筛选')); assert.equal(await evaluate(`document.querySelectorAll('tbody tr').length`), 2);
  await shot('sales-return-list-desktop.png');
  await click(button('新建退货单')); await fill('dialog [aria-label="退货第1行商品"]', chair.id); await fill('dialog [aria-label="退货第1行数量"]', '1'); await fill('dialog [aria-label="退货第1行原因"]', '待核验');
  const promptsBefore = prompted; await close(); assert.equal(await evaluate(`Boolean(document.querySelector('dialog'))`), true); assert.ok(prompted > promptsBefore);
  const draft = await save(); await click(button('取消退货单', scope)); await fill('dialog [aria-label="取消退货原因"]', '客户暂不退回'); await click(button('确认取消退货单', scope)); await until(`document.querySelector('dialog')?.textContent.includes('客户暂不退回')&&!document.querySelector('dialog button[type="submit"]')`, '取消草稿'); assert.equal((await readState()).salesReturns.find(r => r.id === draft.id).status, 'cancelled'); await close();
  await send('Page.reload'); await until(`document.querySelectorAll('tbody tr').length===5`, '刷新保留'); assert.equal((await readState()).salesReturns.length, 3);
  for (const width of [1024, 390]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 950, deviceScaleFactor: 1, mobile: false }); await view('salesReturns'); assert.equal(await evaluate('document.documentElement.scrollWidth'), width);
    await shot(`sales-return-list-${width}.png`); await click(button('新建退货单')); await fill('dialog [aria-label="退货原销售订单"]', order.id); await fill('dialog [aria-label="退货第1行商品"]', chair.id); await fill('dialog [aria-label="退货第1行数量"]', '2'); await fill('dialog [aria-label="退货第1行原因"]', '响应式录入验证');
    const bounds = await evaluate(`(()=>{const r=document.querySelector('[aria-label="退货第1行数量"]').getBoundingClientRect();return {left:r.left,right:r.right,size:getComputedStyle(document.querySelector('[aria-label="退货第1行数量"]')).fontSize}})()`);
    if (width === 390) { assert.ok(bounds.left >= 0 && bounds.right <= width); assert.equal(bounds.size, '16px'); }
    await shot(`sales-return-editor-${width}.png`);
    if (width === 390) { await fill('dialog [aria-label="退货实收日期"]', today()); await save(); await confirm(); await shot('sales-return-detail-390.png'); await close(); }
    else { acceptDialogs = true; await close(); acceptDialogs = false; }
  }
  // Verify the distinct-document warning in the actual confirmation UI.
  await click(button('新建退货单')); await fill('dialog [aria-label="退货原销售订单"]', order.id); await fill('dialog [aria-label="退货第1行商品"]', chair.id); await fill('dialog [aria-label="退货第1行数量"]', '2'); await fill('dialog [aria-label="退货第1行原因"]', '同日第二次实收两把'); await fill('dialog [aria-label="退货实收日期"]', today()); await save(); await click(button('确认退货入库', scope));
  assert.equal(await evaluate(`document.querySelector('dialog').textContent.includes('疑似重复退货')`), true);
  await click(`document.querySelector('[aria-label="确认退货已收妥并验收合格"]')`); assert.equal(await evaluate(`document.querySelector('dialog button[type="submit"]').disabled`), true);
  await click(`document.querySelector('[aria-label="已核对疑似重复退货"]')`); await click(button('确认验收并入库', scope)); await until(`document.querySelector('dialog')?.textContent.includes('已人工核对疑似重复')&&!document.querySelector('dialog button[type="submit"]')`, '重复核对'); await close();
  const beforeRace = (await readState()).products[0].stock;
  // Real serialized IndexedDB transactions: two duplicate confirmations and one competing return.
  const race = await evaluate(`(async()=>{const {transact}=await import(${JSON.stringify(storageUrl)});const initial=await transact();const make=note=>({type:'save-sales-return',orderId:${JSON.stringify(order.id)},receiptDate:${JSON.stringify(today())},note,lines:[{productId:${JSON.stringify(chair.id)},quantity:15,reason:'真实事务竞争'}]});const a=(await transact(make('竞争一'))).salesReturns.at(-1);const b=(await transact(make('竞争二'))).salesReturns.at(-1);const confirm=r=>({type:'confirm-sales-return',salesReturnId:r.id,revision:r.revision,accepted:true});const results=await Promise.allSettled([a,a,b].map(r=>transact(confirm(r))));const final=await transact();return {fulfilled:results.filter(r=>r.status==='fulfilled').length,rejected:results.filter(r=>r.status==='rejected').length,entries:final.ledger.filter(l=>l.salesReturnId===a.id).length,second:final.salesReturns.find(r=>r.id===b.id).status,stock:final.products.find(p=>p.id===${JSON.stringify(chair.id)}).stock}})()`);
  assert.deepEqual(race, { fulfilled: 2, rejected: 1, entries: 1, second: 'draft', stock: beforeRace + 15 });
  const rollback = await evaluate(`(async()=>{const {transact}=await import(${JSON.stringify(storageUrl)});const s=await transact();const r=(await transact({type:'save-sales-return',orderId:${JSON.stringify(order.id)},receiptDate:${JSON.stringify(today())},note:'存储失败验证',lines:[{productId:${JSON.stringify(desk.id)},quantity:1,reason:'完整回滚'}]})).salesReturns.at(-1);const before=await transact();const put=IDBObjectStore.prototype.put;let rejected=false;try{IDBObjectStore.prototype.put=function(){throw new DOMException('模拟存储失败','QuotaExceededError')};await transact({type:'confirm-sales-return',salesReturnId:r.id,revision:r.revision,accepted:true})}catch{rejected=true}finally{IDBObjectStore.prototype.put=put}const after=await transact();return {rejected,unchanged:JSON.stringify(before)===JSON.stringify(after)}})()`);
  assert.deepEqual(rollback, { rejected: true, unchanged: true });
  assert.equal(errors.length, 0, JSON.stringify(errors));
  console.log('PASS: 销售退货旧数据迁移、原单建单、空数量与日期、草稿、验收勾选、部分及分次入库、取消、筛选重置、流水和原单追溯、刷新、未保存保护、真实IndexedDB幂等及可退额度竞争、1440/1024/390布局与字号。');
} catch (error) { await writeFile(path.resolve('artifacts/erp/sales-return-failure.png'), Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64')); console.error(await evaluate('document.body.innerText')); throw error; }
finally { ws.close(); }
