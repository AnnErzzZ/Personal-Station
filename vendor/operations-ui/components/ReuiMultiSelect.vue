<template>
  <div ref="rootRef" class="reui-multi-select" :class="{ 'is-open': open }">
    <button
      type="button"
      class="reui-multi-select__trigger"
      :aria-expanded="open"
      aria-haspopup="listbox"
      @click="open = !open"
      @keydown.down.prevent="open = true"
      @keydown.esc.prevent="open = false"
    >
      <span
        class="reui-multi-select__value"
        :class="{ 'is-placeholder': modelValue.length === 0 }"
      >
        {{ displayValue }}
      </span>
      <span v-if="modelValue.length > 1" class="reui-multi-select__count">
        {{ modelValue.length }}
      </span>
      <svg
        class="reui-multi-select__chevron"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="m4.5 6 3.5 3.5L11.5 6"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>

    <Transition name="reui-select-popover">
      <div v-if="open" class="reui-multi-select__content">
        <div class="reui-multi-select__group" role="listbox" aria-multiselectable="true">
          <button
            v-for="item in options"
            :key="String(item.value)"
            type="button"
            class="reui-multi-select__item"
            :class="{ 'is-selected': isSelected(item.value) }"
            role="option"
            :aria-selected="isSelected(item.value)"
            @click="toggleValue(item.value)"
          >
            <span class="reui-multi-select__checkbox" aria-hidden="true">
              <svg v-if="isSelected(item.value)" viewBox="0 0 14 14" fill="none">
                <path
                  d="m3 7.1 2.45 2.45L11 4"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </span>
            <span>{{ item.label }}</span>
          </button>
        </div>
        <div v-if="modelValue.length > 0" class="reui-multi-select__footer">
          <span>已选择 {{ modelValue.length }} 项</span>
          <button type="button" @click="clearSelection">清空</button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

type SelectValue = string | number

interface SelectOption {
  label: string
  value: SelectValue
}

const props = withDefaults(
  defineProps<{
    modelValue: SelectValue[]
    options: SelectOption[]
    placeholder?: string
  }>(),
  {
    placeholder: '请选择'
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: SelectValue[]]
}>()

const rootRef = ref<HTMLElement | null>(null)
const open = ref(false)

const displayValue = computed(() => {
  if (props.modelValue.length === 0) return props.placeholder
  if (props.modelValue.length === 1) {
    return props.options.find((item) => Object.is(item.value, props.modelValue[0]))?.label || '已选择 1 项'
  }
  return `已选择 ${props.modelValue.length} 项`
})

const isSelected = (value: SelectValue) =>
  props.modelValue.some((selectedValue) => Object.is(selectedValue, value))

const toggleValue = (value: SelectValue) => {
  const nextValue = isSelected(value)
    ? props.modelValue.filter((selectedValue) => !Object.is(selectedValue, value))
    : [...props.modelValue, value]
  emit('update:modelValue', nextValue)
}

const clearSelection = () => {
  emit('update:modelValue', [])
}

const handleOutsidePointer = (event: PointerEvent) => {
  if (!rootRef.value?.contains(event.target as Node)) {
    open.value = false
  }
}

onMounted(() => {
  document.addEventListener('pointerdown', handleOutsidePointer)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleOutsidePointer)
})
</script>

<style scoped>
.reui-multi-select {
  position: relative;
  width: 100%;
  color: #18181b;
}

.reui-multi-select__trigger {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 38px;
  padding: 7px 10px 7px 12px;
  border: 1px solid #e4e4e7;
  border-radius: 7px;
  background: #fff;
  color: #18181b;
  font: inherit;
  text-align: left;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(24, 24, 27, 0.03);
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    background-color 0.15s ease;
}

.reui-multi-select__trigger:hover {
  border-color: #d4d4d8;
  background: #fdfdfd;
}

.reui-multi-select.is-open .reui-multi-select__trigger {
  border-color: #a1a1aa;
  box-shadow:
    0 0 0 3px rgba(161, 161, 170, 0.16),
    0 1px 2px rgba(24, 24, 27, 0.04);
}

.reui-multi-select__value {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  color: #27272a;
  font-size: 13px;
  font-weight: 520;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.reui-multi-select__value.is-placeholder {
  color: #a1a1aa;
  font-weight: 400;
}

.reui-multi-select__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  margin-left: 8px;
  padding: 0 6px;
  border-radius: 999px;
  background: #f4f4f5;
  color: #52525b;
  font-size: 11px;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
}

.reui-multi-select__chevron {
  width: 16px;
  height: 16px;
  margin-left: 6px;
  color: #71717a;
  transition: transform 0.18s ease;
}

.reui-multi-select.is-open .reui-multi-select__chevron {
  transform: rotate(180deg);
}

.reui-multi-select__content {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 80;
  width: max(100%, 210px);
  overflow: hidden;
  padding: 5px;
  border: 1px solid #e4e4e7;
  border-radius: 9px;
  background: #fff;
  box-shadow:
    0 12px 32px rgba(24, 24, 27, 0.12),
    0 2px 8px rgba(24, 24, 27, 0.06);
  transform-origin: top center;
}

.reui-multi-select__group {
  display: flex;
  max-height: 248px;
  flex-direction: column;
  gap: 2px;
  overflow-y: auto;
}

.reui-multi-select__item {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  min-height: 34px;
  padding: 6px 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #3f3f46;
  font: inherit;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}

.reui-multi-select__item:hover,
.reui-multi-select__item.is-selected {
  background: #f4f4f5;
  color: #18181b;
}

.reui-multi-select__checkbox {
  display: inline-flex;
  flex: 0 0 16px;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border: 1px solid #d4d4d8;
  border-radius: 4px;
  background: #fff;
  color: #fff;
}

.reui-multi-select__checkbox svg {
  width: 12px;
  height: 12px;
}

.reui-multi-select__item.is-selected .reui-multi-select__checkbox {
  border-color: #18181b;
  background: #18181b;
}

.reui-multi-select__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 5px -5px -5px;
  padding: 8px 10px;
  border-top: 1px solid #f0f0f1;
  color: #71717a;
  font-size: 11px;
}

.reui-multi-select__footer button {
  padding: 2px 4px;
  border: 0;
  background: transparent;
  color: #3f3f46;
  font: inherit;
  font-weight: 620;
  cursor: pointer;
}

.reui-select-popover-enter-active,
.reui-select-popover-leave-active {
  transition:
    opacity 0.14s ease,
    transform 0.14s ease;
}

.reui-select-popover-enter-from,
.reui-select-popover-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.985);
}
</style>
