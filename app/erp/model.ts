export type OrderStatus = 'draft' | 'pending' | 'shipped' | 'cancelled';
export type Product = { id: string; sku: string; name: string; unit: string; priceCents: number; stock: number; initialized: boolean; active?: boolean; supplierIds?: string[]; defaultSupplierId?: string };
export type ProductInput = { name: string; sku: string; unit: string; price: string; supplierIds?: string[]; defaultSupplierId?: string };
export type Customer = { id: string; name: string; contact?: string; phone?: string };
export type OrderLine = { productId: string; quantity: number; unitPriceCents: number; productName?: string; sku?: string; unit?: string };
export type Order = { id: string; number: string; customerId: string; deliveryDate: string; note: string; lines: OrderLine[]; status: OrderStatus; createdAt: string; updatedAt: string; shipmentNumber?: string; cancelReason?: string; history: { at: string; action: string; actor: string }[] };
export type Supplier = Customer & { active?: boolean };
export type ReceiptStatus = 'draft' | 'received' | 'cancelled' | 'reversed';
export type Receipt = { id: string; number: string; supplierId: string; supplierName?: string; receiptDate: string; deliveryNumber: string; note: string; lines: OrderLine[]; status: ReceiptStatus; createdAt: string; updatedAt: string; confirmedAt?: string; reversedAt?: string; reason?: string; reversalNumber?: string; correctsId?: string; temporaryProductIds?: string[]; history: Order['history'] };
export type ReceiptInput = { receiptId?: string; supplierId: string; receiptDate: string; deliveryNumber: string; note: string; correctsId?: string; lines: { productId: string; quantity: number; price: string }[] };
export type CountLineInput = { productId: string; bookQuantity: number; baselineLedgerId: string; actualQuantity: number; reason: string };
export type StockCount = { id: string; number: string; status: 'draft' | 'confirmed' | 'cancelled'; revision: number; note: string; lines: (CountLineInput & { productName: string; sku: string; unit: string })[]; createdAt: string; updatedAt: string; confirmedAt?: string; cancelReason?: string; history: Order['history'] };
export type CountInput = { countId?: string; revision?: number; note: string; lines: CountLineInput[] };
export type SalesReturnLine = { productId: string; quantity: number; reason: string; productName: string; sku: string; unit: string };
export type SalesReturn = { id: string; number: string; orderId: string; shipmentNumber: string; customerId: string; customerName: string; receiptDate: string; note: string; status: 'draft' | 'received' | 'cancelled'; revision: number; lines: SalesReturnLine[]; createdAt: string; updatedAt: string; confirmedAt?: string; cancelReason?: string; history: Order['history'] };
export type SalesReturnInput = { salesReturnId?: string; revision?: number; orderId: string; receiptDate: string; note: string; lines: { productId: string; quantity: number; reason: string }[] };
export type PurchaseReturn = { id: string; number: string; receiptId: string; receiptNumber: string; supplierId: string; supplierName: string; deliveryNumber: string; returnDate: string; note: string; status: 'draft' | 'returned' | 'cancelled'; revision: number; lines: SalesReturnLine[]; createdAt: string; updatedAt: string; confirmedAt?: string; cancelReason?: string; history: Order['history'] };
export type PurchaseReturnInput = { purchaseReturnId?: string; revision?: number; receiptId: string; returnDate: string; note: string; lines: { productId: string; quantity: number; reason: string }[] };
export type LedgerEntry = { id: string; productId: string; at: string; kind: 'opening' | 'sale' | 'purchase' | 'purchase-reversal' | 'count-gain' | 'count-loss' | 'sale-return' | 'purchase-return'; change: number; balance: number; reference: string; orderId?: string; receiptId?: string; countId?: string; salesReturnId?: string; purchaseReturnId?: string; businessDate?: string; actor: string };
export type Workspace = { schemaVersion: 1; nextId: number; products: Product[]; customers: Customer[]; orders: Order[]; ledger: LedgerEntry[]; suppliers: Supplier[]; receipts: Receipt[]; counts: StockCount[]; salesReturns: SalesReturn[]; purchaseReturns: PurchaseReturn[] };
export type DraftInput = { orderId?: string; customerId: string; deliveryDate: string; note: string; lines: { productId: string; quantity: number; price: string }[] };
export type Command =
  | ({ type: 'save-purchase-return' } & PurchaseReturnInput)
  | { type: 'confirm-purchase-return'; purchaseReturnId: string; revision: number; handedOver: boolean; allowDuplicate?: boolean }
  | { type: 'cancel-purchase-return'; purchaseReturnId: string; revision: number; reason: string }
  | ({ type: 'save-sales-return' } & SalesReturnInput)
  | { type: 'confirm-sales-return'; salesReturnId: string; revision: number; accepted: boolean; allowDuplicate?: boolean }
  | { type: 'cancel-sales-return'; salesReturnId: string; revision: number; reason: string }
  | ({ type: 'save-count' } & CountInput)
  | { type: 'confirm-count'; countId: string; revision: number }
  | { type: 'cancel-count'; countId: string; revision: number; reason: string }
  | ({ type: 'save-receipt' } & ReceiptInput)
  | { type: 'confirm-receipt'; receiptId: string; allowDuplicate?: boolean }
  | { type: 'cancel-receipt'; receiptId: string; reason: string }
  | { type: 'reverse-receipt'; receiptId: string; reason: string }
  | { type: 'add-supplier'; name: string; contact?: string; phone?: string }
  | { type: 'update-supplier'; supplierId: string; name: string; contact?: string; phone?: string }
  | { type: 'set-supplier-active'; supplierId: string; active: boolean }
  | ({ type: 'save-order' } & DraftInput)
  | { type: 'submit' | 'ship'; orderId: string }
  | { type: 'cancel'; orderId: string; reason: string }
  | ({ type: 'add-product' } & ProductInput)
  | ({ type: 'update-product'; productId: string } & ProductInput)
  | { type: 'set-product-active'; productId: string; active: boolean }
  | { type: 'add-customer'; name: string; contact?: string; phone?: string }
  | { type: 'update-customer'; customerId: string; name: string; contact?: string; phone?: string }
  | { type: 'initialize'; productId: string; quantity: number };

