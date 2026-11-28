<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import DataTable, { type DataTableColumn } from '@/components/DataTable.vue'
import FormInput from '@/components/FormInput.vue'
import FormSelect from '@/components/FormSelect.vue'
import { useShopProvider, type ShopCategory, type ShopSubcategory } from '@/composables/provider/shop.provider'
import { onContentUndo } from '@/composables/useContentUndo'

const props = defineProps<{ mode: 'categories' | 'subcategories' }>()
type OptionRow = ShopCategory & { categoryId?: string; parent?: string }
const provider = useShopProvider()
const groups = ref<ShopCategory[]>([])
const children = ref<ShopSubcategory[]>([])
const loading = ref(true)
const failed = ref(false)
const busy = ref(false)
const search = ref('')
const filter = ref('')
const editor = ref(false)
const editing = ref<OptionRow>()
const removing = ref<OptionRow>()
const name = ref('')
const parent = ref('')
const isChild = computed(() => props.mode === 'subcategories')
const noun = computed(() => (isChild.value ? 'subcategory' : 'category'))
const groupOptions = computed(() => groups.value.map((group) => ({ value: group.id, label: group.name })))
const groupNames = computed(() => new Map(groups.value.map(({ id, name }) => [id, name])))
const columns = computed<DataTableColumn<OptionRow>[]>(() => [
	{ key: 'name', label: 'Name', className: 'break-words' },
	...(isChild.value ? [{ key: 'parent', label: 'Parent category', className: 'break-words' }] : []),
])
const rows = computed(() => {
	const options: OptionRow[] = isChild.value
		? children.value.map((item) => ({ ...item, parent: groupNames.value.get(item.categoryId) }))
		: groups.value
	const query = search.value.trim().toLowerCase()
	return options.filter(
		(row) =>
			(!isChild.value || !filter.value || row.categoryId === filter.value) &&
			[row.name, row.parent].some((text) => text?.toLowerCase().includes(query)),
	)
})

async function load() {
	loading.value = true
	const [categories, subcategories] = await Promise.all([
		provider.categories(),
		isChild.value ? provider.subcategories() : undefined,
	])
	failed.value = !categories.success || subcategories?.success === false
	if (categories.success) groups.value = categories.data
	if (subcategories?.success) children.value = subcategories.data
	if (filter.value && !groups.value.some(({ id }) => id === filter.value)) filter.value = ''
	loading.value = false
}

function openEditor(row?: OptionRow) {
	editing.value = row
	name.value = row?.name ?? ''
	parent.value = row?.categoryId ?? filter.value
	editor.value = true
}

async function save() {
	if (busy.value || !name.value || (isChild.value && !parent.value)) return
	busy.value = true
	try {
		const response = isChild.value
			? await provider.saveSubcategory(name.value, parent.value, editing.value?.id)
			: await provider.saveCategory(name.value, editing.value?.id)
		if (response.success) {
			editor.value = false
			await load()
		}
	} finally {
		busy.value = false
	}
}

async function remove() {
	const item = removing.value
	if (!item || busy.value) return
	busy.value = true
	try {
		const response = await (isChild.value ? provider.removeSubcategory(item.id) : provider.removeCategory(item.id))
		if (response.success) {
			if (editing.value?.id === item.id) editor.value = false
			await load()
		}
	} finally {
		removing.value = undefined
		busy.value = false
	}
}

onMounted(load)
onContentUndo(['ShopCategory', 'ShopSubcategory'], () => void load())
</script>

<template>
	<div class="space-y-4">
		<div class="flex flex-wrap items-end gap-3">
			<div class="min-w-40 flex-1">
				<FormInput v-model="search" :label="`Search ${mode}`" type="search" />
			</div>
			<div v-if="isChild" class="min-w-44 flex-1">
				<FormSelect v-model="filter" label="Filter by category" placeholder="All categories" :options="groupOptions" />
			</div>
			<button
				type="button"
				class="btn btn-primary"
				:disabled="busy || loading || failed || (isChild && !groups.length)"
				@click="openEditor()"
			>
				Add {{ noun }}
			</button>
		</div>
		<p v-if="failed" role="alert" class="text-sm text-brand-gray-400">
			Unable to load {{ mode }}. <button type="button" class="text-brand-blueLight" @click="load">Retry</button>
		</p>
		<p v-else-if="isChild && !loading && !groups.length" class="text-sm text-brand-gray-400">
			Add a parent category in Shop categories first.
		</p>
		<form v-if="editor && !failed" class="space-y-4 rounded-lg border border-white/10 p-4" @submit.prevent="save">
			<h3 class="font-medium">{{ editing ? 'Rename' : 'New' }} {{ noun }}</h3>
			<fieldset :disabled="busy" class="grid gap-3 sm:grid-cols-2">
				<FormSelect
					v-if="isChild"
					v-model="parent"
					label="Parent category"
					placeholder="Choose a category"
					required
					:options="groupOptions"
					:disabled="!!editing"
				/>
				<FormInput
					v-model.trim="name"
					:label="isChild ? 'Subcategory name' : 'Category name'"
					maxlength="100"
					required
				/>
			</fieldset>
			<div class="flex flex-wrap gap-2">
				<button type="submit" class="btn btn-primary" :disabled="busy">Save {{ noun }}</button>
				<button type="button" class="btn btn-ghost" :disabled="busy" @click="editor = false">Cancel</button>
			</div>
		</form>
		<DataTable
			v-if="!failed"
			:key="`${search}:${filter}`"
			:label="`Shop ${mode}`"
			:empty="`No matching ${mode}.`"
			:loading="loading"
			:actions-disabled="busy"
			:columns="columns"
			:rows="rows"
			@edit="openEditor"
			@delete="removing = $event"
		/>
		<ConfirmDialog
			:open="!!removing"
			:title="`Remove ${noun}?`"
			:message="`Remove “${removing?.name ?? ''}” from the Shop options?`"
			confirm-text="Remove"
			@cancel="removing = undefined"
			@confirm="remove"
		/>
	</div>
</template>
