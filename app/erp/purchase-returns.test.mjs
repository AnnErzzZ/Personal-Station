import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCommand, createDemoState, normalizeWorkspace, purchaseReturnQuantities, purchaseReturnSummary, duplicatePurchaseReturns, inventoryToken } from './model.ts';
import { defaultFilters, selectRecords } from './filters.ts';

const at = '2026-10-18T02:00:00.000Z';
const run = (s, c) => applyCommand(s, c, at);
function receipt(s, q = 50, patch = {}) {
  s = run(s, { type: 'save-receipt', supplierId: s.suppliers[0].id, receiptDate: '2026-10-17', deliveryNumber: '', note: '', lines: [{ productId: s.products[0].id, quantity: q, price: '10' }], ...patch });
  return run(s, { type: 'confirm-receipt', receiptId: s.receipts.at(-1).id });
}
function fixture() {
  let s = createDemoState(at); s = run(s, { type: 'add-supplier', name: '原供货方' }); s = receipt(s);
  return { s, source: s.receipts.at(-1), p: s.products[0] };
}
const save = (s, receiptId, quantity = 10, patch = {}) => run(s, { type: 'save-purchase-return', receiptId, returnDate: '', note: '', lines: [{ productId: s.products[0].id, quantity, reason: '多购协商退回' }], ...patch });
const ready = (s, doc = s.purchaseReturns.at(-1), patch = {}) => save(s, doc.receiptId, doc.lines[0].quantity, { purchaseReturnId: doc.id, revision: doc.revision, returnDate: '2026-10-18', lines: doc.lines, ...patch });
const confirm = (s, doc = s.purchaseReturns.at(-1), patch = {}) => run(s, { type: 'confirm-purchase-return', purchaseReturnId: doc.id, revision: doc.revision, handedOver: true, ...patch });
const reverse = (s, source) => run(s, { type: 'reverse-receipt', receiptId: source.id, reason: '原录入错误' });

