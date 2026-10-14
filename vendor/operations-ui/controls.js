import { createApp, h, shallowReactive } from 'vue'
import { ElConfigProvider, ElSelect, ElOption, ElAutocomplete, ElDatePicker, ElUpload, ElButton } from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn.mjs'
import 'element-plus/dist/index.css'
import ReuiMultiSelect from './components/ReuiMultiSelect.vue'
import ReuiInputField from './components/ReuiInputField.vue'
import ReuiPagination from './components/ReuiPagination.vue'
import ProjectTable from './components/ProjectTable.vue'
import './theme.css'

// The React page owns business state; the original Vue components own their controls.
export function mount(element, initial, notify) {
  const state = shallowReactive({ ...initial })
  const emit = (value) => notify(value)
  const popup = { teleported: true, popperClass: 'ops-original-popper', appendTo: document.body }
  const render = () => {
    const p = state
    if (p.kind === 'project-table') return h(ProjectTable, { rows: p.rows, expanded: p.expanded, offset: p.offset, sort: p.sort, sortField: p.sortField, sprite: p.sprite, onAction: emit })
    if (p.kind === 'multi') return h(ReuiMultiSelect, { options: p.options, modelValue: p.value, placeholder: p.placeholder ?? '全部', 'onUpdate:modelValue': emit })
    if (p.kind === 'input') return h(ReuiInputField, { modelValue: p.value, label: p.label, inputId: p.id, placeholder: p.placeholder, clearable: true, 'onUpdate:modelValue': emit })
    if (p.kind === 'pagination') return h(ReuiPagination, { page: p.page, total: p.total, pageSize: p.pageSize, 'onUpdate:page': emit })
    if (p.kind === 'select') return h(ElSelect, { ...popup, modelValue: p.value, disabled: p.disabled, clearable: p.clearable ?? false, filterable: p.filterable ?? false, placeholder: p.placeholder, 'aria-label': p.label, 'onUpdate:modelValue': value => emit(value ?? '') }, () => (p.options ?? []).map(option => h(ElOption, { key: option.value, label: option.label, value: option.value })))
    if (p.kind === 'person') return h('div', [h(ElAutocomplete, { ...popup, modelValue: p.value ?? '', disabled: p.disabled, placeholder: p.placeholder, 'aria-label': p.label, triggerOnFocus: true, clearable: false, highlightFirstItem: true, debounce: 80,
      fetchSuggestions(query, callback) { const needle = query === p.selectedName ? '' : query.trim().toLowerCase(); const results = (p.options ?? []).filter(item => `${item.name} ${item.phone} ${item.id} ${item.team}`.toLowerCase().includes(needle)).map(item => ({ ...item, value: item.name })); state.emptySearch = !results.length; callback(results) },
      'onUpdate:modelValue': value => { state.value = value },
      onFocus: event => event.target.select(), onKeydown: event => { if (event.key === 'Escape') { state.value = p.selectedName ?? ''; state.emptySearch = false } },
      onSelect: item => { state.emptySearch = false; emit(item.id) }, onBlur: () => { state.value = p.selectedName ?? ''; state.emptySearch = false },
    }, { default: ({ item }) => h('div', { class: 'ops-person-option' }, [h('strong', item.name), h('small', `${item.team} · ${item.phone} · ${item.id}`)]) }), p.emptySearch ? h('p', { class: 'ops-search-empty', role: 'status' }, '没有找到这位人员，请换个姓名、手机号或工号搜索。') : null])
    if (p.kind === 'date' || p.kind === 'month') return h(ElDatePicker, { ...popup, modelValue: p.value || null, type: p.kind, valueFormat: p.kind === 'month' ? 'YYYY-MM' : 'YYYY-MM-DD', format: p.kind === 'month' ? 'YYYY年MM月' : 'YYYY-MM-DD', placeholder: p.placeholder ?? '请选择', editable: false, 'aria-label': p.label, 'onUpdate:modelValue': value => emit(value ?? '') })
    if (p.kind === 'upload') return h(ElUpload, { disabled: p.disabled, multiple: true, autoUpload: false, fileList: (p.value ?? []).map((name, index) => ({ name, uid: index + 1, status: 'success' })), onChange: (_file, list) => emit([...new Set(list.map(item => item.name))]), onRemove: file => emit((p.value ?? []).filter(name => name !== file.name)) }, { default: () => p.disabled ? null : h(ElButton, { class: 'ops-attachment-add', 'aria-label': '添加附件', title: '添加附件' }, () => h('img', { src: p.addIcon, alt: '', width: 22, height: 22, 'aria-hidden': 'true' })) })
  }
  const app = createApp({ render: () => h(ElConfigProvider, { locale: zhCn, zIndex: 100 }, { default: render }) })
  app.mount(element)
  return { update(props) {
    // Scrolling the case may rerender React while someone is typing a name.
    if (props.kind === 'person' && props.selectedName === state.selectedName && props.disabled === state.disabled) {
      const { value: _value, ...rest } = props
      Object.assign(state, rest)
    } else Object.assign(state, props)
  }, destroy() { app.unmount() } }
}
