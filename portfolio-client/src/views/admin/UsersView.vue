<script setup lang="ts">
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import DataTable, { type DataTableColumn } from '@/components/DataTable.vue'
import FormField from '@/components/FormField.vue'
import Modal from '@/components/Modal.vue'
import { useUserProvider, type UserInput } from '@/composables/provider/user.provider'
import { useUserStore } from '@/stores/user'
import { Role, type User } from '@/types'
import { onMounted, reactive, ref } from 'vue'

const provider = useUserProvider()
const userStore = useUserStore()

const items = ref<User[]>([])
const loading = ref(true)
const showModal = ref(false)
const editingId = ref<string | null>(null)
const confirmOpen = ref(false)
const toDelete = ref<User | null>(null)
const errors = ref<Record<string, string>>({})

const form = reactive<UserInput>({
	email: '',
	password: '',
	firstName: '',
	lastName: '',
	role: Role.ADMIN,
	avatarUrl: '',
})

const load = async () => {
	loading.value = true
	const res = await provider.list()
	if (res.success && res.data) items.value = res.data
	loading.value = false
}

onMounted(load)

const columns: DataTableColumn<User>[] = [
	{ key: 'firstName', label: 'Name', render: (r) => `${r.firstName} ${r.lastName}` },
	{ key: 'email', label: 'Email', render: (r) => r.email || r.auth?.email || '—' },
	{ key: 'role', label: 'Role' },
]

const reset = () => {
	editingId.value = null
	Object.assign(form, { email: '', password: '', firstName: '', lastName: '', role: Role.ADMIN, avatarUrl: '' })
	errors.value = {}
}

const openCreate = () => {
	reset()
	showModal.value = true
}

const openEdit = (u: User) => {
	editingId.value = u.id
	Object.assign(form, {
		email: u.email || u.auth?.email || '',
		password: '',
		firstName: u.firstName,
		lastName: u.lastName,
		role: u.role,
		avatarUrl: u.avatarUrl || '',
	})
	errors.value = {}
	showModal.value = true
}

const save = async () => {
	errors.value = {}
	if (!editingId.value && !form.email.trim()) errors.value.email = 'Email is required'
	if (!form.firstName.trim()) errors.value.firstName = 'First name required'
	if (!form.lastName.trim()) errors.value.lastName = 'Last name required'
	if (!editingId.value && !form.password) errors.value.password = 'Password is required'
	if (Object.keys(errors.value).length) return

	const payload: Partial<UserInput> = {
		firstName: form.firstName.trim(),
		lastName: form.lastName.trim(),
		role: form.role,
		avatarUrl: form.avatarUrl?.trim() || undefined,
	}
	if (!editingId.value) {
		payload.email = form.email.trim()
		payload.password = form.password
	} else if (form.password) {
		payload.password = form.password
	}

	const res = editingId.value
		? await provider.update(editingId.value, payload)
		: await provider.create(payload as UserInput)
	if (res.success) {
		showModal.value = false
		await load()
	}
}

const askDelete = (u: User) => {
	toDelete.value = u
	confirmOpen.value = true
}

const doDelete = async () => {
	if (!toDelete.value) return
	const res = await provider.remove(toDelete.value.id)
	confirmOpen.value = false
	toDelete.value = null
	if (res.success) await load()
}

const canDelete = (u: User) => u.id !== userStore.user?.id
</script>

<template>
	<div class="space-y-6">
		<div class="flex justify-end">
			<button class="btn btn-primary" @click="openCreate">+ New user</button>
		</div>

		<DataTable
			:columns="columns"
			:rows="items"
			:loading="loading"
			empty="No users yet."
			:can-delete="canDelete"
			@edit="openEdit"
			@delete="askDelete"
		/>

		<Modal :open="showModal" :title="editingId ? 'Edit user' : 'New user'" size="md" @close="showModal = false">
			<form class="space-y-4" @submit.prevent="save">
				<div class="grid sm:grid-cols-2 gap-4">
					<FormField label="First name" :error="errors.firstName" required>
						<input v-model="form.firstName" type="text" class="input" />
					</FormField>
					<FormField label="Last name" :error="errors.lastName" required>
						<input v-model="form.lastName" type="text" class="input" />
					</FormField>
				</div>
				<FormField label="Email" :error="errors.email" :required="!editingId">
					<input v-model="form.email" type="email" class="input" :disabled="!!editingId" />
				</FormField>
				<FormField
					:label="editingId ? 'New password (leave blank to keep current)' : 'Password'"
					:error="errors.password"
					:required="!editingId"
				>
					<input v-model="form.password" type="password" class="input" />
				</FormField>
				<FormField label="Role">
					<select v-model="form.role" class="input">
						<option :value="Role.OWNER">Owner</option>
						<option :value="Role.ADMIN">Admin</option>
					</select>
				</FormField>
				<FormField label="Avatar URL">
					<input v-model="form.avatarUrl" type="url" class="input" placeholder="https://..." />
				</FormField>
				<div class="flex justify-end gap-3 pt-2">
					<button type="button" class="btn btn-ghost" @click="showModal = false">Cancel</button>
					<button type="submit" class="btn btn-primary">Save</button>
				</div>
			</form>
		</Modal>

		<ConfirmDialog
			:open="confirmOpen"
			title="Delete user?"
			:message="`Remove ${toDelete?.firstName} ${toDelete?.lastName}?`"
			confirm-text="Delete"
			@confirm="doDelete"
			@cancel="confirmOpen = false"
		/>
	</div>
</template>
