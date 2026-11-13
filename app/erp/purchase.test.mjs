import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCommand, createEmptyState, normalizeWorkspace } from './model.ts';
const at='2026-10-17T02:00:00.000Z';
const run=(state,action)=>applyCommand(state,action,at);
function setup(){let state=createEmptyState();state=run(state,{type:'add-product',name:'测试椅子',sku:'TEST-1',unit:'把',price:'680'});state=run(state,{type:'add-supplier',name:'椅子供应商',contact:'陈女士',phone:'12345'});return state;}
function save(state,patch={}){return run(state,{type:'save-receipt',supplierId:state.suppliers[0].id,receiptDate:'2026-10-17',deliveryNumber:'',note:'',lines:[{productId:state.products[0].id,quantity:50,price:'100'}],...patch});}
test('新商品默认零库存可用，旧工作区补齐采购数据且保留未初始化状态',()=>{
 const state=setup();assert.equal(state.products[0].initialized,true);assert.equal(state.products[0].stock,0);
 const old=structuredClone(state);delete old.suppliers;delete old.receipts;old.products[0].initialized=false;
 const next=normalizeWorkspace(old);assert.deepEqual(next.suppliers,[]);assert.deepEqual(next.receipts,[]);assert.equal(next.products[0].initialized,false);assert.equal(old.suppliers,undefined);
 assert.throws(()=>run(state,{type:'initialize',productId:state.products[0].id,quantity:10}),/已初始化/);
});
test('草稿无库存影响，确认整单入账且重复确认只生效一次',()=>{
 let state=save(setup());const id=state.receipts[0].id;assert.equal(state.products[0].stock,0);assert.equal(state.ledger.length,0);
 state=run(state,{type:'confirm-receipt',receiptId:id});assert.equal(state.products[0].stock,50);assert.equal(state.receipts[0].status,'received');assert.equal(state.ledger[0].receiptId,id);assert.equal(state.ledger[0].kind,'purchase');
 assert.deepEqual(run(state,{type:'confirm-receipt',receiptId:id}),state);
 assert.throws(()=>save(state,{receiptId:id}),/草稿/);
});
test('停用、未初始化及库存超限使多商品整单失败且不修改输入',()=>{
 for(const fault of ['disabled','uninitialized','overflow']){let state=setup();state=run(state,{type:'add-product',name:'第二件',sku:'TEST-2',unit:'个',price:'1'});state=save(state,{lines:state.products.map(p=>({productId:p.id,quantity:10,price:'1'}))});
 if(fault==='disabled')state.products[1].active=false;if(fault==='uninitialized')state.products[1].initialized=false;if(fault==='overflow')state.products[1].stock=999999;
 const before=structuredClone(state);assert.throws(()=>run(state,{type:'confirm-receipt',receiptId:state.receipts[0].id}));assert.deepEqual(state,before);}
});
test('入库冲销整单扣回一次、保留流水、可关联更正单且库存不足时阻止',()=>{
 let state=save(setup());const id=state.receipts[0].id;state=run(state,{type:'confirm-receipt',receiptId:id});
 assert.throws(()=>run(state,{type:'reverse-receipt',receiptId:id,reason:''}),/原因/);
 state=run(state,{type:'reverse-receipt',receiptId:id,reason:'数量录错'});assert.equal(state.products[0].stock,0);assert.equal(state.receipts[0].status,'reversed');assert.deepEqual(state.ledger.map(e=>e.change),[50,-50]);assert.equal(state.ledger[1].kind,'purchase-reversal');
 assert.deepEqual(run(state,{type:'reverse-receipt',receiptId:id,reason:'重试'}),state);
 state=save(state,{correctsId:id});assert.equal(state.receipts.at(-1).correctsId,id);assert.throws(()=>save(state,{correctsId:id}),/更正单/);
 let short=save(setup());short=run(short,{type:'confirm-receipt',receiptId:short.receipts[0].id});short.products[0].stock=10;const before=structuredClone(short);assert.throws(()=>run(short,{type:'reverse-receipt',receiptId:short.receipts[0].id,reason:'错误'}),/缺少 40/);assert.deepEqual(short,before);
});
test('供应商去重、停用保护和确认资料快照；采购价格不改销售参考售价',()=>{
 let state=setup();assert.throws(()=>run(state,{type:'add-supplier',name:' 椅子供应商 '}),/已存在/);state=save(state);
 state=run(state,{type:'set-supplier-active',supplierId:state.suppliers[0].id,active:false});assert.throws(()=>run(state,{type:'confirm-receipt',receiptId:state.receipts[0].id}),/停用/);
 state=run(state,{type:'set-supplier-active',supplierId:state.suppliers[0].id,active:true});state=run(state,{type:'update-product',productId:state.products[0].id,name:'确认时名称',sku:'TEST-1',unit:'把',price:'700'});state=run(state,{type:'confirm-receipt',receiptId:state.receipts[0].id});
 state=run(state,{type:'update-supplier',supplierId:state.suppliers[0].id,name:'改名供应商'});state=run(state,{type:'update-product',productId:state.products[0].id,name:'后来名称',sku:'TEST-1',unit:'把',price:'800'});
 assert.equal(state.receipts[0].supplierName,'椅子供应商');assert.equal(state.receipts[0].lines[0].productName,'确认时名称');assert.equal(state.receipts[0].lines[0].unitPriceCents,10000);assert.equal(state.products[0].priceCents,80000);
});
test('日期、零元说明、重复商品和送货单重复需校验；取消后不允许确认',()=>{
 let state=setup();assert.throws(()=>save(state,{receiptDate:'2026-10-18'}),/日期/);assert.throws(()=>save(state,{receiptDate:'2026-02-31'}),/日期/);assert.throws(()=>save(state,{lines:[{productId:state.products[0].id,quantity:1,price:'0'}]}),/零元/);
 state=save(state,{deliveryNumber:'DEL-01'});state=run(state,{type:'confirm-receipt',receiptId:state.receipts[0].id});state=save(state,{deliveryNumber:'DEL-01'});const id=state.receipts.at(-1).id;
 assert.throws(()=>run(state,{type:'confirm-receipt',receiptId:id}),/送货单号/);state=run(state,{type:'confirm-receipt',receiptId:id,allowDuplicate:true});assert.equal(state.products[0].stock,100);
 state=save(state);const cancelled=state.receipts.at(-1).id;state=run(state,{type:'cancel-receipt',receiptId:cancelled,reason:'重复登记'});assert.throws(()=>run(state,{type:'confirm-receipt',receiptId:cancelled}),/草稿/);assert.equal(state.products[0].stock,100);
});
test('补货后原缺货销售订单可出库，冲销与已发生出库重新校验余额',()=>{
 let state=setup();state=run(state,{type:'add-customer',name:'测试客户'});state=run(state,{type:'save-order',customerId:state.customers[0].id,deliveryDate:'2026-10-17',note:'',lines:[{productId:state.products[0].id,quantity:40,price:'680'}]});const orderId=state.orders[0].id;state=run(state,{type:'submit',orderId});assert.throws(()=>run(state,{type:'ship',orderId}),/缺少/);
 state=save(state);state=run(state,{type:'confirm-receipt',receiptId:state.receipts[0].id});state=run(state,{type:'ship',orderId});assert.equal(state.products[0].stock,10);assert.throws(()=>run(state,{type:'reverse-receipt',receiptId:state.receipts[0].id,reason:'错误'}),/缺少 40/);
});
