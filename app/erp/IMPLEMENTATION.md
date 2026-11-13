# ERP MVP 实现说明

依据：根目录 `PRD-ERP产品.md` 第 7 节。用户已要求按该流程开发最小 MVP，本说明记录本轮执行范围。

## 交付范围

- 独立入口 `/erp`，复用现有 Next.js / React，不修改个人站页面。
- 销售订单：搜索、状态筛选、新建、编辑草稿、提交、填写原因取消、查看详情。
- 仓库：待出库列表、出库确认、库存不足阻止、重复出库保护。
- 库存：查询、低库存筛选、期初初始化、逐商品流水及关联订单追溯。
- 提供商品新增及客户新增，保证开单前置资料可以维护。
- 商品管理支持编辑及确认后启用／停用；已有业务锁定编码和单位，历史订单保留商品资料快照与原成交价。
- 六个业务列表提供业务条件组合筛选和一键重置，日期范围校验，手机端筛选使用双列布局。
- 客户管理：独立导航入口、列表和搜索，编辑名称及选填联系方式，以客户编号关联并筛选销售订单。兼容原有客户数据，不重置工作区。
- 首次打开自动载入明确标注的示例商品、客户和订单，提供导出工作区 JSON 备份。

## 数据与规则

使用浏览器 IndexedDB 保存本地工作区。所有变更在一个读写事务中读取最新状态、执行业务校验并写回，避免同浏览器多标签同时出库造成覆盖。写入成功后才更新页面；存储失败显示错误，不能静默回退为临时数据。通过 BroadcastChannel 和窗口重新激活刷新其他标签。

订单状态：草稿、待出库、已出库、已取消。订单不预占库存，出库前检查所有商品，全部通过才整体扣减。重复出库返回既有结果。数量采用整数，金额按分计算；不支持税额、运费、多币种。待出库订单不直接修改，取消重建。初始化过的商品不能重复录入期初库存。

产品边界：单仓库、整单出库、本地单用户，不提供账号认证与跨设备协作。操作人为本地用户，页面如实显示数据存储范围。采购订单、财务、制造、退款、坏品库存及已出库更正不在本轮范围。日常补货采用采购入库，提供库存校验保护的整单冲销及关联更正单；账实差异通过库存盘点处理。示例订单金额不代表收入或收款。

## 文件职责

- `app/erp/page.tsx`：页面入口及标题。
- `app/erp/model.ts`：纯业务规则、校验、金额与示例数据。
- `app/erp/model.test.mjs`：出库一致性、状态流转、金额及初始化测试。
- `app/erp/verify-browser.mjs`：浏览器操作、响应式布局及真实 IndexedDB 事务验收。
- `app/erp/storage.ts`：IndexedDB 事务和备份导出数据源。
- `app/erp/ErpWorkspace.tsx`：导航、检索、表格、详情与操作调度。
- `app/erp/navigation.ts`：一级模块、二级页面及所属关系。
- `app/erp/ErpNavigation.tsx`：模块折叠菜单、当前页面和跨模块展开。
- `app/erp/ProductCatalog.tsx`：基础资料中的商品列表，以及对应库存跳转。
- `app/erp/ListFilters.tsx`：六个业务列表的筛选控件及日期错误提示。
- `app/erp/filters.ts`、`filters.test.mjs`：组合筛选、日期边界及旧商品状态兼容规则与验证。
- `app/erp/OrderEditor.tsx`：订单编辑表单。
- `app/erp/CustomerTable.tsx`：客户资料列表和编辑、关联订单入口。
- `app/erp/Dialog.tsx`：可键盘操作的原生模态对话框。
- `app/erp/erp.module.css`：独立响应式样式。

## 执行与验证

1. 先写核心业务行为测试，再实现业务模型。
2. 实现本地事务存储及示例工作区。
3. 实现销售、出库、库存、流水和前置资料表单。
4. 检查类型及新增代码规范，运行业务测试。
5. 启动预览，走查开单、出库、缺货、取消、刷新保留及窄屏布局。

使用现有本地依赖，无需新增依赖。构建前停止使用相同 `.next` 目录的预览服务，构建通过后重新启动。未请求发布到公网，本轮交付本地可运行版本。

## 采购入库实现

供应商与采购入库单在原工作区中增加 suppliers、receipts 集合，旧数据读取时补齐空集合，保留商品、订单、流水和序号。新增、确认和冲销均沿用同一 IndexedDB 读写事务，重新校验最新库存，失败整单回滚。

- PurchaseWorkspace.tsx：采购与供应商列表、详情、确认、取消、冲销、更正及资料维护。
- PurchaseEditor.tsx：采购草稿和快捷新建供应商、商品，未保存修改保护。
- OpeningSetup.tsx：旧商品的期初与零库存启用。新商品直接零库存就绪。
- purchase.test.mjs：采购业务规则；filters.test.mjs：销售、库存、基础资料及采购筛选；verify-purchase.mjs：采购完整操作、旧数据兼容及真实并发事务验收。

## 商品供货关联扩展

Product 追加可选 supplierIds 和 defaultSupplierId，兼容旧商品；资料校验在同一事务中验证供应商存在、停用及默认成员关系。ProductEditor.tsx 提供多选和默认配置，ProductCatalog 展示摘要，供应商反查使用稳定编号筛选。

PurchaseEditor 按供货关联分组推荐，已有单据或已经选定的供货方保持原值。Receipt 在确认时记录 temporaryProductIds，供货关联变化不回写入库历史。supplier-links.test.mjs 验证多对多、停用、默认值、临时采购和历史保护；verify-purchase.mjs 验证实际选择、跨页筛选、刷新和手机表单。

## 库存盘点扩展

