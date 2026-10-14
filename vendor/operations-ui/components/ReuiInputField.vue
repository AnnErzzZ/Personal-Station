<template>
  <label class="reui-input-field" :for="inputId">
    <span class="reui-input-field__label">{{ label }}</span>
    <span class="reui-input-field__control">
      <input
        :id="inputId"
        :value="modelValue"
        type="text"
        :placeholder="placeholder"
        @input="updateValue"
      />
      <button
        v-if="clearable && modelValue"
        type="button"
        class="reui-input-field__clear"
        aria-label="清空项目名称"
        @click.prevent="emit('update:modelValue', '')"
      >
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="m4.5 4.5 7 7m0-7-7 7" />
        </svg>
      </button>
    </span>
  </label>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    modelValue: string
    label: string
    placeholder?: string
    inputId?: string
    clearable?: boolean
  }>(),
  {
    placeholder: '',
    inputId: 'reui-input-field',
    clearable: false
  }
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void
}>()

const updateValue = (event: Event) => {
  emit('update:modelValue', (event.target as HTMLInputElement).value)
}
</script>

<style scoped>
.reui-input-field {
  display: flex;
  width: 100%;
  min-width: 0;
  flex-direction: column;
  align-items: flex-start;
}

.reui-input-field__label {
  margin-bottom: 7px;
  color: #334155;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.2;
  white-space: nowrap;
}

.reui-input-field__control {
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
}

.reui-input-field__control input {
  width: 100%;
  height: 38px;
  padding: 0 34px 0 12px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  outline: none;
  background: #fff;
  color: #18181b;
  font: inherit;
  font-size: 13px;
  transition:
    border-color 0.16s ease,
    box-shadow 0.16s ease;
}

.reui-input-field__control input::placeholder {
  color: #a8abb2;
}

.reui-input-field__control input:hover {
  border-color: #c0c4cc;
}

.reui-input-field__control input:focus-visible {
  border-color: #10b981;
  box-shadow: 0 0 0 3px rgb(16 185 129 / 18%);
}

.reui-input-field__clear {
  position: absolute;
  right: 9px;
  display: inline-flex;
  width: 20px;
  height: 20px;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: #a1a1aa;
  cursor: pointer;
}

.reui-input-field__clear:hover {
  background: #f4f4f5;
  color: #52525b;
}

.reui-input-field__clear svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-width: 1.6;
}
</style>
