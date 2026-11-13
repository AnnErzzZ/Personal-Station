import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';

const port = process.env.CDP_PORT;
const root = `http://127.0.0.1:${port}`;
const targets = await fetch(`${root}/json/list`).then(r => r.json());
const target = targets.find(t => t.type === 'page');
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });
let id = 0;
const pending = new Map();
const errors = [];
ws.addEventListener('message', ({ data }) => {
  const msg = JSON.parse(data);
  if (msg.id) { const job = pending.get(msg.id); if (job) { pending.delete(msg.id); if (msg.error) job.reject(new Error(JSON.stringify(msg.error))); else job.resolve(msg.result); } }
  else if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails);
});
const send = (method, params = {}) => new Promise((resolve, reject) => { const messageId = ++id; const timer = setTimeout(() => { pending.delete(messageId); reject(new Error(`CDP timeout: ${method}`)); }, 20000); pending.set(messageId, { resolve: result => { clearTimeout(timer); resolve(result); }, reject: error => { clearTimeout(timer); reject(error); } }); ws.send(JSON.stringify({ id: messageId, method, params })); });
const evaluate = async expression => { const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text); return result.result.value; };
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(expression, label) { for (let attempt = 0; attempt < 100; attempt++) { if (await evaluate(expression)) return; await wait(100); } throw new Error(`等待失败: ${label}`); }
const button = (text, scope = 'document') => `[...${scope}.querySelectorAll('button')].find(e=>e.textContent.trim()===${JSON.stringify(text)}&&!e.disabled)`;
async function click(expression) {
  const coordinates = await evaluate(`(()=>{const e=${expression};if(!e)throw Error('找不到按钮');e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...coordinates });
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', buttons: 1, clickCount: 1, ...coordinates });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', buttons: 0, clickCount: 1, ...coordinates });
  await wait(120);
}
async function fill(selector, value) { await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});const prototype=e.tagName==='SELECT'?HTMLSelectElement.prototype:e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));})()`); await wait(50); }
const close = () => click(`document.querySelector('dialog [aria-label="关闭对话框"]')`);
async function selectView(view) {
  const selector = `nav [data-view="${view}"]`;
  const isOpen = await evaluate(`document.querySelector(${JSON.stringify(selector)}).closest('details').open`);
  if (!isOpen) await click(`document.querySelector(${JSON.stringify(selector)}).closest('details').querySelector('summary')`);
  await click(`document.querySelector(${JSON.stringify(selector)})`);
}
async function keyboardActivate(expression) {
  await evaluate(`(${expression}).focus()`);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', text: '\r', unmodifiedText: '\r', windowsVirtualKeyCode: 13 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  await wait(120);
}
const readState = () => evaluate(`new Promise((resolve,reject)=>{const r=indexedDB.open('xu-cang-erp-v1',1);r.onsuccess=()=>{const db=r.result;const t=db.transaction('workspace','readonly');const q=t.objectStore('workspace').get('main');q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);t.oncomplete=()=>db.close();};r.onerror=()=>reject(r.error);})`);
await mkdir(path.resolve('artifacts/erp'), { recursive: true });
async function shot(name) {
  const smallText = await evaluate(`(()=>{const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);const failures=[];while(walker.nextNode()){const node=walker.currentNode;const parent=node.parentElement;if(!node.textContent.trim()||!parent||parent.closest('script,style,[class*="srOnly"]'))continue;const range=document.createRange();range.selectNodeContents(node);if(![...range.getClientRects()].some(r=>r.width>1&&r.height>1))continue;const css=getComputedStyle(parent);if(css.visibility==='hidden'||css.display==='none')continue;if(parseFloat(css.fontSize)<12)failures.push({text:node.textContent.trim().slice(0,40),size:css.fontSize});}return failures;})()`);
  assert.deepEqual(smallText, [], `${name}: 可见文字不得小于 12px`);
  const capture = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await writeFile(path.resolve('artifacts/erp', name), Buffer.from(capture.data, 'base64'));
}

