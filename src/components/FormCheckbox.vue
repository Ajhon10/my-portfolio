<script setup lang="ts">
defineOptions({ inheritAttrs: false })
defineProps<{ label: string }>()
const checked = defineModel<boolean>()
</script>

<template>
	<label class="inline-flex min-h-11 items-center gap-2">
		<input v-model="checked" type="checkbox" v-bind="$attrs" />
		{{ label }}
	</label>
</template>
