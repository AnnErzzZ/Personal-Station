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
async function saveReceipt() { await click(button('保存入库草稿', "document.querySelector('dialog')")); await until(`document.querySelector('dialog')?.textContent.includes('操作记录')`, '保存入库草稿'); return (await readState()).receipts.at(-1); }
async function confirmReceipt(duplicate = false) {
  await click(button('确认入库', "document.querySelector('dialog')"));
  if (duplicate) { assert.equal(await evaluate(`document.querySelector('dialog button[type="submit"]').disabled`), true); await click(`document.querySelector('dialog input[type="checkbox"]')`); }
  await click(button('确认收货并入库', "document.querySelector('dialog')"));
  await until(`document.querySelector('dialog')?.textContent.includes('确认采购入库，库存及流水已更新')&&!document.querySelector('dialog button[type="submit"]')`, '确认采购入库');
}
try {
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://localhost:3000/erp' });
  await until(`document.querySelectorAll('tbody tr').length===4`, '工作区载入');
  const original = await readState();
  const legacy = structuredClone(original); delete legacy.suppliers; delete legacy.receipts;
  for (const [id, sku] of [['P-LEGACY-ZERO', 'LEGACY-ZERO'], ['P-LEGACY-OPEN', 'LEGACY-OPEN']]) legacy.products.push({ id, sku, name: sku, unit: '个', priceCents: 100, stock: 0, initialized: false });
  await evaluate(`new Promise((resolve,reject)=>{const r=indexedDB.open('xu-cang-erp-v1',1);r.onsuccess=()=>{const db=r.result;const t=db.transaction('workspace','readwrite');t.objectStore('workspace').put(${JSON.stringify(legacy)},'main');t.oncomplete=()=>{db.close();resolve(true)};t.onerror=()=>reject(t.error)}})`);
  await send('Page.reload'); await until(`document.querySelectorAll('tbody tr').length===4`, '旧数据迁移');
  let state = await readState(); assert.deepEqual(state.orders, original.orders); assert.deepEqual(state.suppliers, []); assert.deepEqual(state.receipts, []);
  assert.equal(state.products.find(p => p.id === 'P-LEGACY-ZERO').initialized, false);
  await selectView('products'); await fill('input[aria-label="搜索"]', 'LEGACY-ZERO'); await click(button('期初设置'));
  assert.equal(await evaluate(`document.querySelector('h1').textContent`), '库存查询', '商品期初快捷入口应归到库存查询');
  await fill('dialog select[name="productId"]', 'P-LEGACY-ZERO'); await fill('dialog [aria-label="期初启用方式"]', 'zero');
  await click(button('确认零库存启用', "document.querySelector('dialog')")); await until(`!document.querySelector('dialog')`, '旧商品零库存启用');
  await click(button('期初设置')); await fill('dialog select[name="productId"]', 'P-LEGACY-OPEN'); await fill('dialog input[name="quantity"]', '7');
  await click(button('确认期初库存', "document.querySelector('dialog')")); await until(`!document.querySelector('dialog')`, '旧商品期初录入');
  state = await readState(); assert.equal(state.products.find(p => p.id === 'P-LEGACY-OPEN').stock, 7);
  await selectView('receipts'); await click(button('新建入库单'));
  await fill('dialog [aria-label="供应商送货单号"]', 'DEL-PURCHASE-001');
  await click(button('新增供应商', "document.querySelector('dialog')"));
  await fill('dialog [aria-label="快捷供应商名称"]', '验收供货方'); await fill('dialog [aria-label="快捷联系人（选填）"]', '陈女士'); await fill('dialog [aria-label="快捷电话（选填）"]', '13800138000');
  await click(button('保存资料并带入', "document.querySelector('dialog')"));
  await until(`document.querySelector('dialog [aria-label="入库供应商"]').value!==''`, '快捷供应商带入');
  assert.equal(await evaluate(`document.querySelector('dialog [aria-label="供应商送货单号"]').value`), 'DEL-PURCHASE-001', '新增资料保留入库已填内容');
  await click(button('新增商品资料', "document.querySelector('dialog')"));
  for (const [label, value] of [['商品名称', '验收补货商品'], ['商品编码', 'PUR-QA-001'], ['销售单位', '个'], ['参考售价（选填）', '200']]) await fill(`dialog [aria-label="快捷${label}"]`, value);
  await click(button('保存资料并带入', "document.querySelector('dialog')"));
  await until(`document.querySelector('dialog [aria-label="入库第1行商品"]').value!==''`, '快捷商品带入');
  await fill('dialog [aria-label="入库第1行数量"]', '50'); await fill('dialog [aria-label="入库第1行采购单价"]', '100');
  let receipt = await saveReceipt(); const productId = receipt.lines[0].productId; const supplierId = receipt.supplierId;
  state = await readState(); assert.equal(state.products.find(p => p.id === productId).stock, 0); assert.equal(state.ledger.filter(e => e.receiptId === receipt.id).length, 0);
  await click(button('编辑入库草稿', "document.querySelector('dialog')")); await fill('dialog [aria-label="入库第1行数量"]', '60'); await saveReceipt();
  await click(button('确认入库', "document.querySelector('dialog')")); await shot('purchase-confirm-desktop.png');
  await click(button('确认收货并入库', "document.querySelector('dialog')")); await until(`!document.querySelector('dialog button[type="submit"]')`, '首次确认入库');
  state = await readState(); assert.equal(state.products.find(p => p.id === productId).stock, 60); assert.equal(state.products.find(p => p.id === productId).priceCents, 20000);
  assert.equal(state.receipts[0].supplierName, '验收供货方'); await shot('purchase-detail-desktop.png');
  await click(button('查看入库流水', "document.querySelector('dialog')"));
  await until(`document.querySelector('h1').textContent==='库存流水'&&document.querySelectorAll('tbody tr').length===1`, '按入库单追溯');
  await click(button(receipt.number)); await until(`document.querySelector('dialog')?.textContent.includes(${JSON.stringify(receipt.number)})`, '流水反查入库单');
  await click(button('冲销入库', "document.querySelector('dialog')")); await fill('dialog textarea[name="reason"]', '实收数量应为50，原单录错');
  await click(button('确认整单冲销', "document.querySelector('dialog')")); await until(`document.querySelector('dialog')?.textContent.includes('已冲销')&&!document.querySelector('dialog textarea')`, '整单冲销');
  state = await readState(); assert.equal(state.products.find(p => p.id === productId).stock, 0); assert.deepEqual(state.ledger.filter(e => e.receiptId === receipt.id).map(e => e.change), [60, -60]);
  await click(button('建立更正入库单', "document.querySelector('dialog')")); await fill('dialog [aria-label="入库第1行数量"]', '50'); await fill('dialog [aria-label="入库第1行采购单价"]', '90');
  const corrected = await saveReceipt(); assert.equal(corrected.correctsId, receipt.id); await confirmReceipt();
  state = await readState(); assert.equal(state.products.find(p => p.id === productId).stock, 50); await close();
  await selectView('orders'); await click(button('新建订单')); await fill('dialog select', state.customers[0].id); await fill('dialog select[aria-label="第1行商品"]', productId); await fill('dialog input[aria-label="第1行数量"]', '40');
  await click(button('保存草稿', "document.querySelector('dialog')")); await until(`document.querySelector('dialog')?.textContent.includes('操作记录')`, '销售草稿');
  await click(button('提交订单', "document.querySelector('dialog')")); await until(`Boolean(${button('确认出库', "document.querySelector('dialog')")})`, '销售提交');
  await click(button('确认出库', "document.querySelector('dialog')")); await click(button('确认交接并出库', "document.querySelector('dialog')"));
  await until(`document.querySelector('dialog')?.textContent.includes('整单确认出库')`, '补货后销售出库'); await close();
  assert.equal((await readState()).products.find(p => p.id === productId).stock, 10);
  await selectView('receipts'); await click(button(corrected.number)); await click(button('冲销入库', "document.querySelector('dialog')")); await fill('dialog textarea[name="reason"]', '验证库存不足保护'); await click(button('确认整单冲销', "document.querySelector('dialog')"));
  await until(`document.querySelector('dialog [role="alert"]')?.textContent.includes('缺少 40')`, '库存不足阻止冲销');
  assert.equal((await readState()).receipts.find(r => r.id === corrected.id).status, 'received'); await shot('purchase-reverse-blocked.png'); await close();
  await selectView('suppliers'); await click(`document.querySelector('[aria-label="编辑供应商 验收供货方"]')`); await fill('dialog input[name="name"]', '验收供货方（更新）'); await click(button('保存供应商', "document.querySelector('dialog')")); await until(`!document.querySelector('dialog')`, '供应商编辑');
  assert.equal((await readState()).receipts.find(r => r.id === corrected.id).supplierName, '验收供货方');
  await click(`document.querySelector('[aria-label="查看供应商 验收供货方（更新） 的入库单"]')`);
  await until(`document.querySelector('h1').textContent==='采购入库'`, '供应商关联入库单'); assert.equal(await evaluate(`document.querySelector('[aria-label="筛选供应商"]').value`), supplierId);
  await fill('[aria-label="筛选入库状态"]', 'reversed'); assert.equal(await evaluate(`document.querySelectorAll('tbody tr').length`), 1); await click(button('重置筛选'));
  async function newReceipt(quantity, delivery = '') {
    await click(button('新建入库单')); await fill('dialog [aria-label="入库供应商"]', supplierId); await fill('dialog [aria-label="供应商送货单号"]', delivery); await fill('dialog [aria-label="入库第1行商品"]', productId); await fill('dialog [aria-label="入库第1行数量"]', String(quantity)); await fill('dialog [aria-label="入库第1行采购单价"]', '90'); return saveReceipt();
  }
  await newReceipt(2, 'DEL-PURCHASE-001'); await confirmReceipt(true); await close(); assert.equal((await readState()).products.find(p => p.id === productId).stock, 12);
  const cancelled = await newReceipt(1); await click(button('取消入库草稿', "document.querySelector('dialog')")); await fill('dialog textarea[name="reason"]', '测试取消'); await click(button('确认取消入库草稿', "document.querySelector('dialog')")); await until(`document.querySelector('dialog')?.textContent.includes('已取消')&&!document.querySelector('dialog textarea')`, '取消入库草稿'); await close();
  assert.equal((await readState()).receipts.find(r => r.id === cancelled.id).status, 'cancelled');
  await click(button('新建入库单')); await fill('dialog [aria-label="供应商送货单号"]', '未保存的内容');
  await selectView('stock'); assert.equal(await evaluate(`document.querySelector('h1').textContent`), '采购入库'); assert.equal(await evaluate(`document.querySelector('dialog [aria-label="供应商送货单号"]').value`), '未保存的内容'); assert.ok(prompted > 0);
  acceptDialogs = true; await close(); acceptDialogs = false;
  await selectView('suppliers'); await click(`document.querySelector('[aria-label="停用供应商 验收供货方（更新）"]')`); await click(button('确认停用供应商', "document.querySelector('dialog')")); await until(`!document.querySelector('dialog')`, '供应商停用');
  await fill('[aria-label="筛选启用状态"]', 'inactive'); assert.equal(await evaluate(`document.querySelectorAll('tbody tr').length`), 1);
  await shot('suppliers-desktop.png'); await selectView('receipts'); await click(button('新建入库单'));
  assert.equal(await evaluate(`[...document.querySelectorAll('dialog [aria-label="入库供应商"] option')].some(o=>o.value===${JSON.stringify(supplierId)})`), false); await close();
  await selectView('suppliers'); await click(`document.querySelector('[aria-label="启用供应商 验收供货方（更新）"]')`); await click(button('确认启用供应商', "document.querySelector('dialog')")); await until(`!document.querySelector('dialog')`, '供应商重新启用');
  await send('Page.reload'); await until(`document.querySelector('h1')?.textContent==='销售订单'&&Boolean(document.querySelector('tbody tr'))`, '刷新保留');
  assert.equal((await readState()).products.find(p => p.id === productId).stock, 12);
  await selectView('receipts'); await fill('[aria-label="筛选供应商"]', supplierId); await fill('[aria-label="筛选商品"]', productId); await fill('[aria-label="收货日期从"]', today()); await fill('[aria-label="收货日期至"]', today()); await fill('input[aria-label="搜索"]', 'DEL-PURCHASE-001');
  assert.equal(await evaluate(`document.querySelectorAll('tbody tr').length`), 3); await shot('purchase-list-desktop.png'); await click(button('重置筛选'));
  for (const width of [1024, 390]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
    for (const view of ['receipts', 'suppliers']) { await selectView(view); assert.equal(await evaluate('document.documentElement.scrollWidth'), width); await evaluate(`document.querySelector('[aria-label$="筛选条件"]').scrollIntoView({block:'center'})`); await shot(`purchase-${view}-${width}.png`); }
    await selectView('receipts'); await click(button('新建入库单')); await shot(`purchase-editor-${width}.png`); await close();
  }
  // Product-supplier master relations remain independent from actual purchase history.
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await selectView('suppliers'); await click(button('新增供应商')); await fill('dialog input[name="name"]', '备用供货方'); await click(button('保存供应商', "document.querySelector('dialog')")); await until(`!document.querySelector('dialog')`, '新增备用供应商');
  const supplierB = (await readState()).suppliers.find(s => s.name === '备用供货方').id;
  const beforeLinks = await readState();
  await selectView('products'); await fill('input[aria-label="搜索"]', 'PUR-QA-001'); await click(`document.querySelector('[aria-label="编辑商品 验收补货商品"]')`);
  await click(`document.querySelector('[aria-label="关联供应商 验收供货方（更新）"]')`); await click(`document.querySelector('[aria-label="关联供应商 备用供货方"]')`); await fill('dialog [aria-label="默认供应商"]', supplierId);
  await shot('supplier-links-desktop.png'); await keyboardActivate(button('保存修改', "document.querySelector('dialog')")); await until(`!document.querySelector('dialog')`, '保存商品供货关系');
  let linkedState = await readState(); assert.deepEqual(linkedState.products.find(p => p.id === productId).supplierIds, [supplierId, supplierB]); assert.deepEqual(linkedState.receipts, beforeLinks.receipts); assert.deepEqual(linkedState.ledger, beforeLinks.ledger);
  await selectView('suppliers'); await click(`document.querySelector('[aria-label="查看供应商 备用供货方 的供货商品"]')`); await until(`document.querySelector('h1').textContent==='商品管理'`, '供应商反查供货商品');
  assert.equal(await evaluate(`document.querySelector('[aria-label="筛选关联供应商"]').value`), supplierB); assert.equal(await evaluate(`document.querySelectorAll('tbody tr').length`), 1);
  await selectView('receipts'); await click(button('新建入库单')); await fill('dialog [aria-label="入库第1行商品"]', productId);
  assert.equal(await evaluate(`document.querySelector('dialog [aria-label="入库供应商"]').value`), supplierId, '先选商品时带入有效默认供货方');
  await fill('dialog [aria-label="入库供应商"]', supplierB); await fill('dialog [aria-label="入库第1行数量"]', '1'); await fill('dialog [aria-label="入库第1行采购单价"]', '95');
  const chairId = linkedState.products.find(p => p.sku === 'CH-001').id;
  await click(button('添加入库商品', "document.querySelector('dialog')")); await fill('dialog [aria-label="入库第2行商品"]', chairId); await fill('dialog [aria-label="入库第2行数量"]', '1'); await fill('dialog [aria-label="入库第2行采购单价"]', '80');
  assert.equal(await evaluate(`document.querySelector('dialog [aria-label="入库供应商"]').value`), supplierB, '添加其他商品不替换本单实际供货方');
  assert.deepEqual(await evaluate(`[...document.querySelector('dialog [aria-label="入库第1行商品"]').querySelectorAll('optgroup')].map(g=>g.label)`), ['该供应商关联商品', '其他商品（临时采购）']);
  assert.equal(await evaluate(`document.querySelector('dialog').textContent.includes('临时采购：人体工学办公椅')`), true);
  await shot('supplier-links-purchase-desktop.png'); const temporaryReceipt = await saveReceipt(); await confirmReceipt(); await close();
  linkedState = await readState(); assert.deepEqual(linkedState.receipts.find(r => r.id === temporaryReceipt.id).temporaryProductIds, [chairId]); assert.equal(linkedState.receipts.find(r => r.id === temporaryReceipt.id).supplierId, supplierB); assert.equal(linkedState.products.find(p => p.id === chairId).supplierIds.length, 0);
  await selectView('products'); await fill('input[aria-label="搜索"]', 'PUR-QA-001'); await click(`document.querySelector('[aria-label="编辑商品 验收补货商品"]')`); await fill('dialog [aria-label="默认供应商"]', supplierB); await click(`document.querySelector('[aria-label="关联供应商 验收供货方（更新）"]')`); await click(button('保存修改', "document.querySelector('dialog')")); await until(`!document.querySelector('dialog')`, '修改默认并取消原供货方关联');
  linkedState = await readState(); assert.deepEqual(linkedState.receipts.filter(r => beforeLinks.receipts.some(old => old.id === r.id)), beforeLinks.receipts); assert.equal(linkedState.receipts.find(r => r.id === corrected.id).supplierId, supplierId);
  await selectView('suppliers'); await click(`document.querySelector('[aria-label="停用供应商 备用供货方"]')`); await click(button('确认停用供应商', "document.querySelector('dialog')")); await until(`!document.querySelector('dialog')`, '停用默认供货方');
  await selectView('receipts'); await click(button('新建入库单')); await fill('dialog [aria-label="入库第1行商品"]', productId); assert.equal(await evaluate(`document.querySelector('dialog [aria-label="入库供应商"]').value`), '', '已停用默认供货方不得自动带入'); acceptDialogs = true; await close(); acceptDialogs = false;
  await send('Page.reload'); await until(`document.querySelector('h1')?.textContent==='销售订单'&&Boolean(document.querySelector('tbody tr'))`, '供货关系刷新保留');
  assert.deepEqual((await readState()).products.find(p => p.id === productId).supplierIds, [supplierB]);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 900, deviceScaleFactor: 1, mobile: false }); await selectView('products'); await fill('input[aria-label="搜索"]', 'PUR-QA-001'); await click(`document.querySelector('[aria-label="编辑商品 验收补货商品"]')`);
  await evaluate(`document.querySelector('[aria-label="关联供应商选择"]').scrollIntoView({block:'center'})`); await shot('supplier-links-mobile.png');
  assert.equal(await evaluate(`document.querySelector('dialog').textContent.includes('默认供应商已停用')`), true);
  await click(`document.querySelector('[aria-label="关联供应商 备用供货方"]')`); assert.equal(await evaluate(`document.querySelector('dialog [aria-label="默认供应商"]').value`), '', '移除默认供货方时同步清空默认设置'); await click(button('保存修改', "document.querySelector('dialog')")); await until(`!document.querySelector('dialog')`, '清除供货关系');
  await fill('[aria-label="筛选关联供应商"]', 'unlinked'); assert.ok(await evaluate(`document.querySelector('tbody').textContent.includes('验收补货商品')`));
  // The actual IndexedDB transaction implementation must serialize concurrent stock changes.
  const compile = source => ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
  const modelUrl = `data:text/javascript;base64,${Buffer.from(compile(await readFile('app/erp/model.ts', 'utf8'))).toString('base64')}`;
  const storageUrl = `data:text/javascript;base64,${Buffer.from(compile(await readFile('app/erp/storage.ts', 'utf8')).replace(/from ['"]\.\/model['"]/, `from '${modelUrl}'`)).toString('base64')}`;
  const transactionResult = await evaluate(`(async()=>{
    const {transact}=await import(${JSON.stringify(storageUrl)});const productId=${JSON.stringify(productId)},supplierId=${JSON.stringify(supplierId)};
    const before=await transact();
    async function add(q){const next=await transact({type:'save-receipt',supplierId,receiptDate:${JSON.stringify(today())},deliveryNumber:'',note:'事务测试',lines:[{productId,quantity:q,price:'90'}]});return next.receipts.at(-1).id;}
    const first=await add(30),second=await add(40);
    await Promise.all([transact({type:'confirm-receipt',receiptId:first}),transact({type:'confirm-receipt',receiptId:first}),transact({type:'confirm-receipt',receiptId:second})]);
    const received=await transact();
    await Promise.all([transact({type:'reverse-receipt',receiptId:first,reason:'并发冲销测试'}),transact({type:'reverse-receipt',receiptId:first,reason:'并发重试'})]);
    const reversed=await transact();
    const failed=await add(10);await transact({type:'set-product-active',productId,active:false});const snapshot=await transact();let rejected=false;try{await transact({type:'confirm-receipt',receiptId:failed})}catch{rejected=true}const afterFailure=await transact();
    return {initial:before.products.find(p=>p.id===productId).stock,received:received.products.find(p=>p.id===productId).stock,entries:received.ledger.filter(e=>e.receiptId===first).length,reversed:reversed.products.find(p=>p.id===productId).stock,reversalEntries:reversed.ledger.filter(e=>e.receiptId===first&&e.kind==='purchase-reversal').length,rejected,atomic:JSON.stringify(snapshot)===JSON.stringify(afterFailure)};
  })()`);
  assert.deepEqual(transactionResult, { initial: 13, received: 83, entries: 1, reversed: 53, reversalEntries: 1, rejected: true, atomic: true });
  assert.equal(errors.length, 0, JSON.stringify(errors));
  console.log('PASS: 商品多供应商关联、默认带入及停用保护、供货商品反查、临时采购及历史单据独立、移除默认同步清空、刷新与手机布局；旧数据及期初、入库编辑确认、冲销更正、销售衔接、真实并发和回滚。');
} catch (error) { await shot('purchase-failure.png'); console.error(await evaluate('document.body.innerText')); throw error; }
finally { ws.close(); }
