<script setup lang="ts">
withDefaults(
	defineProps<{
		open: boolean
		title?: string
		size?: 'sm' | 'md' | 'lg' | 'xl'
	}>(),
	{ size: 'md' },
)

defineEmits<{ (e: 'close'): void }>()
</script>

<template>
	<Teleport to="body">
		<Transition
			enter-active-class="transition duration-200"
			leave-active-class="transition duration-150"
			enter-from-class="opacity-0"
			leave-to-class="opacity-0"
		>
			<div
				v-if="open"
				class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
				@click.self="$emit('close')"
			>
				<div
					class="card w-full bg-brand-gray-950 border-white/10 max-h-[90vh] overflow-y-auto"
					:class="{
						'max-w-sm': size === 'sm',
						'max-w-md': size === 'md',
						'max-w-2xl': size === 'lg',
						'max-w-4xl': size === 'xl',
					}"
				>
					<div v-if="title" class="flex items-center justify-between px-5 py-4 border-b border-white/5">
						<h3 class="font-display font-semibold text-lg">{{ title }}</h3>
						<button class="text-brand-gray-400 hover:text-white" aria-label="Close" @click="$emit('close')">
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<line x1="6" y1="6" x2="18" y2="18" />
								<line x1="18" y1="6" x2="6" y2="18" />
							</svg>
						</button>
					</div>
					<div class="p-5">
						<slot />
					</div>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>
