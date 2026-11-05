<script setup lang="ts" generic="T extends Record<string, any>">
import LoadingSpinner from './LoadingSpinner.vue'

export interface DataTableColumn<T> {
	key: string
	label: string
	render?: (row: T) => string | number | null | undefined
	width?: string
	className?: string
}

withDefaults(
	defineProps<{
		columns: DataTableColumn<T>[]
		rows: T[]
		loading?: boolean
		empty?: string
		showActions?: boolean
		canEdit?: (row: T) => boolean
		canDelete?: (row: T) => boolean
	}>(),
	{
		loading: false,
		empty: 'No data',
		showActions: true,
	},
)

defineEmits<{
	(e: 'edit', row: T): void
	(e: 'delete', row: T): void
}>()
</script>

<template>
	<div class="card overflow-hidden">
		<div class="overflow-x-auto">
			<table class="w-full text-sm">
				<thead class="bg-white/5 text-left text-brand-gray-400">
					<tr>
						<th
							v-for="c in columns"
							:key="c.key"
							class="px-4 py-3 font-medium uppercase text-xs tracking-wider"
							:style="c.width ? { width: c.width } : undefined"
						>
							{{ c.label }}
						</th>
						<th v-if="showActions" class="px-4 py-3 font-medium uppercase text-xs tracking-wider text-right">
							Actions
						</th>
					</tr>
				</thead>
				<tbody>
					<tr v-if="loading">
						<td :colspan="columns.length + (showActions ? 1 : 0)">
							<LoadingSpinner />
						</td>
					</tr>
					<tr v-else-if="rows.length === 0">
						<td
							:colspan="columns.length + (showActions ? 1 : 0)"
							class="px-4 py-12 text-center text-brand-gray-500"
						>
							{{ empty }}
						</td>
					</tr>
					<tr
						v-for="(row, i) in rows"
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
							<template v-if="c.render">{{ c.render(row) }}</template>
							<template v-else>{{ row[c.key] }}</template>
						</td>
						<td v-if="showActions" class="px-4 py-3 text-right whitespace-nowrap">
							<button
								v-if="!canEdit || canEdit(row)"
								class="px-3 py-1 text-xs rounded-md text-brand-blueLight hover:bg-brand-blue/10 mr-1"
								@click="$emit('edit', row)"
							>
								Edit
							</button>
							<button
								v-if="!canDelete || canDelete(row)"
								class="px-3 py-1 text-xs rounded-md text-red-400 hover:bg-red-500/10"
								@click="$emit('delete', row)"
							>
								Delete
							</button>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>
</template>
