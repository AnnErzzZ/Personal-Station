import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCommand, createDemoState, normalizeWorkspace, salesReturnQuantities, salesReturnSummary, duplicateSalesReturns, inventoryToken } from './model.ts';
import { defaultFilters, selectRecords } from './filters.ts';

const at = '2026-10-17T02:00:00.000Z';
const run = (s, c) => applyCommand(s, c, at);
function fixture() {
  let s = createDemoState(at);
  s = run(s, { type: 'save-order', customerId: s.customers[0].id, deliveryDate: '2026-10-17', note: '', lines: s.products.slice(0, 2).map(p => ({ productId: p.id, quantity: 30, price: '10' })) });
  const order = s.orders.at(-1);
  s = run(s, { type: 'submit', orderId: order.id });
  s = run(s, { type: 'ship', orderId: order.id });
  return { s, order: s.orders.at(-1), p: s.products[0] };
}
const save = (s, orderId, quantity = 5, patch = {}) => run(s, { type: 'save-sales-return', orderId, receiptDate: '', note: '', lines: [{ productId: s.products[0].id, quantity, reason: '客户多购，完好退回' }], ...patch });
const confirm = (s, doc = s.salesReturns.at(-1), patch = {}) => run(s, { type: 'confirm-sales-return', salesReturnId: doc.id, revision: doc.revision, accepted: true, ...patch });
const ready = (s, doc = s.salesReturns.at(-1), patch = {}) => save(s, doc.orderId, doc.lines[0].quantity, { salesReturnId: doc.id, revision: doc.revision, receiptDate: '2026-10-17', lines: doc.lines, ...patch });

