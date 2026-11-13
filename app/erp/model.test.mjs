import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyState, applyCommand, orderTotal } from './model.ts';

const clock = '2026-10-17T02:00:00.000Z';
function command(state, action) { return applyCommand(state, action, clock); }
function setup(stock = 100) {
  let state = createEmptyState();
  state = command(state, { type: 'add-product', name: '办公椅', sku: 'CH-001', unit: '把', price: '680.00' });
  state = command(state, { type: 'add-customer', name: '青禾科技' });
  // Simulate a legacy product awaiting its opening balance.
  state.products[0].initialized = false;
  state = command(state, { type: 'initialize', productId: state.products[0].id, quantity: stock });
  return state;
}
function draft(state, quantity = 30, productId = state.products[0].id) {
  return command(state, { type: 'save-order', customerId: state.customers[0].id, deliveryDate: '2026-10-20', note: '', lines: [{ productId, quantity, price: '680.00' }] });
}
test('草稿和提交均不扣库存，出库后数量、状态、流水一起更新', () => {
  let state = draft(setup());
  const id = state.orders[0].id;
  assert.equal(state.products[0].stock, 100);
  state = command(state, { type: 'submit', orderId: id });
  assert.equal(state.products[0].stock, 100);
  state = command(state, { type: 'ship', orderId: id });
  assert.equal(state.products[0].stock, 70);
  assert.equal(state.orders[0].status, 'shipped');
  assert.equal(state.ledger.filter(x => x.orderId === id).length, 1);
  assert.equal(state.ledger.at(-1).balance, 70);
  assert.equal(state.ledger.at(-1).change, -30);
});
test('重复出库不重复扣库存或生成流水', () => {
  let state = draft(setup()); const id = state.orders[0].id;
  state = command(state, { type: 'submit', orderId: id });
  state = command(state, { type: 'ship', orderId: id });
  assert.deepEqual(command(state, { type: 'ship', orderId: id }), state);
});
test('多商品中任一缺货，整单不扣减且输入状态不被修改', () => {
  let state = setup(100);
  state = command(state, { type: 'add-product', name: '办公桌', sku: 'TB-001', unit: '张', price: '1000' });
  state.products[1].initialized = false;
  state = command(state, { type: 'initialize', productId: state.products[1].id, quantity: 2 });
  state = command(state, { type: 'save-order', customerId: state.customers[0].id, deliveryDate: '2026-10-20', note: '', lines: [
    { productId: state.products[0].id, quantity: 30, price: '680' },
    { productId: state.products[1].id, quantity: 3, price: '1000' },
  ] });
  state = command(state, { type: 'submit', orderId: state.orders[0].id });
  const before = structuredClone(state);
  assert.throws(() => command(state, { type: 'ship', orderId: state.orders[0].id }), /办公桌.*缺少 1/);
  assert.deepEqual(state, before);
});
test('取消订单必须填原因，取消后不能出库', () => {
  let state = draft(setup()); const id = state.orders[0].id;
  assert.throws(() => command(state, { type: 'cancel', orderId: id, reason: ' ' }), /取消原因/);
  state = command(state, { type: 'cancel', orderId: id, reason: '客户调整计划' });
  assert.equal(state.products[0].stock, 100);
  assert.throws(() => command(state, { type: 'ship', orderId: id }), /待出库/);
});
test('已提交订单不可编辑，已出库订单不可取消', () => {
  let state = draft(setup()); const order = state.orders[0];
  state = command(state, { type: 'submit', orderId: order.id });
  assert.throws(() => command(state, { type: 'save-order', orderId: order.id, customerId: order.customerId, deliveryDate: order.deliveryDate, note: '', lines: [{ productId: state.products[0].id, quantity: 2, price: '1' }] }), /草稿/);
  state = command(state, { type: 'ship', orderId: order.id });
  assert.throws(() => command(state, { type: 'cancel', orderId: order.id, reason: '错误' }), /不能取消/);
});
test('期初库存不能重复初始化，商品编码不可重复', () => {
  const state = setup();
  assert.throws(() => command(state, { type: 'initialize', productId: state.products[0].id, quantity: 100 }), /已初始化/);
  assert.throws(() => command(state, { type: 'add-product', name: '另一商品', sku: 'ch-001', unit: '把', price: '1' }), /编码已存在/);
});
test('拒绝无效数量、重复商品、错误金额和无效日期', () => {
  const state = setup();
  for (const quantity of [0, -1, 0.5, NaN, Infinity]) assert.throws(() => draft(state, quantity));
  const base = { type: 'save-order', customerId: state.customers[0].id, deliveryDate: '2026-10-20', note: '', lines: [{ productId: state.products[0].id, quantity: 1, price: '0.10' }] };
  assert.throws(() => command(state, { ...base, lines: [...base.lines, ...base.lines] }), /重复/);
  assert.throws(() => command(state, { ...base, lines: [{ ...base.lines[0], price: '1.001' }] }), /金额/);
  assert.throws(() => command(state, { ...base, deliveryDate: '2026-02-31' }), /日期/);
  assert.equal(orderTotal(command(state, base).orders[0]), 10);
});
test('竞争同一库存的第二笔订单重新校验并被阻止', () => {
  let state = draft(setup(70), 50); const first = state.orders[0].id;
  state = draft(state, 40); const second = state.orders[1].id;
  state = command(state, { type: 'submit', orderId: first });
  state = command(state, { type: 'submit', orderId: second });
  state = command(state, { type: 'ship', orderId: first });
  assert.throws(() => command(state, { type: 'ship', orderId: second }), /缺少 20/);
  assert.equal(state.products[0].stock, 20);
});