export const statusLabels: Record<OrderStatus, string> = { draft: '草稿', pending: '待出库', shipped: '已出库', cancelled: '已取消' };
export const money = (cents: number) => new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(cents / 100);
export const orderTotal = (order: Pick<Order, 'lines'>) => order.lines.reduce((sum, line) => sum + line.quantity * line.unitPriceCents, 0);
export const day = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export const receiptLabels: Record<ReceiptStatus, string> = { draft: '草稿', received: '已入库', cancelled: '已取消', reversed: '已冲销' };
export const ledgerLabels: Record<LedgerEntry['kind'], string> = { opening: '期初库存', sale: '销售出库', purchase: '采购入库', 'purchase-reversal': '入库冲销', 'count-gain': '盘盈入库', 'count-loss': '盘亏出库', 'sale-return': '销售退货入库', 'purchase-return': '采购退货出库' };
export const purchaseReturnLabels: Record<PurchaseReturn['status'], string> = { draft: '草稿', returned: '已出库', cancelled: '已取消' };
export const salesReturnLabels: Record<SalesReturn['status'], string> = { draft: '草稿', received: '已入库', cancelled: '已取消' };
export const countLabels: Record<StockCount['status'], string> = { draft: '草稿', confirmed: '已确认', cancelled: '已取消' };
export function createEmptyState(): Workspace { return { schemaVersion: 1, nextId: 1, products: [], customers: [], orders: [], ledger: [], suppliers: [], receipts: [], counts: [], salesReturns: [], purchaseReturns: [] }; }
export function normalizeWorkspace(state: Workspace): Workspace { return { ...state, suppliers: state.suppliers ?? [], receipts: state.receipts ?? [], counts: state.counts ?? [], salesReturns: state.salesReturns ?? [], purchaseReturns: state.purchaseReturns ?? [] }; }
export const productIsUsed = (state: Workspace, id: string) => state.orders.some(o => o.lines.some(l => l.productId === id)) || (state.receipts ?? []).some(o => o.lines.some(l => l.productId === id)) || (state.counts ?? []).some(o => o.lines.some(l => l.productId === id)) || (state.salesReturns ?? []).some(o => o.lines.some(l => l.productId === id)) || (state.purchaseReturns ?? []).some(o => o.lines.some(l => l.productId === id)) || state.ledger.some(e => e.productId === id);
export function salesReturnQuantities(state: Workspace, orderId: string, productId: string) {
  const order = state.orders.find(o => o.id === orderId);
  const shipped = order?.status === 'shipped' ? order.lines.find(l => l.productId === productId)?.quantity ?? 0 : 0;
  const returned = (state.salesReturns ?? []).filter(r => r.orderId === orderId && r.status === 'received').reduce((n, r) => n + (r.lines.find(l => l.productId === productId)?.quantity ?? 0), 0);
  return { shipped, returned, remaining: shipped - returned };
}
export function salesReturnSummary(state: Workspace, orderId: string) {
  const lines = state.orders.find(o => o.id === orderId)?.lines ?? [];
  const quantities = lines.map(l => salesReturnQuantities(state, orderId, l.productId));
  return quantities.every(q => q.returned === 0) ? '未退货' : quantities.every(q => q.remaining === 0) ? '全部退货' : '部分退货';
}
export function duplicateSalesReturns(state: Workspace, doc: Pick<SalesReturn, 'id' | 'orderId' | 'receiptDate' | 'lines'>) {
  const signature = (lines: SalesReturnLine[]) => JSON.stringify(lines.map(l => [l.productId, l.quantity]).sort((a, b) => String(a[0]).localeCompare(String(b[0]))));
  return (state.salesReturns ?? []).filter(r => r.id !== doc.id && r.status === 'received' && r.orderId === doc.orderId && r.receiptDate === doc.receiptDate && signature(r.lines) === signature(doc.lines));
}
export function purchaseReturnQuantities(state: Workspace, receiptId: string, productId: string) {
  const source = state.receipts.find(r => r.id === receiptId);
  const received = source?.status === 'received' ? source.lines.find(l => l.productId === productId)?.quantity ?? 0 : 0;
  const returned = (state.purchaseReturns ?? []).filter(r => r.receiptId === receiptId && r.status === 'returned').reduce((n, r) => n + (r.lines.find(l => l.productId === productId)?.quantity ?? 0), 0);
  return { received, returned, remaining: received - returned };
}
export function purchaseReturnSummary(state: Workspace, receiptId: string) {
  const lines = state.receipts.find(r => r.id === receiptId)?.lines ?? [];
  const quantities = lines.map(l => purchaseReturnQuantities(state, receiptId, l.productId));
  return quantities.every(q => q.returned === 0) ? '未退货' : quantities.every(q => q.remaining === 0) ? '全部退货' : '部分退货';
}
export function duplicatePurchaseReturns(state: Workspace, doc: Pick<PurchaseReturn, 'id' | 'receiptId' | 'returnDate' | 'lines'>) {
  const signature = (lines: SalesReturnLine[]) => JSON.stringify(lines.map(l => [l.productId, l.quantity]).sort((a, b) => String(a[0]).localeCompare(String(b[0]))));
  return (state.purchaseReturns ?? []).filter(r => r.id !== doc.id && r.status === 'returned' && r.receiptId === doc.receiptId && r.returnDate === doc.returnDate && signature(r.lines) === signature(doc.lines));
}
export const inventoryToken = (state: Workspace, productId: string) => state.ledger.findLast(e => e.productId === productId)?.id ?? '';
export const countLineStale = (state: Workspace, line: Pick<CountLineInput, 'productId' | 'bookQuantity' | 'baselineLedgerId'>) => state.products.find(p => p.id === line.productId)?.stock !== line.bookQuantity || inventoryToken(state, line.productId) !== line.baselineLedgerId;
export const preferredSupplierId = (state: Workspace, product?: Product) => product?.defaultSupplierId && product.supplierIds?.includes(product.defaultSupplierId) && state.suppliers.some(s => s.id === product.defaultSupplierId && s.active !== false) ? product.defaultSupplierId : undefined;