test('旧工作区补齐退货集合，草稿不改变库存或预占可退量', () => {
  const { s, order, p } = fixture(); const old = structuredClone(s); delete old.salesReturns;
  assert.deepEqual(normalizeWorkspace(old).salesReturns, []);
  const next = save(old, order.id);
  assert.deepEqual(next.products, s.products); assert.deepEqual(next.ledger, s.ledger);
  assert.equal(next.salesReturns[0].receiptDate, '');
  assert.deepEqual(salesReturnQuantities(next, order.id, p.id), { shipped: 30, returned: 0, remaining: 30 });
});
test('部分及分次退货，原销售不改写，流水可追溯，同单重试幂等', () => {
  const { s, order, p } = fixture(); let next = confirm(ready(save(s, order.id)));
  assert.equal(next.products[0].stock, p.stock + 5);
  assert.equal(next.ledger.at(-1).kind, 'sale-return'); assert.equal(next.ledger.at(-1).orderId, order.id);
  assert.equal(next.ledger.at(-1).salesReturnId, next.salesReturns[0].id);
  assert.deepEqual(confirm(next, next.salesReturns[0], { revision: 1, accepted: false }), next);
  next = confirm(ready(save(next, order.id, 3)));
  assert.deepEqual(salesReturnQuantities(next, order.id, p.id), { shipped: 30, returned: 8, remaining: 22 });
  assert.equal(salesReturnSummary(next, order.id), '部分退货');
  assert.deepEqual(next.orders, s.orders);
  assert.throws(() => save(next, order.id, 23), /可退|超/);
});
test('多草稿不预占，确认按最新额度检查，失败整单不改库存', () => {
  const { s, order } = fixture(); let next = ready(save(s, order.id, 20)); const first = next.salesReturns[0];
  next = ready(save(next, order.id, 20)); const second = next.salesReturns[1]; next = confirm(next, first);
  const before = structuredClone(next); assert.throws(() => confirm(next, second), /可退|超/); assert.deepEqual(next, before);
  next = run(next, { type: 'cancel-sales-return', salesReturnId: second.id, revision: second.revision, reason: '额度已用，取消重复草稿' });
  assert.equal(next.salesReturns[1].status, 'cancelled'); assert.throws(() => confirm(next, next.salesReturns[1]), /草稿|取消/);
});
test('来源、正整数、原因、行数、日期、验收及库存上限校验', () => {
  const { s, order } = fixture();
  for (const q of [0, -1, 1.5, NaN, 1000001]) assert.throws(() => save(s, order.id, q), /数量/);
  for (const receiptDate of ['2026-02-30', '2026-10-18']) assert.throws(() => save(s, order.id, 1, { receiptDate }), /日期/);
  assert.throws(() => save(s, s.orders.find(o => o.status === 'pending').id), /出库/);
  assert.throws(() => save(s, order.id, 1, { lines: [{ productId: s.products[2].id, quantity: 1, reason: '退货' }] }), /原.*商品|原单/);
  assert.throws(() => save(s, order.id, 1, { lines: [{ productId: s.products[0].id, quantity: 1, reason: ' ' }] }), /原因/);
  assert.throws(() => save(s, order.id, 1, { lines: [] }), /1.*100/);
  const line = { productId: s.products[0].id, quantity: 1, reason: '退货' };
  assert.throws(() => save(s, order.id, 1, { lines: [line, line] }), /重复/);
  let next = save(s, order.id); assert.throws(() => confirm(next), /日期/); next = ready(next);
  assert.throws(() => confirm(next, undefined, { accepted: false }), /验收/);
  next.products[0].stock = 1000000; const before = structuredClone(next);
  assert.throws(() => confirm(next), /上限/); assert.deepEqual(next, before);
});
test('草稿修订、取消与确认互斥，原单保存后固定', () => {
  const { s, order } = fixture(); let next = save(s, order.id); const old = next.salesReturns[0]; next = ready(next);
  assert.throws(() => confirm(next, old), /更新|重新/);
  assert.throws(() => ready(next, old), /更新|重新/);
  assert.throws(() => run(next, { type: 'cancel-sales-return', salesReturnId: old.id, revision: old.revision, reason: '重复' }), /更新|重新/);
  assert.throws(() => ready(next, next.salesReturns[0], { orderId: s.orders.find(o => o.id !== order.id && o.status === 'shipped').id }), /原.*固定|更换原/);
  const doc = next.salesReturns[0];
  assert.throws(() => run(next, { type: 'cancel-sales-return', salesReturnId: doc.id, revision: doc.revision, reason: '' }), /原因/);
  next = confirm(next); assert.throws(() => run(next, { type: 'cancel-sales-return', salesReturnId: doc.id, revision: doc.revision, reason: '取消' }), /草稿/);
});
test('停用商品仍可退，快照保持，缺失来源及未初始化整单阻止', () => {
  const { s, order, p } = fixture(); let next = save(s, order.id);
  next = run(next, { type: 'set-product-active', productId: p.id, active: false });
  next.products[0].name = '新的商品名称'; next.customers[0].name = '新的客户名称';
  next = confirm(ready(next)); assert.equal(next.products[0].active, false);
  assert.equal(next.salesReturns[0].lines[0].productName, p.name);
  assert.equal(next.salesReturns[0].customerName, s.customers[0].name);
  for (const corrupt of [x => { x.products[0].initialized = false; }, x => { x.orders.at(-1).shipmentNumber = 'changed'; }, x => { x.products.shift(); }]) {
    const bad = ready(save(s, order.id)); corrupt(bad); assert.throws(() => confirm(bad), /初始化|来源|出库|商品/);
  }
});
test('不同单据疑似重复提醒需明确继续，仍禁止超退，明细顺序不影响查重', () => {
  const { s, order } = fixture(); let next = confirm(ready(save(s, order.id)));
  next = ready(save(next, order.id)); const doc = next.salesReturns.at(-1);
  assert.equal(duplicateSalesReturns(next, doc).length, 1);
  assert.throws(() => confirm(next), /相同|重复/); next = confirm(next, doc, { allowDuplicate: true });
  assert.ok(next.salesReturns.at(-1).history.some(e => e.action.includes('重复')));
  assert.equal(salesReturnQuantities(next, order.id, s.products[0].id).returned, 10);
  assert.throws(() => save(next, order.id, 21), /可退|超/);
  const fake = { ...doc, lines: [...doc.lines].reverse() }; assert.ok(duplicateSalesReturns(next, fake).length);
  let multi = save(s, order.id, 1, { receiptDate: '2026-10-17', lines: order.lines.map(l => ({ productId: l.productId, quantity: 1, reason: '多行查重' })) });
  multi = confirm(multi); const firstMulti = multi.salesReturns.at(-1);
  const reversed = { ...firstMulti, id: 'new-id', lines: [...firstMulti.lines].reverse() };
  assert.equal(duplicateSalesReturns(multi, reversed).length, 1);
  reversed.lines[0] = { ...reversed.lines[0], quantity: 2 };
  assert.equal(duplicateSalesReturns(multi, reversed).length, 0);
});
test('多商品原单全部退完才显示全部退货；多行有一行失败则全部回滚', () => {
  const { s, order } = fixture(); let next = ready(save(s, order.id, 30)); next = confirm(next);
  assert.equal(salesReturnSummary(next, order.id), '部分退货');
  next = save(next, order.id, 1, { receiptDate: '2026-10-16', lines: [{ productId: s.products[1].id, quantity: 30, reason: '全部退回' }] });
  next = confirm(next); assert.equal(salesReturnSummary(next, order.id), '全部退货');
  let multi = save(s, order.id, 1, { receiptDate: '2026-10-17', lines: order.lines.map(l => ({ productId: l.productId, quantity: 1, reason: '核对退回' })) });
  multi.products[1].stock = 1000000; const before = structuredClone(multi);
  assert.throws(() => confirm(multi), /上限/); assert.deepEqual(multi, before);
});
test('退货流水使旧盘点失效，净零变动也阻止；退货列表和流水来源组合筛选', () => {
  const { s, order, p } = fixture(); let next = run(s, { type: 'save-count', note: '', lines: [{ productId: p.id, bookQuantity: p.stock, baselineLedgerId: inventoryToken(s, p.id), actualQuantity: p.stock, reason: '' }] });
  next = confirm(ready(save(next, order.id)));
  assert.throws(() => run(next, { type: 'confirm-count', countId: next.counts[0].id, revision: next.counts[0].revision }), /重新核对/);
  next = run(next, { type: 'save-order', customerId: s.customers[0].id, deliveryDate: '2026-10-17', note: '', lines: [{ productId: p.id, quantity: 5, price: '10' }] });
  const newOrder = next.orders.at(-1); next = run(next, { type: 'submit', orderId: newOrder.id }); next = run(next, { type: 'ship', orderId: newOrder.id });
  assert.equal(next.products[0].stock, p.stock);
  assert.throws(() => run(next, { type: 'confirm-count', countId: next.counts[0].id, revision: next.counts[0].revision }), /重新核对/);
  const doc = next.salesReturns[0];
  assert.equal(selectRecords(next, 'salesReturns', { ...defaultFilters, customer: order.customerId, product: p.id, status: 'received', sourceOrder: order.id }).salesReturns.length, 1);
  assert.equal(selectRecords(next, 'salesReturns', { ...defaultFilters, query: doc.lines[0].sku, from: '2026-10-17', to: '2026-10-17' }).salesReturns.length, 1);
  assert.equal(selectRecords(next, 'ledger', { ...defaultFilters, salesReturn: doc.id, kind: 'sale-return' }).ledger.length, 1);
  assert.equal(selectRecords(next, 'salesReturns', { ...defaultFilters, from: '2026-10-18', to: '2026-10-17' }).salesReturns.length, 0);
});