test('编辑客户保留客户编号和订单关联，同时更新联系方式', () => {
  const state = draft(setup());
  const customerId = state.customers[0].id;
  const next = command(state, { type: 'update-customer', customerId, name: ' 青禾科技更新 ', contact: ' 张经理 ', phone: ' 13800138000 ' });
  assert.deepEqual(next.customers[0], { id: customerId, name: '青禾科技更新', contact: '张经理', phone: '13800138000' });
  assert.deepEqual(next.orders, state.orders);
  assert.deepEqual(next.products, state.products);
  assert.equal(state.customers[0].name, '青禾科技');
});
test('客户名称不能重复或为空，编辑失败不改变资料', () => {
  let state = setup();
  state = command(state, { type: 'add-customer', name: '远山设计' });
  const customerId = state.customers[0].id;
  const before = structuredClone(state);
  assert.throws(() => command(state, { type: 'update-customer', customerId, name: '远山设计' }), /客户名称已存在/);
  assert.throws(() => command(state, { type: 'update-customer', customerId, name: ' ' }), /客户名称/);
  assert.throws(() => command(state, { type: 'update-customer', customerId: 'missing', name: '不存在' }), /客户不存在/);
  assert.deepEqual(state, before);
});
test('兼容已有仅含名称的客户，联系方式可留空且有长度限制', () => {
  const state = setup();
  const customerId = state.customers[0].id;
  const next = command(state, { type: 'update-customer', customerId, name: '青禾科技', contact: '', phone: '' });
  assert.equal(next.customers[0].id, customerId);
  assert.equal(next.customers[0].name, '青禾科技');
  assert.throws(() => command(state, { type: 'update-customer', customerId, name: '青禾科技', phone: '1'.repeat(41) }), /电话/);
  const added = command(state, { type: 'add-customer', name: '新客户', contact: '李女士', phone: '+86 010-12345678' });
  assert.equal(added.customers.at(-1).phone, '+86 010-12345678');
});

test('商品改价和改名保留库存及历史订单资料，历史旧数据也保留修改前名称', () => {
  let state = draft(setup());
  // Simulate a record saved before product snapshots existed.
  delete state.orders[0].lines[0].productName;
  const id = state.products[0].id;
  const next = command(state, { type: 'update-product', productId: id, name: '新办公椅', sku: 'CH-001', unit: '把', price: '799' });
  assert.equal(next.products[0].priceCents, 79900);
  assert.equal(next.products[0].stock, 100);
  assert.equal(next.orders[0].lines[0].productName, '办公椅');
  assert.equal(next.orders[0].lines[0].unitPriceCents, 68000);
  assert.deepEqual(next.ledger, state.ledger);
  assert.equal(state.products[0].name, '办公椅');
});
test('已有业务后锁定编码单位；未使用商品可修改且编码去重', () => {
  let state = setup(); const id = state.products[0].id;
  for (const patch of [{ sku: 'CH-002' }, { unit: '箱' }]) assert.throws(() => command(state, { type: 'update-product', productId: id, name: '办公椅', sku: 'CH-001', unit: '把', price: '1', ...patch }), /编码和单位/);
  state = command(state, { type: 'add-product', name: '未使用商品', sku: 'NEW', unit: '个', price: '1' });
  const productId = state.products.at(-1).id;
  assert.throws(() => command(state, { type: 'update-product', productId, name: '修改', sku: 'ch-001', unit: '套', price: '2' }), /编码已存在/);
  const next = command(state, { type: 'update-product', productId, name: '修改', sku: 'new-2', unit: '套', price: '2' });
  assert.equal(next.products.at(-1).sku, 'NEW-2');
  assert.equal(next.products.at(-1).unit, '套');
});
test('停用阻止新开单和草稿提交，已有待出库可履行，启用恢复', () => {
  let state = draft(setup()); const orderId = state.orders[0].id; const productId = state.products[0].id;
  state = command(state, { type: 'set-product-active', productId, active: false });
  assert.equal(state.products[0].active, false);
  assert.throws(() => draft(state), /停用/);
  assert.throws(() => command(state, { type: 'submit', orderId }), /停用/);
  state = command(state, { type: 'set-product-active', productId, active: true });
  state = command(state, { type: 'submit', orderId });
  state = command(state, { type: 'set-product-active', productId, active: false });
  state = command(state, { type: 'ship', orderId });
  assert.equal(state.products[0].stock, 70);
  assert.equal(state.orders[0].status, 'shipped');
});
