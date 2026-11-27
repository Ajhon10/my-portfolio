<script setup lang="ts" generic="T extends Record<string, any>">
import LoadingSpinner from './LoadingSpinner.vue'
import TablePagination from './TablePagination.vue'
import { computed, ref, watch } from 'vue'

export interface DataTableColumn<T> {
	key: string
	label: string
	render?: (row: T) => string | number | null | undefined
	width?: string
	className?: string
}

const props = withDefaults(
	defineProps<{
		columns: DataTableColumn<T>[]
		rows: T[]
		loading?: boolean
		empty?: string
		label?: string
		showActions?: boolean
		actionsDisabled?: boolean
		pagination?: { page: number; hasNext: boolean }
		canEdit?: (row: T) => boolean
		canDelete?: (row: T) => boolean
	}>(),
	{
		loading: false,
		empty: 'No data',
		showActions: true,
	},
)

const emit = defineEmits<{
	(e: 'edit', row: T): void
	(e: 'delete', row: T): void
	(e: 'pageChange', page: number): void
}>()

const pageSize = 10
const localPage = ref(1)
const pageCount = computed(() => Math.max(1, Math.ceil(props.rows.length / pageSize)))
const page = computed(() => props.pagination?.page ?? localPage.value)
const hasNext = computed(() => props.pagination?.hasNext ?? page.value < pageCount.value)
const visibleRows = computed(() => {
	if (props.pagination) return props.rows
	const start = (page.value - 1) * pageSize
	return props.rows.slice(start, start + pageSize)
})
watch(pageCount, (count) => {
	localPage.value = Math.min(localPage.value, count)
})

function changePage(next: number) {
	if (props.pagination) emit('pageChange', next)
	else localPage.value = next
}
</script>

<template>
	<div class="card overflow-hidden">
		<div
			class="overflow-x-auto focus-visible:-outline-offset-2"
			tabindex="0"
			role="region"
			:aria-label="label ?? 'Table results'"
		>
			<table class="w-full text-sm" :aria-label="label" :aria-busy="loading || undefined">
				<thead class="bg-white/5 text-left text-brand-gray-400">
					<tr>
						<th
							v-for="c in columns"
							:key="c.key"
							scope="col"
							class="px-4 py-3 font-medium uppercase text-xs tracking-wider"
							:style="c.width ? { width: c.width } : undefined"
						>
							{{ c.label }}
						</th>
						<th
							v-if="showActions"
							scope="col"
							class="px-4 py-3 font-medium uppercase text-xs tracking-wider text-right"
						>
							Actions
						</th>
					</tr>
				</thead>
				<tbody>
					<tr v-if="loading && rows.length === 0">
						<td :colspan="columns.length + (showActions ? 1 : 0)">
							<LoadingSpinner />
						</td>
					</tr>
					<tr v-else-if="rows.length === 0">
						<td :colspan="columns.length + (showActions ? 1 : 0)" class="px-4 py-12 text-center text-brand-gray-500">
							{{ empty }}
						</td>
					</tr>
					<tr
						v-for="(row, i) in visibleRows"
						v-else
						:key="row.id ?? i"
						class="border-t border-white/5 hover:bg-white/[0.02] transition"
					>
						<td
							v-for="c in columns"
							:key="c.key"
							class="px-4 py-3 text-brand-gray-200 align-middle"
							:class="c.className"
						>
							<slot :name="`cell-${c.key}`" :row="row">
								{{ c.render ? c.render(row) : row[c.key] }}
							</slot>
						</td>
						<td v-if="showActions" class="px-4 py-3 text-right whitespace-nowrap">
							<button
								v-if="!canEdit || canEdit(row)"
								type="button"
								:disabled="loading || actionsDisabled"
								class="min-h-8 px-3 py-1 text-xs rounded-md text-brand-blueLight hover:bg-brand-blue/10 mr-1 disabled:opacity-60"
								@click="$emit('edit', row)"
							>
								Edit
							</button>
							<button
								v-if="!canDelete || canDelete(row)"
								type="button"
								:disabled="loading || actionsDisabled"
								class="min-h-8 px-3 py-1 text-xs rounded-md text-[color:var(--folio-error)] hover:bg-red-500/10 disabled:opacity-60"
								@click="$emit('delete', row)"
							>
								Delete
							</button>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
		<TablePagination
			:page="page"
			:page-count="pagination ? undefined : pageCount"
			:has-next="hasNext"
			:disabled="loading || actionsDisabled"
			@change="changePage"
		/>
	</div>
</template>