function supplierLinks(state: Workspace, input: ProductInput, previous?: Product) {
  const supplierIds = [...new Set(input.supplierIds ?? previous?.supplierIds ?? [])];
  for (const id of supplierIds) {
    const supplier = state.suppliers.find(s => s.id === id);
    if (!supplier) throw new Error('供应商不存在，请刷新后重新选择');
    if (supplier.active === false && !previous?.supplierIds?.includes(id)) throw new Error(`${supplier.name}已停用，不能新增供货关联`);
  }
  const defaultSupplierId = input.defaultSupplierId === undefined ? previous?.defaultSupplierId : input.defaultSupplierId || undefined;
  if (defaultSupplierId && !supplierIds.includes(defaultSupplierId)) throw new Error('默认供应商必须在关联供应商中');
  if (defaultSupplierId && state.suppliers.find(s => s.id === defaultSupplierId)?.active === false && previous?.defaultSupplierId !== defaultSupplierId) throw new Error('已停用的供应商不能设为默认');
  return { supplierIds, defaultSupplierId };
}

function required(value: string, name: string, max = 120) {
  const clean = value.trim();
  if (!clean || clean.length > max) throw new Error(`${name}不能为空且不得超过 ${max} 字`);
  return clean;
}
function quantity(value: number, allowZero = false) {
  if (!Number.isSafeInteger(value) || value < (allowZero ? 0 : 1) || value > 1_000_000) throw new Error(`数量须为${allowZero ? '非负' : '正'}整数，且不超过 1,000,000`);
  return value;
}
export function priceCents(value: string) {
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(value.trim())) throw new Error('金额须为非负数字，最多两位小数，且小于一千万元');
  const [whole, fraction = ''] = value.trim().split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}
