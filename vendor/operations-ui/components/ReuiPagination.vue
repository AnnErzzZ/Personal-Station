<template>
  <nav class="reui-pagination-card" aria-label="分页导航">
    <div class="reui-pagination">
      <button
        type="button"
        class="reui-pagination__link reui-pagination__link--icon"
        :disabled="page <= 1"
        aria-label="上一页"
        @click="selectPage(page - 1)"
      >
        <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="m10 3.5-4.5 4.5 4.5 4.5"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>

      <template v-for="item in pageItems" :key="item">
        <span v-if="typeof item === 'string'" class="reui-pagination__ellipsis" aria-hidden="true">
          <span></span><span></span><span></span>
        </span>
        <button
          v-else
          type="button"
          class="reui-pagination__link"
          :class="{ 'is-active': item === page }"
          :aria-current="item === page ? 'page' : undefined"
          :aria-label="`第 ${item} 页`"
          @click="selectPage(item)"
        >
          {{ item }}
        </button>
      </template>

      <button
        type="button"
        class="reui-pagination__link reui-pagination__link--icon"
        :disabled="page >= totalPages"
        aria-label="下一页"
        @click="selectPage(page + 1)"
      >
        <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="m6 3.5 4.5 4.5L6 12.5"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  page: number
  total: number
  pageSize: number
}>()

const emit = defineEmits<{
  'update:page': [page: number]
}>()

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))

const pageItems = computed<Array<number | string>>(() => {
  const lastPage = totalPages.value
  if (lastPage <= 7) {
    return Array.from({ length: lastPage }, (_, index) => index + 1)
  }

  if (props.page <= 4) {
    return [1, 2, 3, 4, 5, 'ellipsis-end', lastPage]
  }

  if (props.page >= lastPage - 3) {
    return [
      1,
      'ellipsis-start',
      lastPage - 4,
      lastPage - 3,
      lastPage - 2,
      lastPage - 1,
      lastPage
    ]
  }

  return [
    1,
    'ellipsis-start',
    props.page - 1,
    props.page,
    props.page + 1,
    'ellipsis-end',
    lastPage
  ]
})

const selectPage = (nextPage: number) => {
  if (nextPage < 1 || nextPage > totalPages.value || nextPage === props.page) return
  emit('update:page', nextPage)
}
</script>

<style scoped>
.reui-pagination-card {
  display: inline-flex;
  padding: 4px;
  border: 1px solid #e4e4e7;
  border-radius: 999px;
  background: #fff;
  box-shadow: 0 1px 2px rgba(24, 24, 27, 0.04);
}

.reui-pagination {
  display: flex;
  align-items: center;
  gap: 2px;
}

.reui-pagination__link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
  padding: 0 9px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: #52525b;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    color 0.15s ease,
    transform 0.15s ease;
}

.reui-pagination__link:hover:not(:disabled):not(.is-active) {
  background: #f4f4f5;
  color: #18181b;
}

.reui-pagination__link:active:not(:disabled) {
  transform: scale(0.94);
}

.reui-pagination__link.is-active {
  background: #18181b;
  color: #fff;
  box-shadow: 0 2px 6px rgba(24, 24, 27, 0.18);
}

.reui-pagination__link:disabled {
  color: #d4d4d8;
  cursor: not-allowed;
}

.reui-pagination__link--icon {
  width: 32px;
  min-width: 32px;
  padding: 0;
}

.reui-pagination__link--icon svg {
  width: 16px;
  height: 16px;
}

.reui-pagination__ellipsis {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  width: 28px;
  height: 32px;
  color: #a1a1aa;
}

.reui-pagination__ellipsis span {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: currentColor;
}

@media (max-width: 720px) {
  .reui-pagination-card {
    max-width: 100%;
    overflow-x: auto;
    border-radius: 10px;
  }
}
</style>