let acceptDialogs = false;
let prompted = 0;
ws.addEventListener('message', ({ data }) => { const message = JSON.parse(data); if (message.method === 'Page.javascriptDialogOpening') { prompted++; void send('Page.handleJavaScriptDialog', { accept: acceptDialogs }); } });
function today() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
const scope = "document.querySelector('dialog')";
async function saveCount() {
  await click(button('保存盘点草稿', scope));
  await until(`document.querySelector('dialog')?.textContent.includes('操作记录')`, '保存盘点草稿');
  return (await readState()).counts.at(-1);
}
async function confirmCount() {
  await click(button('确认盘点', scope));
  assert.equal(await evaluate(`document.querySelector('dialog button[type="submit"]').disabled`), true);
  await click(`document.querySelector('dialog input[type="checkbox"]')`);
  await keyboardActivate(button('确认差异并更新库存', scope));
  await until(`document.querySelector('dialog')?.textContent.includes('确认库存盘点，差异已记入')&&!document.querySelector('dialog button[type="submit"]')`, '盘点确认');
}
const compile = source => ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const modelUrl = `data:text/javascript;base64,${Buffer.from(compile(await readFile('app/erp/model.ts', 'utf8'))).toString('base64')}`;
const storageUrl = `data:text/javascript;base64,${Buffer.from(compile(await readFile('app/erp/storage.ts', 'utf8')).replace(/from ['"]\.\/model['"]/, `from '${modelUrl}'`)).toString('base64')}`;
const command = c => evaluate(`(async()=>{const {transact}=await import(${JSON.stringify(storageUrl)});return await transact(${JSON.stringify(c)})})()`);
const sync = () => evaluate(`(()=>{const c=new BroadcastChannel('xu-cang-erp-updates');c.postMessage('updated');c.close();})()`);
try {
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://localhost:3000/erp' });
  await until(`document.querySelectorAll('tbody tr').length===4`, '工作区载入');
  const original = await readState();
  const legacy = structuredClone(original); delete legacy.counts;
  await evaluate(`new Promise((resolve,reject)=>{const r=indexedDB.open('xu-cang-erp-v1',1);r.onsuccess=()=>{const db=r.result;const t=db.transaction('workspace','readwrite');t.objectStore('workspace').put(${JSON.stringify(legacy)},'main');t.oncomplete=()=>{db.close();resolve(true)};t.onerror=()=>reject(t.error)}})`);
  await send('Page.reload'); await until(`document.querySelectorAll('tbody tr').length===4`, '旧工作区迁移');
  assert.deepEqual((await readState()).counts, []);
  assert.deepEqual((await readState()).products, original.products);
  const [chair, desk, keyboard] = original.products;
  await selectView('counts');
  assert.equal(await evaluate(`document.querySelector('h1').textContent`), '库存盘点');
  await shot('counts-empty-desktop.png');
  await click(button('新建盘点单'));
  await fill('dialog [aria-label="盘点第1行商品"]', chair.id);
  assert.equal(await evaluate(`document.querySelector('[aria-label="盘点第1行实盘数量"]').value`), '', '实盘数量不能默认等于账面数');
  await fill('dialog [aria-label="盘点第1行实盘数量"]', '98');
  await fill('dialog [aria-label="盘点第1行差异原因"]', '实物短少两把，已复核');
  await click(button('添加盘点商品', scope));
  await fill('dialog [aria-label="盘点第2行商品"]', desk.id);
  await fill('dialog [aria-label="盘点第2行实盘数量"]', '63');
  await fill('dialog [aria-label="盘点第2行差异原因"]', '多三张，已复核');
  await click(button('添加盘点商品', scope));
  await fill('dialog [aria-label="盘点第3行商品"]', keyboard.id);
  await fill('dialog [aria-label="盘点第3行实盘数量"]', '190');
  await fill('dialog [aria-label="盘点备注"]', '办公室实物盘点');
  await shot('counts-editor-desktop.png');
  const count = await saveCount();
  assert.deepEqual((await readState()).products, original.products);
  await click(button('确认盘点', scope));
  await shot('counts-confirm-desktop.png');
  await click(`document.querySelector('dialog input[type="checkbox"]')`);
  await keyboardActivate(button('确认差异并更新库存', scope));
  await until(`document.querySelector('dialog')?.textContent.includes('确认库存盘点，差异已记入')`, '确认差异');
  let state = await readState();
  assert.deepEqual(state.products.slice(0,3).map(p => p.stock), [98, 63, 190]);
  assert.deepEqual(state.ledger.filter(e => e.countId === count.id).map(e => e.change), [-2, 3]);
  await shot('counts-detail-desktop.png');
  await click(button('查看本单流水', scope));
  await until(`document.querySelector('h1').textContent==='库存流水'`, '盘点流水入口');
  assert.equal(await evaluate(`document.querySelectorAll('tbody tr').length`), 2);
  assert.ok(await evaluate(`document.body.textContent.includes('清除盘点单筛选')`));
  await fill('[aria-label="筛选流水类型"]', 'count-loss');
  assert.equal(await evaluate(`document.querySelectorAll('tbody tr').length`), 1);
  await click(button(count.number));
  await until(`document.querySelector('h1').textContent==='库存盘点'&&document.querySelector('dialog')?.textContent.includes(${JSON.stringify(count.number)})`, '流水追溯盘点单');
  await close();
  await fill('[aria-label="筛选盘点状态"]', 'confirmed');
  await fill('[aria-label="筛选商品"]', chair.id);
  await fill('[aria-label="创建日期从"]', today()); await fill('[aria-label="创建日期至"]', today());
  await fill('[aria-label="搜索"]', '办公室实物盘点');
  assert.equal(await evaluate(`document.querySelectorAll('tbody tr').length`), 1);
  await fill('[aria-label="筛选盘点状态"]', 'draft'); assert.equal(await evaluate(`document.querySelectorAll('tbody tr').length`), 0);
  await click(button('重置筛选'));
  await click(button('新建盘点单')); await fill('dialog [aria-label="盘点第1行商品"]', chair.id); await fill('dialog [aria-label="盘点第1行实盘数量"]', '97'); await fill('dialog [aria-label="盘点第1行差异原因"]', '复盘短少');
  const staleCount = await saveCount();
  const pendingOrder = state.orders.find(o => o.status === 'pending' && o.lines[0].productId === chair.id);
  // Keep the UI unaware of an external transaction: the final command must still reject a stale baseline.
  await click(button('确认盘点', scope)); await click(`document.querySelector('dialog input[type="checkbox"]')`);
  await command({ type: 'ship', orderId: pendingOrder.id });
  const beforeFailure = await readState();
  await click(button('确认差异并更新库存', scope));
  await until(`document.querySelector('dialog [role="alert"]')?.textContent.includes('重新核对')`, '事务拒绝旧盘点');
  assert.deepEqual(await readState(), beforeFailure);
  await sync(); await wait(250);
  await shot('counts-stale-desktop.png');
  await click(button('返回详情', scope)); await click(button('编辑草稿', scope));
  assert.equal(await evaluate(`document.querySelector('dialog [aria-label="盘点第1行实盘数量"]').disabled`), true);
  await click(`document.querySelector('dialog [aria-label="重新核对盘点第1行"]')`);
  assert.equal(await evaluate(`document.querySelector('dialog [aria-label="盘点第1行实盘数量"]').value`), '');
  await fill('dialog [aria-label="盘点第1行实盘数量"]', '67'); await fill('dialog [aria-label="盘点第1行差异原因"]', '出库后重新清点，短少一把');
  await saveCount(); await confirmCount(); await close();
  assert.equal((await readState()).products.find(p => p.id === chair.id).stock, 67);
  assert.equal((await readState()).counts.find(c => c.id === staleCount.id).lines[0].bookQuantity, 68);
  // Zero-difference counts remain auditable without creating a stock movement.
  await click(button('新建盘点单')); await fill('dialog [aria-label="盘点第1行商品"]', chair.id); await fill('dialog [aria-label="盘点第1行实盘数量"]', '67');
  const zero = await saveCount(); await confirmCount();
  assert.equal((await readState()).ledger.filter(e => e.countId === zero.id).length, 0);
  await click(button('查看本单流水', scope));
  assert.equal(await evaluate(`document.querySelectorAll('tbody tr').length`), 0);
  await selectView('counts'); await click(button('新建盘点单')); await fill('dialog [aria-label="盘点第1行商品"]', chair.id); await fill('dialog [aria-label="盘点第1行实盘数量"]', '67');
  const cancelled = await saveCount();
  await click(button('取消盘点单', scope)); await fill('dialog [aria-label="取消盘点原因"]', '重复盘点草稿'); await click(button('确认取消盘点单', scope));
  await until(`document.querySelector('dialog')?.textContent.includes('取消原因：重复盘点草稿')`, '取消草稿');
  assert.equal((await readState()).counts.find(c => c.id === cancelled.id).status, 'cancelled'); await close();
  // Unsaved changes can be retained or deliberately discarded, including keyboard/backdrop close paths.
  await click(button('新建盘点单')); await fill('dialog [aria-label="盘点备注"]', '未保存盘点范围');
  await close(); assert.ok(await evaluate(`Boolean(document.querySelector('dialog'))`)); assert.ok(prompted > 0);
  acceptDialogs = true; await close(); acceptDialogs = false;
  await send('Page.reload'); await until(`document.querySelector('h1')?.textContent==='销售订单'`, '刷新保留');
  assert.equal((await readState()).counts.length, 4);
  assert.equal((await readState()).products.find(p => p.id === chair.id).stock, 67);
  for (const width of [1440, 1024, 390]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 950, deviceScaleFactor: 1, mobile: false });
    await selectView('counts');
    assert.equal(await evaluate('document.documentElement.scrollWidth'), width);
    await evaluate(`document.querySelector('[aria-label="库存盘点筛选条件"]').scrollIntoView({block:'center'})`);
    await shot(`counts-list-${width}.png`);
    await click(button('新建盘点单')); await fill('dialog [aria-label="盘点第1行商品"]', chair.id); await fill('dialog [aria-label="盘点第1行实盘数量"]', '67');
    const bounds = await evaluate(`(()=>{const r=document.querySelector('dialog').getBoundingClientRect();return {left:r.left,right:r.right,width:innerWidth}})()`);
    assert.ok(bounds.left >= 0 && bounds.right <= width);
    if (width === 390) {
      assert.equal(await evaluate(`getComputedStyle(document.querySelector('dialog [aria-label="盘点第1行实盘数量"]')).fontSize`), '16px');
      const inputBounds = await evaluate(`(()=>{const r=document.querySelector('dialog [aria-label="盘点第1行实盘数量"]').getBoundingClientRect();return {left:r.left,right:r.right}})()`);
      assert.ok(inputBounds.left >= 0 && inputBounds.right <= width, '手机实盘数量应直接可见，无需左右拖动');
    }
    await shot(`counts-editor-${width}.png`);
    acceptDialogs = true; await close(); acceptDialogs = false;
  }
  // Run duplicate confirmations and two competing counts against the real IndexedDB transaction implementation.
  const result = await evaluate(`(async()=>{
    const {transact}=await import(${JSON.stringify(storageUrl)});
    const initial=await transact();const p=initial.products.find(p=>p.id===${JSON.stringify(chair.id)});
    const baselineLedgerId=initial.ledger.findLast(e=>e.productId===p.id)?.id??'';
    const line=q=>({productId:p.id,bookQuantity:p.stock,baselineLedgerId,actualQuantity:q,reason:'并发实盘验证'});
    const first=(await transact({type:'save-count',note:'并发第一单',lines:[line(66)]})).counts.at(-1);
    const second=(await transact({type:'save-count',note:'并发第二单',lines:[line(65)]})).counts.at(-1);
    const cmds=[first,first,second].map(c=>({type:'confirm-count',countId:c.id,revision:c.revision}));
    const results=await Promise.allSettled(cmds.map(c=>transact(c)));
    const final=await transact();
    return {fulfilled:results.filter(r=>r.status==='fulfilled').length,rejected:results.filter(r=>r.status==='rejected').length,stock:final.products.find(x=>x.id===p.id).stock,entries:final.ledger.filter(e=>e.countId===first.id).length,second:final.counts.find(c=>c.id===second.id).status};
  })()`);
  assert.deepEqual(result, { fulfilled: 2, rejected: 1, stock: 66, entries: 1, second: 'draft' });
  assert.equal(errors.length, 0, JSON.stringify(errors));
  console.log('PASS: 盘点迁移、草稿、盘盈盘亏及零差异、确认勾选及键盘操作、取消、组合筛选与重置、单据流水互相追溯、刷新保留、未保存保护、库存变动阻止及重新实盘、真实IndexedDB并发保护、1440/1024/390px布局和最小字号。');
} catch (error) { await shot('counts-failure.png'); console.error(await evaluate('document.body.innerText')); throw error; }
finally { ws.close(); }