test('旧集合兼容；草稿不占额度或库存；部分及分次扣减一次且保留原采购', () => {
  const { s, source, p } = fixture(); const old = structuredClone(s); delete old.purchaseReturns;
  assert.deepEqual(normalizeWorkspace(old).purchaseReturns, []);
  let next = save(old, source.id); assert.deepEqual(next.products, s.products); assert.deepEqual(next.ledger, s.ledger);
  assert.deepEqual(purchaseReturnQuantities(next, source.id, p.id), { received: 50, returned: 0, remaining: 50 });
  next = confirm(ready(next)); assert.equal(next.products[0].stock, p.stock - 10);
  const entry = next.ledger.at(-1); assert.equal(entry.kind, 'purchase-return'); assert.equal(entry.receiptId, source.id); assert.equal(entry.purchaseReturnId, next.purchaseReturns[0].id);
  assert.deepEqual(confirm(next, next.purchaseReturns[0], { revision: 1, handedOver: false }), next);
  next = confirm(ready(save(next, source.id, 5))); assert.equal(next.products[0].stock, p.stock - 15);
  assert.deepEqual(purchaseReturnQuantities(next, source.id, p.id), { received: 50, returned: 15, remaining: 35 }); assert.equal(purchaseReturnSummary(next, source.id), '部分退货');
  next = confirm(ready(save(next, source.id, 35))); assert.equal(purchaseReturnSummary(next, source.id), '全部退货'); assert.deepEqual(next.receipts, s.receipts);
  assert.throws(() => save(next, source.id, 1), /可退|额度/);
});
test('缺货可以保存草稿，确认必须够库存；多行任一失败整单保持原值', () => {
  const { s, source } = fixture(); s.products[0].stock = 8;
  let next = ready(save(s, source.id, 12)); const before = structuredClone(next);
  assert.throws(() => confirm(next), /库存|缺少/); assert.deepEqual(next, before);
  next = ready(next, next.purchaseReturns[0], { lines: [{ productId: s.products[0].id, quantity: 8, reason: '本次交接八把' }] });
  next = confirm(next); assert.equal(next.products[0].stock, 0);
  const base = fixture(); let multi = receipt(base.s, 1, { lines: base.s.products.slice(0, 2).map(p => ({ productId: p.id, quantity: 10, price: '1' })) });
  const src = multi.receipts.at(-1); multi = save(multi, src.id, 1, { returnDate: '2026-10-18', lines: src.lines.map(l => ({ productId: l.productId, quantity: 3, reason: '核对交接' })) });
  multi.products[1].stock = 2; const snapshot = structuredClone(multi); assert.throws(() => confirm(multi), /缺少|库存/); assert.deepEqual(multi, snapshot);
});
test('同源多草稿按最新额度、不同来源按最新共用库存校验', () => {
  const { s, source } = fixture(); let next = ready(save(s, source.id, 30)); const first = next.purchaseReturns[0];
  next = ready(save(next, source.id, 30)); const second = next.purchaseReturns[1]; next = confirm(next, first);
  assert.throws(() => confirm(next, second), /可退|额度/);
  let shared = receipt(s); const source2 = shared.receipts.at(-1); shared.products[0].stock = 10;
  shared = ready(save(shared, source.id, 8)); const a = shared.purchaseReturns[0]; shared = ready(save(shared, source2.id, 8)); const b = shared.purchaseReturns[1];
  shared = confirm(shared, a); assert.throws(() => confirm(shared, b), /库存|缺少/); assert.equal(purchaseReturnQuantities(shared, source2.id, s.products[0].id).remaining, 50);
});
test('实际退货后即使补足库存仍禁止原单冲销；冲销先成功则旧草稿可取消但不可确认', () => {
  const { s, source } = fixture(); let next = confirm(ready(save(s, source.id)));
  next.products[0].stock += 100; assert.throws(() => reverse(next, source), /退货|冲销/);
  let reversed = ready(save(s, source.id)); const draft = reversed.purchaseReturns[0]; reversed = reverse(reversed, source);
  assert.throws(() => confirm(reversed, draft), /来源|冲销|已入库/); assert.throws(() => save(reversed, source.id), /来源|冲销|已入库/);
  reversed = run(reversed, { type: 'cancel-purchase-return', purchaseReturnId: draft.id, revision: draft.revision, reason: '原单已冲销' }); assert.equal(reversed.purchaseReturns[0].status, 'cancelled');
  const corrected = receipt(reversed, 20, { correctsId: source.id }); const correctedId = corrected.receipts.at(-1).id;
  const done = confirm(ready(save(corrected, correctedId))); assert.equal(done.purchaseReturns.at(-1).receiptId, correctedId); assert.throws(() => reverse(done, done.receipts.at(-1)), /退货/);
});
test('保存后来源固定、修订防旧页面覆盖，取消原因及状态互斥', () => {
  const { s, source } = fixture(); let next = save(s, source.id); const old = next.purchaseReturns[0]; next = ready(next);
  assert.throws(() => ready(next, old), /更新|重新/); assert.throws(() => confirm(next, old), /更新|重新/);
  assert.throws(() => run(next, { type: 'cancel-purchase-return', purchaseReturnId: old.id, revision: old.revision, reason: '旧页' }), /更新|重新/);
  next = receipt(next); assert.throws(() => ready(next, next.purchaseReturns[0], { receiptId: next.receipts.at(-1).id }), /固定|更换原/);
  const doc = next.purchaseReturns[0]; assert.throws(() => run(next, { type: 'cancel-purchase-return', purchaseReturnId: doc.id, revision: doc.revision, reason: '' }), /原因/);
  next = run(next, { type: 'cancel-purchase-return', purchaseReturnId: doc.id, revision: doc.revision, reason: '协商取消' }); assert.throws(() => confirm(next, next.purchaseReturns[0]), /草稿|取消/);
});
test('日期、数量、行数、原因、来源及交接校验', () => {
  const { s, source } = fixture();
  for (const q of [0, -1, 1.5, NaN, 1000001]) assert.throws(() => save(s, source.id, q), /数量/);
  for (const returnDate of ['2026-02-30', '2026-10-19', '2026-10-16']) assert.throws(() => save(s, source.id, 1, { returnDate }), /日期/);
  const line = { productId: s.products[0].id, quantity: 1, reason: '多购' };
  for (const lines of [[], Array(101).fill(line)]) assert.throws(() => save(s, source.id, 1, { lines }), /1.*100/);
  assert.throws(() => save(s, source.id, 1, { lines: [line, line] }), /重复/);
  assert.throws(() => save(s, source.id, 1, { lines: [{ ...line, reason: ' ' }] }), /原因/);
  assert.throws(() => save(s, source.id, 1, { lines: [{ ...line, productId: s.products[1].id }] }), /原.*商品|来源/);
  let next = save(s, source.id); assert.throws(() => confirm(next), /日期/); next = ready(next);
  assert.throws(() => confirm(next, undefined, { handedOver: false }), /交接/);
});
test('停用历史供应商商品可退，供货关系与来源及快照稳定', () => {
  const { s, source, p } = fixture(); let next = save(s, source.id);
  next = run(next, { type: 'set-supplier-active', supplierId: source.supplierId, active: false }); next = run(next, { type: 'set-product-active', productId: p.id, active: false });
  next.products[0].name = '新名字'; next.suppliers[0].name = '改名供货方'; next.products[0].supplierIds = [];
  next = confirm(ready(next)); assert.equal(next.purchaseReturns[0].supplierName, source.supplierName); assert.equal(next.purchaseReturns[0].lines[0].productName, p.name); assert.equal(next.products[0].active, false); assert.equal(next.suppliers[0].active, false);
  for (const corrupt of [x => { x.products[0].initialized = false; }, x => { x.suppliers = []; }, x => { x.receipts[0].supplierId = 'other'; }]) { const bad = ready(save(s, source.id)); corrupt(bad); assert.throws(() => confirm(bad), /初始化|供应商|来源/); }
});
test('不同单据查重忽略多行顺序，人工继续不能越过库存或额度校验', () => {
  const { s } = fixture(); let next = receipt(s, 1, { lines: s.products.slice(0, 2).map(p => ({ productId: p.id, quantity: 10, price: '1' })) }); const source = next.receipts.at(-1);
  const lines = source.lines.map(l => ({ productId: l.productId, quantity: 2, reason: '协商退回' }));
  next = confirm(save(next, source.id, 1, { lines, returnDate: '2026-10-18' }));
  next = save(next, source.id, 1, { lines: [...lines].reverse(), returnDate: '2026-10-18' });
  assert.equal(duplicatePurchaseReturns(next, next.purchaseReturns.at(-1)).length, 1); assert.throws(() => confirm(next), /重复|相同/);
  const low = structuredClone(next); low.products[1].stock = 0; assert.throws(() => confirm(low, low.purchaseReturns.at(-1), { allowDuplicate: true }), /库存|缺少/);
  next = confirm(next, next.purchaseReturns.at(-1), { allowDuplicate: true }); assert.ok(next.purchaseReturns.at(-1).history.some(e => e.action.includes('重复')));
});
test('采购退货使旧盘点失效，净零也需复核，其他商品盘点独立；来源筛选正确', () => {
  const { s, source, p } = fixture(); let next = run(s, { type: 'save-count', note: '', lines: [{ productId: p.id, bookQuantity: p.stock, baselineLedgerId: inventoryToken(s, p.id), actualQuantity: p.stock, reason: '' }] });
  next = confirm(ready(save(next, source.id))); next = receipt(next, 10); assert.equal(next.products[0].stock, p.stock);
  assert.throws(() => run(next, { type: 'confirm-count', countId: next.counts[0].id, revision: next.counts[0].revision }), /重新核对/);
  const doc = next.purchaseReturns[0];
  assert.equal(selectRecords(next, 'purchaseReturns', { ...defaultFilters, supplier: source.supplierId, sourceReceipt: source.id, status: 'returned', product: p.id }).purchaseReturns.length, 1);
  assert.equal(selectRecords(next, 'purchaseReturns', { ...defaultFilters, query: source.number, from: '2026-10-18', to: '2026-10-18' }).purchaseReturns.length, 1);
  assert.equal(selectRecords(next, 'ledger', { ...defaultFilters, purchaseReturn: doc.id, kind: 'purchase-return' }).ledger.length, 1);
  assert.equal(selectRecords(next, 'purchaseReturns', { ...defaultFilters, from: '2026-10-19', to: '2026-10-18' }).purchaseReturns.length, 0);
});
