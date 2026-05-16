<script setup lang="ts">
import { useClientRequestProvider } from '@/composables/provider/client-request.provider'
import { useUserStore } from '@/stores/user'
import { onMounted, reactive, ref } from 'vue'
import { toast } from 'vue3-toastify'

const provider = useClientRequestProvider()
const userStore = useUserStore()

const form = reactive({
	fullName: '',
	email: '',
	company: '',
	phone: '',
	projectType: '',
	budget: '',
	timeline: '',
	description: '',
	referenceLinks: '',
})

const errors = reactive<Record<string, string>>({})
const submitting = ref(false)

const projectTypes = [
	'Web Application',
	'Mobile App',
	'Landing Page',
	'API / Backend',
	'Video Editing',
	'Photography',
	'Other',
]

const budgets = ['< $500', '$500 – $1,500', '$1,500 – $5,000', '$5,000 – $10,000', '$10,000+']

const timelines = ['ASAP', '1–2 weeks', '1 month', '2–3 months', 'Flexible']

onMounted(() => {
	if (userStore.isClient && userStore.user) {
		form.fullName = `${userStore.user.firstName} ${userStore.user.lastName}`.trim()
		form.email = userStore.user.email || ''
	}
})

const validate = (): boolean => {
	for (const k of Object.keys(errors)) delete errors[k]
	if (!form.fullName.trim()) errors.fullName = 'Name is required'
	if (!form.email.trim()) errors.email = 'Email is required'
	else if (!/^\S+@\S+\.\S+$/.test(form.email)) errors.email = 'Invalid email format'
	if (!form.projectType) errors.projectType = 'Please select a project type'
	if (!form.description.trim()) errors.description = 'Tell me a bit about your project'
	else if (form.description.length < 10) errors.description = 'Please add a bit more detail'
	return Object.keys(errors).length === 0
}

const submit = async () => {
	if (!validate()) {
		toast.error('Please fix the highlighted fields.')
		return
	}
	submitting.value = true
	const payload = {
		fullName: form.fullName,
		email: form.email,
		company: form.company || undefined,
		phone: form.phone || undefined,
		projectType: form.projectType,
		budget: form.budget || undefined,
		timeline: form.timeline || undefined,
		description: form.description,
		referenceLinks: form.referenceLinks || undefined,
	}
	const res = userStore.isClient ? await provider.submitMine(payload) : await provider.submit(payload)
	submitting.value = false
	if (res.success) {
		toast.success('Thanks! Your request was sent. I will reply soon.')
		form.fullName = ''
		form.email = ''
		form.company = ''
		form.phone = ''
		form.projectType = ''
		form.budget = ''
		form.timeline = ''
		form.description = ''
		form.referenceLinks = ''
	}
}
</script>

<template>
	<form class="card p-6 md:p-8 space-y-5" @submit.prevent="submit">
		<div class="grid sm:grid-cols-2 gap-4">
			<div>
				<label class="label">Name *</label>
				<input v-model="form.fullName" type="text" class="input" placeholder="Your full name" />
				<p v-if="errors.fullName" class="text-xs text-red-400 mt-1">{{ errors.fullName }}</p>
			</div>
			<div>
				<label class="label">Email *</label>
				<input v-model="form.email" type="email" class="input" placeholder="you@email.com" />
				<p v-if="errors.email" class="text-xs text-red-400 mt-1">{{ errors.email }}</p>
			</div>
			<div>
				<label class="label">Company</label>
				<input v-model="form.company" type="text" class="input" placeholder="Optional" />
			</div>
			<div>
				<label class="label">Phone</label>
				<input v-model="form.phone" type="tel" class="input" placeholder="Optional" />
			</div>
			<div>
				<label class="label">Project type *</label>
				<select v-model="form.projectType" class="input">
					<option value="">Select a type</option>
					<option v-for="t in projectTypes" :key="t" :value="t">{{ t }}</option>
				</select>
				<p v-if="errors.projectType" class="text-xs text-red-400 mt-1">{{ errors.projectType }}</p>
			</div>
			<div>
				<label class="label">Budget</label>
				<select v-model="form.budget" class="input">
					<option value="">Optional</option>
					<option v-for="b in budgets" :key="b" :value="b">{{ b }}</option>
				</select>
			</div>
			<div>
				<label class="label">Timeline</label>
				<select v-model="form.timeline" class="input">
					<option value="">Optional</option>
					<option v-for="t in timelines" :key="t" :value="t">{{ t }}</option>
				</select>
			</div>
			<div>
				<label class="label">Reference links</label>
				<input v-model="form.referenceLinks" type="text" class="input" placeholder="https://..." />
			</div>
		</div>
		<div>
			<label class="label">Tell me about your project *</label>
			<textarea v-model="form.description" rows="5" class="input resize-none" placeholder="Goals, audience, key features..." />
			<p v-if="errors.description" class="text-xs text-red-400 mt-1">{{ errors.description }}</p>
		</div>
		<button type="submit" class="btn btn-primary w-full sm:w-auto" :disabled="submitting">
			<span v-if="submitting">Sending&hellip;</span>
			<span v-else>Send Request</span>
		</button>
	</form>
</template>
