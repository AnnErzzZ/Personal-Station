import { IconArrowRight, IconUsers } from '@tabler/icons-react';
import { money, orderTotal, type Customer, type Workspace } from './model';
import s from './erp.module.css';

export default function CustomerTable({ data, customers, onEdit, onOrders }: { data: Workspace; customers: Customer[]; onEdit: (id: string) => void; onOrders: (id: string) => void }) {
  return <>
    <div className={s.tableScroll}>
      <table className={s.dataTable}>
        <thead><tr><th>客户名称 / 编号</th><th>联系人</th><th>联系电话</th><th className={s.numeric}>关联订单</th><th className={s.numeric}>有效订单金额</th><th className={s.right}>操作</th></tr></thead>
        <tbody>{customers.map(customer => {
          const orders = data.orders.filter(order => order.customerId === customer.id);
          const amount = orders.filter(order => order.status === 'pending' || order.status === 'shipped').reduce((sum, order) => sum + orderTotal(order), 0);
          return <tr key={customer.id}>
            <td><div className={s.productInfo}><span className={s.productIcon}><IconUsers size={20} stroke={1.5} /></span><div><strong>{customer.name}</strong><small>{customer.id}</small></div></div></td>
            <td>{customer.contact || '未填写'}</td>
            <td>{customer.phone || '未填写'}</td>
            <td className={s.numeric}>{orders.length} 笔</td>
            <td className={s.numeric}>{money(amount)}</td>
            <td className={s.right}><div className={s.customerActions}><button type="button" className={s.textButton} onClick={() => onEdit(customer.id)} aria-label={`编辑客户 ${customer.name}`}>编辑</button><button type="button" className={s.textButton} onClick={() => onOrders(customer.id)} aria-label={`查看客户 ${customer.name} 的订单`}>查看订单<IconArrowRight size={15} /></button></div></td>
          </tr>;
        })}</tbody>
      </table>
    </div>
    {!customers.length && <div className={s.empty}><span><IconUsers size={28} stroke={1.4} /></span><h3>没有符合条件的客户</h3><p>可以按客户名称、编号、联系人或电话搜索，也可以新增客户。</p></div>}
  </>;
}
