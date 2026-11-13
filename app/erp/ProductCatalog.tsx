import { IconArrowRight, IconPackage } from '@tabler/icons-react';
import { money, type Product, type Supplier } from './model';
import s from './erp.module.css';

export default function ProductCatalog({ products, suppliers, busy, onStock, onInitialize, onEdit, onToggle }: { products: Product[]; suppliers: Supplier[]; busy: boolean; onStock: (product: Product) => void; onInitialize: (id: string) => void; onEdit: (id: string) => void; onToggle: (id: string) => void }) {
  return <>
    <div className={s.tableScroll}>
      <table className={s.dataTable}>
        <thead><tr><th>商品名称 / 编码</th><th>销售单位</th><th className={s.numeric}>参考售价</th><th>关联供应商</th><th>启用状态</th><th>库存准备</th><th className={s.right}>操作</th></tr></thead>
        <tbody>{products.map(product => <tr key={product.id}>
          <td><div className={s.productInfo}><span className={s.productIcon}><IconPackage size={21} stroke={1.5} /></span><div><strong>{product.name}</strong><small>{product.sku}</small></div></div></td>
          <td>{product.unit}</td><td className={s.numeric}>{money(product.priceCents)}</td>
          <td><span className={s.supplierNames}>{product.supplierIds?.length ? product.defaultSupplierId ? `${suppliers.find(s => s.id === product.defaultSupplierId)?.name ?? '未知供应商'}（默认${suppliers.find(s => s.id === product.defaultSupplierId)?.active === false ? '，已停用' : ''}）` : '未设置默认' : '尚未关联'}</span>{Boolean(product.supplierIds?.length) && <small className={s.supplierNames}>{product.supplierIds!.map(id => suppliers.find(s => s.id === id)?.name ?? '未知供应商').join('、')}</small>}</td>
          <td><span className={`${s.status} ${product.active === false ? s.cancelled : s.shipped}`}>{product.active === false ? '已停用' : '已启用'}</span></td>
          <td><span className={`${s.status} ${product.initialized ? s.shipped : s.draft}`}>{product.initialized ? '已就绪' : '待设置'}</span></td>
          <td className={s.right}><div className={s.customerActions}>
            <button type="button" className={s.textButton} disabled={busy} aria-label={`编辑商品 ${product.name}`} onClick={() => onEdit(product.id)}>编辑</button>
            <button type="button" className={s.textButton} disabled={busy} aria-label={`${product.active === false ? '启用' : '停用'}商品 ${product.name}`} onClick={() => onToggle(product.id)}>{product.active === false ? '启用' : '停用'}</button>
            {product.initialized ? <button type="button" className={s.textButton} onClick={() => onStock(product)}>查看库存<IconArrowRight size={15} /></button> : <button type="button" className={s.textButton} disabled={busy} onClick={() => onInitialize(product.id)}>期初设置</button>}
          </div></td>
        </tr>)}</tbody>
      </table>
    </div>
    {!products.length && <div className={s.empty}><span><IconPackage size={28} stroke={1.4} /></span><h3>没有符合条件的商品</h3><p>调整搜索条件，或新增商品资料。</p></div>}
  </>;
}