Workspace 新增 counts 集合，原 schemaVersion=1 数据读取时补齐并写回，保留全部既有记录。StockCount 保存状态、修订号、备注、商品快照、账面数、实盘数、逐行最近流水编号、差异原因与历史。

save-count 验证数量、原因、重复商品、初始化及库存基准；草稿不改库存。confirm-count 在同一 IndexedDB 事务逐行检查 stock 与 baselineLedgerId，全部通过才整单更新商品、生成 count-gain/count-loss 流水并确认单据；零差异只确认结果。cancel-count 保留原草稿和原因。确认幂等；修订号防止并发旧页面编辑、确认、取消覆盖最新草稿。已停用商品允许盘点，单据引用锁定商品编码及单位。

- CountWorkspace.tsx：盘点列表、状态／商品／日期筛选、详情、复核勾选、确认、取消、未保存保护及流水跳转。
- CountEditor.tsx：空实盘输入、差异原因、逐行重读最新基准并清空实盘、修订变更提示、手机逐项表单。
- counts.test.mjs：旧数据、盘盈盘亏、零差异、停用及数量边界、整单回滚、库存净零变动、其他商品独立、修订冲突及历史快照。
- verify-counts.mjs：实际操作、来源追溯、筛选重置、迁移刷新、未保存保护、库存变动后复盘、真实事务并发和桌面／手机字号布局。

盘点数量在确认时间记账，不进行成本估值或历史回算。盘点单确认后只读，后续实物差异通过新盘点记录处理。


## 销售退货扩展

依据根目录 PRD-ERP销售退货方案.md。Workspace 增加 salesReturns，旧数据在同一 IndexedDB 事务补齐并持久保存，不重置已有集合。SalesReturn 保存来源订单和出库号、客户及商品快照、逐行数量和原因、可空实收日期、状态、修订号及操作历史。

model.ts 提供 save-sales-return、confirm-sales-return、cancel-sales-return；salesReturnQuantities 根据原订单和已入库退货推导可退量，salesReturnSummary 推导摘要，duplicateSalesReturns 对同原单／实收日期及无序商品数量组合提醒核对。草稿不预占；确认使用最新额度及库存，显式验收、日期、修订和来源均须有效，同单重试只返回既有结果。所有行先校验后生效，退货单、库存和 sale-return 流水一起写入，存储失败整单回滚。

- SalesReturnEditor.tsx：原单搜索、固定来源、空数量、逐行原因、实收日期、未保存和修订提示、手机逐项表单。
- SalesReturnWorkspace.tsx：列表组合筛选、详情、验收勾选、重复记录核对、取消及来源跳转。
- ErpWorkspace.tsx：销售退货调度、原订单创建入口／退货摘要及关联单据、退货流水优先返回退货详情。
- filters.ts、ListFilters.tsx：退货状态／客户／商品／创建日期／原订单来源，以及流水退货类型和来源筛选。
- sales-returns.test.mjs：部分分次、额度、整单失败、来源、日期、数量、修订、停用与快照、无序查重、盘点净零失效及组合筛选。
- verify-sales-returns.mjs：独立 Chrome 真实 UI 与 IndexedDB 验收、旧数据补齐、手机录入和验收、疑似重复勾选、并发幂等与可退额度竞争、模拟存储失败回滚、最小字号和跨页追溯。

流水携带 salesReturnId 与 orderId；原订单及销售负数流水保留，退款与成本不计算。新增退货流水自动参与现有盘点基准。新集合随工作区 JSON 导出；多标签刷新沿用已有机制。


## 采购退货扩展

依据根目录 PRD-ERP采购退货方案.md。Workspace 新增 purchaseReturns，缺失旧集合在 IndexedDB 事务中补齐并持久保存，不重置既有记录。PurchaseReturn 保存原入库 ID／单号、供应商与原送货单号快照、退货日期、逐行商品快照／数量／原因、状态、修订号、时间及历史。

model.ts 增加 save-purchase-return、confirm-purchase-return、cancel-purchase-return。purchaseReturnQuantities、purchaseReturnSummary、duplicatePurchaseReturns 推导来源额度、原单摘要及无序组合查重。保存可缺货，确认按最新额度和余额整单验证，要求显式 handedOver。reverse-receipt 同时校验实际采购退货，避免双重扣减；冲销先成功时旧退货草稿不能确认但可取消。停用历史商品与供应商仍可退回，快照及基础资料关系保留。

- PurchaseReturnEditor.tsx：原单搜索、固定来源／供应商、空数量、逐行原因、实际退货日期、来源额度与库存提示、修订和未保存保护、手机逐项表单。
- PurchaseReturnWorkspace.tsx：列表、筛选、详情、交接勾选、重复核对、取消、原入库／库存／流水／供应商退货入口。
- PurchaseWorkspace.tsx：供应商反查、原入库退货摘要及关联单据、创建与冲销禁用提示。
- ErpWorkspace.tsx、navigation.ts、filters.ts、ListFilters.tsx：第十一页、来源条件、采购退货流水和优先返回退货详情。
- purchase-returns.test.mjs：来源与库存校验、部分分次、冲销互斥及更正来源、修订、停用快照、日期、无序重复、盘点净零保护及筛选。
- verify-purchase-returns.mjs：独立 Chrome 实际页面、旧数据持久化、缺货草稿、手机完整出库、追溯及筛选；真实 IndexedDB 同单幂等、同源额度与不同源库存竞争、双向冲销竞态、模拟存储失败回滚。

purchase-return 负数流水保留 purchaseReturnId 与 receiptId、业务及记账时间，不改原入库正数流水和金额。退货集合随 JSON 备份导出，多标签刷新沿用现有机制，流水参与现有盘点基准。