function validateDate(value: string, label = '期望发货日期') {
  const parsed = new Date(`${value}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw new Error(`请填写有效的${label}`);
}

/** Pure transition: failures never modify the caller's state. Storage executes it on the latest transaction snapshot. */
export function applyCommand(current: Workspace, command: Command, at = new Date().toISOString()): Workspace {
  const state = structuredClone(normalizeWorkspace(current));
  const nextId = (prefix: string) => `${prefix}-${String(state.nextId++).padStart(5, '0')}`;
  const getProduct = (id: string) => { const item = state.products.find(p => p.id === id); if (!item) throw new Error('商品不存在，请刷新后重试'); return item; };
  const actor = '本地用户';
  const validatePurchaseReturn = (doc: Pick<PurchaseReturn, 'receiptId' | 'receiptNumber' | 'supplierId' | 'lines' | 'returnDate'>, confirming = false) => {
    const source = state.receipts.find(r => r.id === doc.receiptId);
    if (!source || source.status !== 'received' || source.number !== doc.receiptNumber || source.supplierId !== doc.supplierId) throw new Error('退货来源须为已入库且未冲销的原单，来源已变化，请核查');
    if (!state.suppliers.some(s => s.id === source.supplierId)) throw new Error('原单供应商不存在，请核查来源');
    if (doc.returnDate || confirming) {
      validateDate(doc.returnDate, '实际退货日期');
      if (doc.returnDate > day(new Date(at)) || doc.returnDate < source.receiptDate) throw new Error('实际退货日期不能早于原收货日期或晚于今天');
    }
    for (const line of doc.lines) {
      const p = getProduct(line.productId);
      if (!source.lines.some(l => l.productId === p.id)) throw new Error('只能退回原采购入库单中的商品');
      if (!p.initialized) throw new Error(`${p.name}尚未初始化，请核查来源`);
      quantity(line.quantity); required(line.reason, '退货原因', 300);
      const { remaining } = purchaseReturnQuantities(state, source.id, p.id);
      if (line.quantity > remaining) throw new Error(`${line.productName}本次 ${line.quantity} ${line.unit}，来源最新可退额度 ${remaining} ${line.unit}。请修改草稿重新核对，整单未出库。`);
      if (confirming && p.stock < line.quantity) throw new Error(`${line.productName}当前库存 ${p.stock} ${line.unit}，缺少 ${line.quantity - p.stock} ${line.unit}；来源可退 ${remaining} ${line.unit}。整单未出库。`);
    }
    return source;
  };
  if (command.type === 'save-purchase-return') {
    const previous = command.purchaseReturnId ? state.purchaseReturns.find(r => r.id === command.purchaseReturnId) : undefined;
    if (command.purchaseReturnId && (!previous || previous.status !== 'draft')) throw new Error('仅草稿采购退货单可编辑');
    if (previous && previous.revision !== command.revision) throw new Error('采购退货草稿已更新，请重新打开核对');
    if (previous && previous.receiptId !== command.receiptId) throw new Error('保存后原入库单固定，请取消重建，不能更换原单');
    const source = state.receipts.find(r => r.id === command.receiptId);
    if (!source || source.status !== 'received') throw new Error('请选择已入库且未冲销的原采购入库来源');
    const supplier = state.suppliers.find(s => s.id === source.supplierId);
    if (!supplier) throw new Error('原单供应商不存在，请核查');
    if (!command.lines.length || command.lines.length > 100) throw new Error('请填写 1 至 100 行退货商品');
    if (command.note.length > 1000) throw new Error('备注最多 1000 字');
    const seen = new Set<string>();
    const lines = command.lines.map(line => {
      if (seen.has(line.productId)) throw new Error('同一商品不能重复添加');
      seen.add(line.productId);
      const original = source.lines.find(l => l.productId === line.productId);
      if (!original) throw new Error('只能退回原采购入库单中的商品');
      const p = getProduct(line.productId);
      const snapshot = previous?.lines.find(l => l.productId === line.productId) ?? original;
      return { productId: p.id, quantity: quantity(line.quantity), reason: required(line.reason, '退货原因', 300), productName: snapshot.productName ?? p.name, sku: snapshot.sku ?? p.sku, unit: snapshot.unit ?? p.unit };
    });
    const details = { receiptId: source.id, receiptNumber: previous?.receiptNumber ?? source.number, supplierId: previous?.supplierId ?? source.supplierId, supplierName: previous?.supplierName ?? source.supplierName ?? supplier.name, deliveryNumber: previous?.deliveryNumber ?? source.deliveryNumber, returnDate: command.returnDate, note: command.note.trim(), lines, updatedAt: at };
    validatePurchaseReturn(details);
    if (previous) { Object.assign(previous, details); previous.revision++; previous.history.push({ at, action: '更新采购退货草稿，库存未变', actor }); }
    else { const id = nextId('PR'); state.purchaseReturns.push({ ...details, id, number: `PR-${day(new Date(at)).replaceAll('-', '')}-${id.slice(3)}`, status: 'draft', revision: 1, createdAt: at, history: [{ at, action: '创建采购退货草稿，库存未变', actor }] }); }
    return state;
  }
  if (command.type === 'confirm-purchase-return' || command.type === 'cancel-purchase-return') {
    const doc = state.purchaseReturns.find(r => r.id === command.purchaseReturnId);
    if (!doc) throw new Error('采购退货单不存在，请刷新后重试');
    if (command.type === 'confirm-purchase-return' && doc.status === 'returned') return state;
    if (doc.status !== 'draft') throw new Error('只有草稿采购退货单可以操作');
    if (doc.revision !== command.revision) throw new Error('采购退货草稿已更新，请重新打开核对');
    if (command.type === 'cancel-purchase-return') {
      doc.cancelReason = required(command.reason, '取消原因', 300); doc.status = 'cancelled';
      doc.history.push({ at, action: `取消采购退货草稿：${doc.cancelReason}`, actor });
    } else {
      validatePurchaseReturn(doc, true);
      if (command.handedOver !== true) throw new Error('请确认供应商同意退货、实物已核对并交接出库');
      const duplicates = duplicatePurchaseReturns(state, doc);
      if (duplicates.length && !command.allowDuplicate) throw new Error(`发现相同来源、日期和商品数量的疑似重复退货：${duplicates.map(r => r.number).join('、')}。请核对后明确继续。`);
      if (duplicates.length) doc.history.push({ at, action: `已人工核对疑似重复采购退货并继续：${duplicates.map(r => r.number).join('、')}`, actor });
      for (const line of doc.lines) {
        const p = getProduct(line.productId); p.stock -= line.quantity;
        state.ledger.push({ id: nextId('L'), productId: p.id, at, kind: 'purchase-return', change: -line.quantity, balance: p.stock, reference: doc.number, receiptId: doc.receiptId, purchaseReturnId: doc.id, businessDate: doc.returnDate, actor });
      }
      doc.status = 'returned'; doc.confirmedAt = at;
      doc.history.push({ at, action: '确认采购退货交接出库，库存与流水已更新', actor });
    }
    doc.updatedAt = at; doc.revision++;
    return state;
  }
  const validateReturn = (doc: Pick<SalesReturn, 'orderId' | 'shipmentNumber' | 'lines' | 'receiptDate'>, confirming = false) => {
    const order = state.orders.find(o => o.id === doc.orderId);
    if (!order || order.status !== 'shipped' || !order.shipmentNumber || order.shipmentNumber !== doc.shipmentNumber) throw new Error('退货来源须为已出库订单，原出库来源已变化或缺失，请核查');
    if (doc.receiptDate || confirming) {
      validateDate(doc.receiptDate, '实收日期');
      if (doc.receiptDate > day(new Date(at))) throw new Error('实收日期不能晚于今天');
    }
    for (const line of doc.lines) {
      const p = getProduct(line.productId);
      if (!order.lines.some(l => l.productId === p.id)) throw new Error('只能退回原销售订单中的商品');
      if (!p.initialized) throw new Error(`${p.name}尚未初始化，请核查原出库来源`);
      quantity(line.quantity); required(line.reason, '退货原因', 300);
      const { remaining } = salesReturnQuantities(state, order.id, p.id);
      if (line.quantity > remaining) throw new Error(`${line.productName}本次退货 ${line.quantity} ${line.unit}，最新可退 ${remaining} ${line.unit}。请修改草稿并重新核对，整单未入库。`);
      if (confirming && p.stock + line.quantity > 1_000_000) throw new Error(`${p.name}退货后超过库存数量上限，整单未入库`);
    }
    return order;
  };
  if (command.type === 'save-sales-return') {
    const previous = command.salesReturnId ? state.salesReturns.find(r => r.id === command.salesReturnId) : undefined;
    if (command.salesReturnId && (!previous || previous.status !== 'draft')) throw new Error('仅草稿退货单可编辑');
    if (previous && previous.revision !== command.revision) throw new Error('退货草稿已更新，请重新打开核对');
    if (previous && previous.orderId !== command.orderId) throw new Error('保存后原订单固定，请取消草稿后重建，不能更换原单');
    const order = state.orders.find(o => o.id === command.orderId);
    if (!order || order.status !== 'shipped' || !order.shipmentNumber) throw new Error('请选择有出库来源的已出库订单');
    if (!command.lines.length || command.lines.length > 100) throw new Error('请填写 1 至 100 行退货商品');
    if (command.note.length > 1000) throw new Error('备注最多 1000 字');
    const customer = state.customers.find(c => c.id === order.customerId);
    if (!customer) throw new Error('原订单客户不存在，请核查');
    const seen = new Set<string>();
    const lines = command.lines.map(line => {
      if (seen.has(line.productId)) throw new Error('同一商品不能重复添加');
      seen.add(line.productId);
      const source = order.lines.find(l => l.productId === line.productId);
      if (!source) throw new Error('只能退回原销售订单中的商品');
      const product = getProduct(line.productId);
      const snapshot = previous?.lines.find(l => l.productId === line.productId) ?? source;
      return { productId: product.id, quantity: quantity(line.quantity), reason: required(line.reason, '退货原因', 300), productName: snapshot.productName ?? product.name, sku: snapshot.sku ?? product.sku, unit: snapshot.unit ?? product.unit };
    });
    const details = { orderId: order.id, shipmentNumber: previous?.shipmentNumber ?? order.shipmentNumber, customerId: order.customerId, customerName: previous?.customerName ?? customer.name, receiptDate: command.receiptDate, note: command.note.trim(), lines, updatedAt: at };
    validateReturn(details);
    if (previous) { Object.assign(previous, details); previous.revision++; previous.history.push({ at, action: '更新销售退货草稿，库存未变', actor }); }
    else { const id = nextId('SR'); state.salesReturns.push({ ...details, id, number: `SR-${day(new Date(at)).replaceAll('-', '')}-${id.slice(3)}`, status: 'draft', revision: 1, createdAt: at, history: [{ at, action: '创建销售退货草稿，库存未变', actor }] }); }
    return state;
  }
  if (command.type === 'confirm-sales-return' || command.type === 'cancel-sales-return') {
    const doc = state.salesReturns.find(r => r.id === command.salesReturnId);
    if (!doc) throw new Error('退货单不存在，请刷新后重试');
    if (command.type === 'confirm-sales-return' && doc.status === 'received') return state;
    if (doc.status !== 'draft') throw new Error('只有草稿退货单可以操作');
    if (doc.revision !== command.revision) throw new Error('退货草稿已更新，请重新打开核对');
    if (command.type === 'cancel-sales-return') {
      doc.cancelReason = required(command.reason, '取消原因', 300); doc.status = 'cancelled';
      doc.history.push({ at, action: `取消销售退货草稿：${doc.cancelReason}`, actor });
    } else {
      validateReturn(doc, true);
      if (command.accepted !== true) throw new Error('请确认本单商品已收到并验收合格');
      const duplicates = duplicateSalesReturns(state, doc);
      if (duplicates.length && !command.allowDuplicate) throw new Error(`发现相同原单、日期和商品数量的已入库退货：${duplicates.map(r => r.number).join('、')}。请核对疑似重复记录后明确继续。`);
      if (duplicates.length) doc.history.push({ at, action: `已人工核对疑似重复退货并继续：${duplicates.map(r => r.number).join('、')}`, actor });
      for (const line of doc.lines) {
        const p = getProduct(line.productId); p.stock += line.quantity;
        state.ledger.push({ id: nextId('L'), productId: p.id, at, kind: 'sale-return', change: line.quantity, balance: p.stock, reference: doc.number, orderId: doc.orderId, salesReturnId: doc.id, businessDate: doc.receiptDate, actor });
      }
      doc.status = 'received'; doc.confirmedAt = at;
      doc.history.push({ at, action: '确认销售退货验收入库，库存与流水已更新', actor });
    }
    doc.updatedAt = at; doc.revision++;
    return state;
  }
  const validateCountBaseline = (line: CountLineInput) => {
    const p = getProduct(line.productId);
    if (!p.initialized) throw new Error(`${p.name}尚未初始化，请先完成期初设置`);
    if (countLineStale(state, line)) throw new Error(`${p.name}的库存流水已变化，请编辑草稿并重新核对实盘数量。整单库存未变更。`);
    return p;
  };
  if (command.type === 'save-count') {
    const previous = command.countId ? state.counts.find(c => c.id === command.countId) : undefined;
    if (command.countId && (!previous || previous.status !== 'draft')) throw new Error('仅草稿盘点单可编辑');
    if (previous && previous.revision !== command.revision) throw new Error('盘点单已被更新，请重新打开后核对');
    if (command.note.length > 1000) throw new Error('备注最多 1000 字');
    if (!command.lines.length || command.lines.length > 100) throw new Error('请填写 1 至 100 行商品');
    const seen = new Set<string>();
    const lines = command.lines.map(line => {
      if (seen.has(line.productId)) throw new Error('同一商品不能重复添加');
      seen.add(line.productId);
      quantity(line.bookQuantity, true); quantity(line.actualQuantity, true);
      const p = validateCountBaseline(line);
      const reason = line.reason.trim();
      if (reason.length > 300) throw new Error('差异原因最多 300 字');
      if (line.actualQuantity !== line.bookQuantity && !reason) throw new Error(`${p.name}请填写差异原因`);
      return { productId: p.id, bookQuantity: line.bookQuantity, baselineLedgerId: line.baselineLedgerId, actualQuantity: line.actualQuantity, reason, productName: p.name, sku: p.sku, unit: p.unit };
    });
    if (previous) {
      Object.assign(previous, { note: command.note.trim(), lines, updatedAt: at, revision: previous.revision + 1 });
      previous.history.push({ at, action: '更新盘点草稿并核对账面数量', actor });
    } else {
      const id = nextId('COUNT');
      state.counts.push({ id, number: `COUNT-${day(new Date(at)).replaceAll('-', '')}-${id.slice(6)}`, status: 'draft', revision: 1, note: command.note.trim(), lines, createdAt: at, updatedAt: at, history: [{ at, action: '创建盘点草稿，库存未变更', actor }] });
    }
    return state;
  }
  if (command.type === 'confirm-count' || command.type === 'cancel-count') {
    const count = state.counts.find(c => c.id === command.countId);
    if (!count) throw new Error('盘点单不存在，请刷新后重试');
    if (command.type === 'confirm-count' && count.status === 'confirmed') return state;
    if (count.status !== 'draft') throw new Error('只有草稿盘点单可以操作');
    if (count.revision !== command.revision) throw new Error('盘点单已被更新，请重新打开后核对');
    if (command.type === 'cancel-count') {
      count.cancelReason = required(command.reason, '取消原因', 300);
      count.status = 'cancelled';
      count.history.push({ at, action: `取消盘点草稿：${count.cancelReason}`, actor });
    } else {
      // Check every line before applying anything. A net-zero receipt/reversal also invalidates the baseline.
      for (const line of count.lines) validateCountBaseline(line);
      for (const line of count.lines) {
        const p = getProduct(line.productId);
        const difference = line.actualQuantity - line.bookQuantity;
        Object.assign(line, { productName: p.name, sku: p.sku, unit: p.unit });
        if (difference === 0) continue;
        p.stock = line.actualQuantity;
        state.ledger.push({ id: nextId('L'), productId: p.id, at, kind: difference > 0 ? 'count-gain' : 'count-loss', change: difference, balance: p.stock, reference: count.number, countId: count.id, actor });
      }
      count.status = 'confirmed'; count.confirmedAt = at;
      count.history.push({ at, action: '确认库存盘点，差异已记入库存流水；零差异商品保留盘点结果', actor });
    }
    count.updatedAt = at; count.revision += 1;
    return state;
  }
  const getSupplier = (id: string) => { const item = state.suppliers.find(s => s.id === id); if (!item) throw new Error('供应商不存在，请刷新后重试'); return item; };
  if (command.type === 'add-supplier' || command.type === 'update-supplier') {
    const supplier = command.type === 'update-supplier' ? getSupplier(command.supplierId) : undefined;
    const name = required(command.name, '供应商名称', 80);
    if (state.suppliers.some(s => s.id !== supplier?.id && s.name === name)) throw new Error('供应商名称已存在');
    const contact = (command.contact ?? '').trim(); const phone = (command.phone ?? '').trim();
    if (contact.length > 50 || phone.length > 40) throw new Error('联系人最多 50 字，联系电话最多 40 字');
    if (supplier) Object.assign(supplier, { name, contact, phone });
    else state.suppliers.push({ id: nextId('SUP'), name, contact, phone, active: true });
    return state;
  }
  if (command.type === 'set-supplier-active') { getSupplier(command.supplierId).active = command.active; return state; }
  if (command.type === 'save-receipt') {
    const previous = command.receiptId ? state.receipts.find(r => r.id === command.receiptId) : undefined;
    if (command.receiptId && (!previous || previous.status !== 'draft')) throw new Error('仅草稿入库单可编辑');
    const supplier = getSupplier(command.supplierId);
    if (supplier.active === false) throw new Error('供应商已停用');
    validateDate(command.receiptDate, '收货日期');
    if (command.receiptDate > day(new Date(at))) throw new Error('收货日期不能晚于今天');
    if (command.note.length > 1000 || command.deliveryNumber.length > 80) throw new Error('备注最多 1000 字，送货单号最多 80 字');
    if (!command.lines.length || command.lines.length > 100) throw new Error('请填写 1 至 100 行商品');
    const seen = new Set<string>();
    const lines = command.lines.map(line => {
      const p = getProduct(line.productId);
      if (p.active === false) throw new Error(`${p.name}已停用`);
      if (!p.initialized) throw new Error(`${p.name}尚未初始化，请录入期初或确认零库存启用`);
      if (seen.has(p.id)) throw new Error('同一商品不能重复添加，请合并数量'); seen.add(p.id);
      return { productId: p.id, quantity: quantity(line.quantity), unitPriceCents: priceCents(line.price), productName: p.name, sku: p.sku, unit: p.unit };
    });
    if (lines.some(l => l.unitPriceCents === 0) && !command.note.trim()) throw new Error('零元采购请在备注填写原因');
    if (!Number.isSafeInteger(orderTotal({ lines }))) throw new Error('采购总金额过大');
    const correctsId = previous?.correctsId ?? command.correctsId;
    if (correctsId) {
      if (!state.receipts.some(r => r.id === correctsId && r.status === 'reversed')) throw new Error('更正来源须为已冲销入库单');
      if (state.receipts.some(r => r.id !== previous?.id && r.correctsId === correctsId && r.status !== 'cancelled' && r.status !== 'reversed')) throw new Error('该原单已有有效更正单，请查看关联单据');
    }
    const details = { supplierId: supplier.id, receiptDate: command.receiptDate, deliveryNumber: command.deliveryNumber.trim(), note: command.note.trim(), lines, correctsId, updatedAt: at };
    if (previous) { Object.assign(previous, details); previous.history.push({ at, action: '更新入库草稿', actor }); }
    else { const id = nextId('IN'); state.receipts.push({ ...details, id, number: `IN-${day(new Date(at)).replaceAll('-', '')}-${id.slice(3)}`, status: 'draft', createdAt: at, history: [{ at, action: '创建入库草稿', actor }] }); }
    return state;
  }
  if (command.type === 'confirm-receipt' || command.type === 'cancel-receipt' || command.type === 'reverse-receipt') {
    const receipt = state.receipts.find(r => r.id === command.receiptId);
    if (!receipt) throw new Error('入库单不存在，请刷新后重试');
    if (command.type === 'confirm-receipt') {
      if (receipt.status === 'received') return state;
      if (receipt.status !== 'draft') throw new Error('只有草稿入库单可以确认');
      const supplier = getSupplier(receipt.supplierId);
      if (supplier.active === false) throw new Error('供应商已停用，请更换或重新启用');
      if (receipt.deliveryNumber && !command.allowDuplicate && state.receipts.some(r => r.id !== receipt.id && r.status === 'received' && r.supplierId === receipt.supplierId && r.deliveryNumber === receipt.deliveryNumber)) throw new Error('该供应商送货单号已有入库记录，请核对并确认分批收货后重试');
      for (const line of receipt.lines) {
        const p = getProduct(line.productId);
        if (p.active === false || !p.initialized) throw new Error(`${p.name}已停用或尚未初始化`);
        try { quantity(p.stock + line.quantity, true); } catch { throw new Error(`${p.name}入库后超过库存数量上限`); }
      }
      for (const line of receipt.lines) {
        const p = getProduct(line.productId); p.stock += line.quantity;
        Object.assign(line, { productName: p.name, sku: p.sku, unit: p.unit });
        state.ledger.push({ id: nextId('L'), productId: p.id, at, kind: 'purchase', change: line.quantity, balance: p.stock, reference: receipt.number, receiptId: receipt.id, businessDate: receipt.receiptDate, actor });
      }
      Object.assign(receipt, { status: 'received', confirmedAt: at, supplierName: supplier.name });
      receipt.temporaryProductIds = receipt.lines.filter(l => !getProduct(l.productId).supplierIds?.includes(receipt.supplierId)).map(l => l.productId);
      receipt.history.push({ at, action: '确认采购入库，库存及流水已更新', actor });
      if (receipt.temporaryProductIds.length) receipt.history.push({ at, action: `临时采购，供货关联保持不变：${receipt.temporaryProductIds.map(id => getProduct(id).name).join('、')}`, actor });
    } else if (command.type === 'cancel-receipt') {
      if (receipt.status !== 'draft') throw new Error('只有草稿入库单可以取消');
      receipt.reason = required(command.reason, '取消原因', 300); receipt.status = 'cancelled';
      receipt.history.push({ at, action: `取消入库草稿：${receipt.reason}`, actor });
    } else {
      if (receipt.status === 'reversed') return state;
      if (receipt.status !== 'received') throw new Error('只有已入库单可以冲销');
      const actualReturns = state.purchaseReturns.filter(r => r.receiptId === receipt.id && r.status === 'returned');
      if (actualReturns.length) throw new Error(`原入库单已有实际采购退货，不能整单冲销：${actualReturns.map(r => r.number).join('、')}`);
      const reason = required(command.reason, '冲销原因', 300);
      const shortages = receipt.lines.flatMap(l => { const p = getProduct(l.productId); return p.stock < l.quantity ? [`${p.name}：缺少 ${l.quantity - p.stock} ${p.unit}`] : []; });
      if (shortages.length) throw new Error(`无法冲销。${shortages.join('；')}。整单库存未变更，请核查后续出库和实物。`);
      const reversalNumber = nextId('REV');
      for (const line of receipt.lines) { const p = getProduct(line.productId); p.stock -= line.quantity; state.ledger.push({ id: nextId('L'), productId: p.id, at, kind: 'purchase-reversal', change: -line.quantity, balance: p.stock, reference: reversalNumber, receiptId: receipt.id, businessDate: day(new Date(at)), actor }); }
      Object.assign(receipt, { status: 'reversed', reversedAt: at, reason, reversalNumber });
      receipt.history.push({ at, action: `整单冲销入库 ${reversalNumber}：${reason}`, actor });
    }
    receipt.updatedAt = at; return state;
  }
  if (command.type === 'set-product-active') {
    getProduct(command.productId).active = command.active;
    return state;
  }
  if (command.type === 'update-product') {
    const product = getProduct(command.productId);
    const sku = required(command.sku, '商品编码', 40).toUpperCase();
    const unit = required(command.unit, '单位', 8);
    const name = required(command.name, '商品名称', 80);
    const price = priceCents(command.price);
    const links = supplierLinks(state, command, product);
    if (state.products.some(p => p.id !== product.id && p.sku.toUpperCase() === sku)) throw new Error('商品编码已存在');
    if (productIsUsed(state, product.id) && (sku !== product.sku || unit !== product.unit)) throw new Error('已有业务记录，商品编码和单位不能修改');
    // Fill snapshots for legacy orders before changing the shared product record.
    for (const order of state.orders) for (const line of order.lines) if (line.productId === product.id) {
      line.productName ??= product.name; line.sku ??= product.sku; line.unit ??= product.unit;
    }
    Object.assign(product, { name, sku, unit, priceCents: price, ...links });
    return state;
  }
  if (command.type === 'add-product') {
    const sku = required(command.sku, '商品编码', 40).toUpperCase();
    if (state.products.some(p => p.sku.toUpperCase() === sku)) throw new Error('商品编码已存在');
    const links = supplierLinks(state, command);
    state.products.push({ id: nextId('P'), sku, name: required(command.name, '商品名称', 80), unit: required(command.unit, '单位', 8), priceCents: priceCents(command.price), stock: 0, initialized: true, ...links });
    return state;
  }
  if (command.type === 'add-customer' || command.type === 'update-customer') {
    const customerId = command.type === 'update-customer' ? command.customerId : undefined;
    const customer = customerId ? state.customers.find(c => c.id === customerId) : undefined;
    if (command.type === 'update-customer' && !customer) throw new Error('客户不存在，请刷新后重试');
    const name = required(command.name, '客户名称', 80);
    if (state.customers.some(c => c.id !== customerId && c.name === name)) throw new Error('客户名称已存在');
    const contact = (command.contact ?? '').trim();
    const phone = (command.phone ?? '').trim();
    if (contact.length > 50) throw new Error('联系人不得超过 50 字');
    if (phone.length > 40) throw new Error('联系电话不得超过 40 字');
    if (customer) Object.assign(customer, { name, contact, phone });
    else state.customers.push({ id: nextId('C'), name, ...(contact ? { contact } : {}), ...(phone ? { phone } : {}) });
    return state;
  }
  if (command.type === 'initialize') {
    const product = getProduct(command.productId);
    if (product.initialized) throw new Error('该商品已初始化，不能重复录入期初库存');
    if (state.ledger.some(e => e.productId === product.id)) throw new Error('已有库存流水，不能补录期初');
    product.stock = quantity(command.quantity, true);
    product.initialized = true;
    const id = nextId('OPEN');
    state.ledger.push({ id, productId: product.id, at, kind: 'opening', change: product.stock, balance: product.stock, reference: id, actor });
    return state;
  }
  if (command.type === 'save-order') {
    if (!state.customers.some(c => c.id === command.customerId)) throw new Error('请选择有效客户');
    validateDate(command.deliveryDate);
    if (!command.lines.length || command.lines.length > 100) throw new Error('请添加 1 至 100 行商品');
    if (command.note.length > 1000) throw new Error('备注不得超过 1000 字');
    const seen = new Set<string>();
    const lines = command.lines.map(line => {
      const product = getProduct(line.productId);
      if (product.active === false) throw new Error(`${product.name}已停用，请移除或重新启用后开单`);
      if (seen.has(line.productId)) throw new Error('同一商品不能重复添加，请合并数量');
      seen.add(line.productId);
      return { productId: line.productId, quantity: quantity(line.quantity), unitPriceCents: priceCents(line.price), productName: product.name, sku: product.sku, unit: product.unit };
    });
    if (!Number.isSafeInteger(orderTotal({ lines }))) throw new Error('订单总金额过大');
    if (command.orderId) {
      const order = state.orders.find(o => o.id === command.orderId);
      if (!order || order.status !== 'draft') throw new Error('仅草稿订单可以编辑，请刷新后重试');
      Object.assign(order, { customerId: command.customerId, deliveryDate: command.deliveryDate, note: command.note.trim(), lines, updatedAt: at });
      order.history.push({ at, action: '更新草稿', actor });
    } else {
      const id = nextId('SO');
      state.orders.push({ id, number: `SO-${at.slice(0, 10).replaceAll('-', '')}-${id.slice(3)}`, customerId: command.customerId, deliveryDate: command.deliveryDate, note: command.note.trim(), lines, status: 'draft', createdAt: at, updatedAt: at, history: [{ at, action: '创建草稿', actor }] });
    }
    return state;
  }
  const order = state.orders.find(o => o.id === command.orderId);
  if (!order) throw new Error('订单不存在，请刷新后重试');
  if (command.type === 'submit') {
    if (order.status !== 'draft') throw new Error('只有草稿订单可以提交');
    if (order.lines.some(line => getProduct(line.productId).active === false)) throw new Error('订单包含已停用商品，请编辑草稿移除或重新启用商品后提交');
    order.status = 'pending';
    order.history.push({ at, action: '提交订单，等待出库', actor });
  } else if (command.type === 'cancel') {
    if (order.status === 'shipped' || order.status === 'cancelled') throw new Error('该订单不能取消');
    order.cancelReason = required(command.reason, '取消原因', 300);
    order.status = 'cancelled';
    order.history.push({ at, action: `取消订单：${order.cancelReason}`, actor });
  } else if (command.type === 'ship') {
    if (order.status === 'shipped') return current;
    if (order.status !== 'pending') throw new Error('只有待出库订单可以出库');
    const shortages = order.lines.flatMap(line => {
      const product = getProduct(line.productId);
      if (!product.initialized) return [`${product.name}尚未完成期初设置或零库存启用`];
      return product.stock < line.quantity ? [`${product.name}：现有 ${product.stock} ${product.unit}，缺少 ${line.quantity - product.stock} ${product.unit}`] : [];
    });
    if (shortages.length) throw new Error(`无法出库。${shortages.join('；')}。整单库存未变更。`);
    const shipmentNumber = nextId('OUT');
    for (const line of order.lines) {
      const product = getProduct(line.productId);
      product.stock -= line.quantity;
      state.ledger.push({ id: nextId('L'), productId: product.id, at, kind: 'sale', change: -line.quantity, balance: product.stock, reference: shipmentNumber, orderId: order.id, actor });
    }
    order.shipmentNumber = shipmentNumber;
    order.status = 'shipped';
    order.history.push({ at, action: `整单确认出库 · ${shipmentNumber}`, actor });
  }
  order.updatedAt = at;
  return state;
}

export function createDemoState(at = new Date().toISOString()): Workspace {
  let state = createEmptyState();
  const run = (cmd: Command) => { state = applyCommand(state, cmd, at); };
  for (const [sku, name, unit, price, stock] of [
    ['CH-001', '人体工学办公椅', '把', '680', 100], ['TB-001', '电动升降办公桌', '张', '1290', 60],
    ['KB-001', '无线键鼠套装', '套', '199', 200], ['AR-001', '显示器支架', '个', '159', 80],
    ['CB-001', '文件收纳柜', '组', '520', 8], ['WB-001', '磁性会议白板', '块', '320', 0],
  ] as const) {
    run({ type: 'add-product', sku, name, unit, price });
    state.products.at(-1)!.initialized = false;
    run({ type: 'initialize', productId: state.products.at(-1)!.id, quantity: stock });
  }
  for (const name of ['青禾科技有限公司', '远山设计工作室', '启明教育咨询有限公司']) run({ type: 'add-customer', name });
  const date = day(new Date(at));
  for (const [customerIndex, productIndex, count, status] of [[0, 0, 30, 'pending'], [1, 1, 8, 'pending'], [2, 2, 10, 'shipped'], [1, 3, 20, 'draft']] as const) {
    const product = state.products[productIndex];
    run({ type: 'save-order', customerId: state.customers[customerIndex].id, deliveryDate: date, note: '示例订单，可用于体验业务流程。', lines: [{ productId: product.id, quantity: count, price: String(product.priceCents / 100) }] });
    const orderId = state.orders.at(-1)!.id;
    if (status !== 'draft') run({ type: 'submit', orderId });
    if (status === 'shipped') run({ type: 'ship', orderId });
  }
  return state;
}
