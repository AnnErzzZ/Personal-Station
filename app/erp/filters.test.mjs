import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoState, applyCommand } from './model.ts';
import { selectRecords, defaultFilters } from './filters.ts';
const data = createDemoState('2026-10-17T02:00:00Z');
const filter = (view, patch) => selectRecords(data, view, { ...defaultFilters, ...patch });
test('订单组合筛选按客户、商品和发货日期取交集，待出库只含待处理', () => {
  const order = data.orders.find(o => o.status === 'pending');
  const result = filter('orders', { customer: order.customerId, product: order.lines[0].productId, from: order.deliveryDate, to: order.deliveryDate });
  assert.ok(result.orders.length > 0);
  assert.ok(result.orders.every(o => o.customerId === order.customerId && o.lines.some(l => l.productId === order.lines[0].productId)));
  assert.equal(filter('orders', { from: '2027-01-01', to: '2026-01-01' }).orders.length, 0);
  assert.ok(filter('shipping', {}).orders.every(o => o.status === 'pending'));
  assert.equal(filter('orders', { query: '没有这个订单' }).orders.length, 0);
});
test('商品兼容旧记录默认启用，状态、单位及期初条件可组合', () => {
  const first = data.products[0];
  const changed = applyCommand(data, { type: 'set-product-active', productId: first.id, active: false });
  const result = selectRecords(changed, 'products', { ...defaultFilters, active: 'inactive', unit: first.unit, initialized: 'yes' });
  assert.deepEqual(result.products.map(p => p.id), [first.id]);
  assert.equal(filter('products', { active: 'active' }).products.length, data.products.length);
  assert.equal(filter('stock', { stock: 'uninitialized' }).products.every(p => !p.initialized), true);
  assert.equal(filter('stock', { stock: 'low' }).products.every(p => p.initialized && p.stock > 0 && p.stock <= 10), true);
});
test('客户按订单关联及联系方式筛选，流水日期包含结束日全天', () => {
  assert.ok(filter('customers', { relationship: 'pending' }).customers.every(c => data.orders.some(o => o.customerId === c.id && o.status === 'pending')));
  assert.equal(filter('customers', { contact: 'complete' }).customers.length, 0);
  assert.equal(filter('ledger', { kind: 'opening', from: '2026-10-17', to: '2026-10-17' }).ledger.length, data.ledger.filter(e => e.kind === 'opening').length);
  assert.equal(filter('ledger', { kind: 'sale', product: data.products[0].id }).ledger.every(e => e.kind === 'sale' && e.productId === data.products[0].id), true);
});

test('采购列表和供应商支持状态、来源、日期、商品及关键词交集', () => {
  let state = applyCommand(data, { type: 'add-supplier', name: '测试供货方', contact: '陈女士', phone: '123' }, '2026-10-17T02:00:00Z');
  state = applyCommand(state, { type: 'save-receipt', supplierId: state.suppliers[0].id, receiptDate: '2026-10-17', deliveryNumber: 'DEL-FILTER', note: '', lines: [{ productId: state.products[0].id, quantity: 5, price: '100' }] }, '2026-10-17T02:00:00Z');
  const id = state.receipts[0].id;
  state = applyCommand(state, { type: 'confirm-receipt', receiptId: id }, '2026-10-17T02:00:00Z');
  const f = { ...defaultFilters, query: 'DEL-FILTER', supplier: state.suppliers[0].id, product: state.products[0].id, status: 'received', from: '2026-10-17', to: '2026-10-17' };
  assert.deepEqual(selectRecords(state, 'receipts', f).receipts.map(r => r.id), [id]);
  assert.equal(selectRecords(state, 'receipts', { ...f, status: 'draft' }).receipts.length, 0);
  assert.equal(selectRecords(state, 'suppliers', { ...defaultFilters, relationship: 'has', active: 'active' }).suppliers.length, 1);
  assert.equal(selectRecords(state, 'ledger', { ...defaultFilters, receipt: id, kind: 'purchase' }).ledger.length, 1);
  assert.equal(selectRecords(state, 'ledger', { ...defaultFilters, receipt: 'other' }).ledger.length, 0);
});
