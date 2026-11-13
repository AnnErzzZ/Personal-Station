import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCommand, createDemoState, createEmptyState, normalizeWorkspace } from './model.ts';
import { defaultFilters, selectRecords } from './filters.ts';

const at = '2026-10-17T02:00:00.000Z';
const run = (s, c) => applyCommand(s, c, at);
const baseline = (s, index = 0, actualQuantity = s.products[index].stock, reason = '') => {
  const p = s.products[index];
  return { productId: p.id, bookQuantity: p.stock, baselineLedgerId: s.ledger.findLast(e => e.productId === p.id)?.id ?? '', actualQuantity, reason };
};
const save = (s, lines = [baseline(s, 0, 98, '实物短少，已复核')], patch = {}) => run(s, { type: 'save-count', note: '', lines, ...patch });
const confirm = (s, count = s.counts.at(-1)) => run(s, { type: 'confirm-count', countId: count.id, revision: count.revision });

test('旧数据补齐盘点集合且保留原有业务；盘点草稿不改库存', () => {
  const old = createDemoState(at); delete old.counts;
  const upgraded = normalizeWorkspace(old);
  assert.deepEqual(upgraded.counts, []);
  assert.deepEqual(upgraded.products, old.products);
  const s = save(upgraded);
  assert.equal(s.counts.length, 1);
  assert.equal(s.counts[0].status, 'draft');
  assert.deepEqual(s.products, upgraded.products);
  assert.deepEqual(s.ledger, upgraded.ledger);
});

test('盘盈盘亏整单生效并保存快照，零差异仅保留盘点结果，重复确认幂等', () => {
  let s = createDemoState(at);
  s = save(s, [baseline(s, 0, 98, '少两件'), baseline(s, 1, 63, '多三件'), baseline(s, 2)]);
  const start = s.ledger.length;
  s = confirm(s);
  assert.equal(s.products[0].stock, 98);
  assert.equal(s.products[1].stock, 63);
  assert.equal(s.products[2].stock, 190);
  assert.deepEqual(s.ledger.slice(start).map(e => [e.kind, e.change, e.balance]), [['count-loss', -2, 98], ['count-gain', 3, 63]]);
  assert.ok(s.ledger.slice(start).every(e => e.countId === s.counts[0].id && e.reference === s.counts[0].number));
  assert.equal(s.counts[0].status, 'confirmed');
  assert.equal(s.counts[0].lines[0].bookQuantity, 100);
  assert.equal(s.counts[0].lines[0].productName, '人体工学办公椅');
  assert.deepEqual(confirm(s), s);
  assert.throws(() => save(s, [baseline(s)], { countId: s.counts[0].id, revision: s.counts[0].revision }), /草稿/);
  let zero = save(createDemoState(at), [baseline(createDemoState(at), 0)]);
  const length = zero.ledger.length; zero = confirm(zero);
  assert.equal(zero.ledger.length, length);
  assert.equal(zero.counts[0].status, 'confirmed');
});

test('盘点后发生出库时整单阻止；重新核对才能保存并确认', () => {
  let s = createDemoState(at);
  s = save(s, [baseline(s, 1, 61, '复核'), baseline(s, 0, 98, '复核')]);
  const count = s.counts[0];
  s = run(s, { type: 'ship', orderId: s.orders.find(o => o.status === 'pending' && o.lines[0].productId === s.products[0].id).id });
  const before = structuredClone(s);
  assert.throws(() => confirm(s), /库存.*变化|重新核对/);
  assert.deepEqual(s, before);
  assert.throws(() => save(s, count.lines, { countId: count.id, revision: count.revision }), /重新核对/);
  s = save(s, [baseline(s, 1, 61, '复核'), baseline(s, 0, 68, '重新实盘确认')], { countId: count.id, revision: count.revision });
  s = confirm(s); assert.equal(s.products[0].stock, 68); assert.equal(s.products[1].stock, 61);
});

test('入库后冲销即使净库存相同仍阻止旧盘点；其他商品业务不阻止确认', () => {
  let s = save(createDemoState(at));
  s = run(s, { type: 'add-supplier', name: '测试供货商' });
  s = run(s, { type: 'save-receipt', supplierId: s.suppliers[0].id, receiptDate: '2026-10-17', deliveryNumber: '', note: '', lines: [{ productId: s.products[0].id, quantity: 2, price: '1' }] });
  const receiptId = s.receipts[0].id;
  s = run(s, { type: 'confirm-receipt', receiptId });
  s = run(s, { type: 'reverse-receipt', receiptId, reason: '录入错误' });
  assert.equal(s.products[0].stock, 100);
  assert.throws(() => confirm(s), /重新核对/);
  let unrelated = save(createDemoState(at));
  unrelated = run(unrelated, { type: 'ship', orderId: unrelated.orders.find(o => o.status === 'pending' && o.lines[0].productId === unrelated.products[1].id).id });
  assert.equal(confirm(unrelated).products[0].stock, 98);
});

