<template>
  <ElTable class="ops-project-table" :data="rows" row-key="id" :expand-row-keys="expanded ? [expanded] : []"
    :row-class-name="({ row }) => row.id === expanded ? 'ops-project-expanded' : ''" empty-text="没有符合筛选条件的项目" table-layout="fixed">
    <ElTableColumn type="expand" width="1" class-name="ops-expand-slot">
      <template #default="{ row }">
        <section class="ops-project-detail" :aria-label="`${row.name}异常工单明细`">
          <div class="ops-detail-heading"><strong>异常工单明细</strong><span>{{ row.name }} · {{ row.orders }} 单</span></div>
          <ElTable class="ops-detail-table" :data="detailRows(row)" table-layout="fixed">
            <ElTableColumn prop="type" label="异常类型" min-width="130" />
            <ElTableColumn label="健康度扣分" min-width="100"><template #default="{ row: item }"><span class="ops-deduction">−{{ item.deduction }}</span></template></ElTableColumn>
            <ElTableColumn prop="count" label="工单数量" min-width="85" />
            <ElTableColumn label="最近更新时间" min-width="135"><template #default>10-08 09:00</template></ElTableColumn>
            <ElTableColumn label="工单完成状态" min-width="155"><template #default="{ row: item }"><div class="ops-order-progress"><span class="ops-progress-track"><i :style="{ width: `${item.completed / Number(item.count) * 100}%` }" /></span><span>{{ item.progress }}</span></div></template></ElTableColumn>
            <ElTableColumn label="查看详情" width="108"><template #default><a class="ops-table-action" href="#ownership">查看详情<svg aria-hidden="true" width="14" height="14" viewBox="0 0 18 18"><use :href="`${sprite}#arrow-right`" /></svg></a></template></ElTableColumn>
          </ElTable>
        </section>
      </template>
    </ElTableColumn>
    <ElTableColumn label="序号" width="58"><template #default="{ $index }">{{ String(offset + $index + 1).padStart(2, '0') }}</template></ElTableColumn>
    <ElTableColumn label="项目名称" min-width="160"><template #default="{ row }"><div class="ops-project-name"><strong>{{ row.name }}</strong><small>项目编号 {{ row.id }}</small></div></template></ElTableColumn>
    <ElTableColumn v-for="column in sortColumns" :key="column.field" :label="column.label" min-width="130">
      <template #header><button type="button" class="ops-table-sort" :aria-label="`${column.label}排序：${direction(column.field) === 'ascending' ? '升序' : direction(column.field) === 'descending' ? '降序' : '默认'}`" @click="emit('action', { type: 'sort', field: column.field })">{{ column.label }}<svg width="14" height="14" viewBox="0 0 18 18" aria-hidden="true" :data-nucleo-sort="direction(column.field)"><use :href="`${sprite}#sort-up`" :style="{ color: direction(column.field) === 'ascending' ? '#2054ff' : '#7a8494' }" /><use :href="`${sprite}#sort-down`" :style="{ color: direction(column.field) === 'descending' ? '#2054ff' : '#7a8494' }" /></svg></button></template>
      <template #default="{ row }"><template v-if="column.field === 'score'"><div class="ops-health" :data-tone="row.score < 60 ? 'red' : row.score < 70 ? 'amber' : 'blue'"><span>{{ row.score }}</span><small>· {{ row.healthLabel }}</small></div><span class="ops-health-track"><i :style="{ width: `${row.score}%`, background: row.score < 60 ? '#bf4034' : row.score < 70 ? '#a96820' : '#35678a' }" /></span></template><template v-else>{{ row.orders }} 单</template></template>
    </ElTableColumn>
    <ElTableColumn prop="system" label="项目系统" min-width="90" />
    <ElTableColumn prop="category" label="项目分类" min-width="105" />
    <ElTableColumn prop="belong" label="项目归属" min-width="95" />
    <ElTableColumn prop="deploy" label="部署方式" min-width="115" />
    <ElTableColumn label="操作" width="94" fixed="right"><template #default="{ row }"><button type="button" class="ops-table-action" :aria-expanded="row.id === expanded" :aria-label="`${row.id === expanded ? '收起' : '展开'}${row.name}异常明细`" @click="emit('action', { type: 'expand', id: row.id })">{{ row.id === expanded ? '收起' : '展开' }}<svg aria-hidden="true" width="14" height="14" viewBox="0 0 18 18" :style="{ transform: row.id === expanded ? 'rotate(90deg)' : 'none' }"><use :href="`${sprite}#chevron-right`" /></svg></button></template></ElTableColumn>
  </ElTable>
</template>

<script setup>
import { ElTable, ElTableColumn } from 'element-plus'
const props = defineProps({ rows: { type: Array, default: () => [] }, expanded: String, offset: { type: Number, default: 0 }, sort: Number, sortField: String, sprite: String })
const emit = defineEmits(['action'])
const sortColumns = [{ field: 'score', label: '项目健康度' }, { field: 'orders', label: '工单数量' }]
const direction = field => props.sortField === field && props.sort === 1 ? 'ascending' : props.sortField === field && props.sort === 2 ? 'descending' : 'none'
const detailRows = row => row.details.map(([type, deduction, count, progress]) => ({ type, deduction, count, progress, completed: Number(String(progress).split('/')[0].trim()) }))
</script>