test('草稿并发编辑通过修订号阻止旧操作，取消需原因且禁止后续确认', () => {
  let s = save(createDemoState(at)); const old = structuredClone(s.counts[0]);
  s = save(s, [baseline(s, 0, 97, '再次复核')], { countId: old.id, revision: old.revision });
  assert.throws(() => run(s, { type: 'confirm-count', countId: old.id, revision: old.revision }), /已.*更新|重新打开/);
  assert.throws(() => save(s, old.lines, { countId: old.id, revision: old.revision }), /已.*更新|重新打开/);
  assert.throws(() => run(s, { type: 'cancel-count', countId: old.id, revision: old.revision, reason: '作废' }), /已.*更新|重新打开/);
  assert.throws(() => run(s, { type: 'cancel-count', countId: old.id, revision: s.counts[0].revision, reason: '' }), /原因/);
  s = run(s, { type: 'cancel-count', countId: old.id, revision: s.counts[0].revision, reason: '重复盘点' });
  assert.equal(s.counts[0].status, 'cancelled');
  assert.equal(s.products[0].stock, 100);
  assert.throws(() => confirm(s), /草稿/);
});

test('数量边界、差异原因、重复商品和未初始化校验；停用商品仍可盘点', () => {
  const s = createDemoState(at);
  for (const value of [-1, 1.5, NaN, 1000001]) assert.throws(() => save(s, [baseline(s, 0, value, '复核')]), /数量/);
  assert.throws(() => save(s, [baseline(s, 0, 98)]), /差异原因/);
  assert.throws(() => save(s, [baseline(s), baseline(s)]), /重复/);
  assert.throws(() => save(s, []), /1 至 100/);
  const legacy = structuredClone(s); legacy.products[0].initialized = false;
  assert.throws(() => save(legacy), /初始化|期初/);
  const disabled = run(s, { type: 'set-product-active', productId: s.products[0].id, active: false });
  assert.equal(confirm(save(disabled)).products[0].stock, 98);
  assert.equal(confirm(save(s, [baseline(s, 0, 0, '实盘为零')])).products[0].stock, 0);
  assert.equal(confirm(save(s, [baseline(s, 0, 1000000, '复核')])).products[0].stock, 1000000);
});

test('盘点引用锁定编码单位，历史快照不被商品改名覆盖，筛选支持交集及流水来源', () => {
  let unused = run(createEmptyState(), { type: 'add-product', name: '仅盘点引用商品', sku: 'COUNT-ONLY', unit: '个', price: '1' });
  unused = save(unused, [baseline(unused)]);
  assert.equal(unused.ledger.length, 0);
  assert.equal(unused.orders.length, 0);
  assert.equal(unused.receipts.length, 0);
  assert.throws(() => run(unused, { type: 'update-product', productId: unused.products[0].id, name: '仅盘点引用商品', sku: 'CHANGED', unit: '个', price: '1' }), /不能修改/);
  let s = save(createDemoState(at)); const p = s.products[0];
  assert.throws(() => run(s, { type: 'update-product', productId: p.id, name: p.name, sku: 'CHANGED', unit: p.unit, price: '680' }), /不能修改/);
  s = confirm(s);
  s = run(s, { type: 'update-product', productId: p.id, name: '新名字', sku: p.sku, unit: p.unit, price: '700' });
  assert.equal(s.counts[0].lines[0].productName, p.name);
  const f = { ...defaultFilters, status: 'confirmed', product: p.id, from: '2026-10-17', to: '2026-10-17', query: s.counts[0].number };
  assert.deepEqual(selectRecords(s, 'counts', f).counts.map(c => c.id), [s.counts[0].id]);
  assert.equal(selectRecords(s, 'counts', { ...f, status: 'draft' }).counts.length, 0);
  assert.equal(selectRecords(s, 'ledger', { ...defaultFilters, count: s.counts[0].id, kind: 'count-loss' }).ledger.length, 1);
  assert.equal(selectRecords(s, 'ledger', { ...defaultFilters, count: 'other' }).ledger.length, 0);
});
