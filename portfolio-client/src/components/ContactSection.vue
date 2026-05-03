<script setup lang="ts">
import RequestForm from '@/components/RequestForm.vue'
</script>

<template>
	<section id="contact" class="section bg-gradient-to-b from-brand-gray-950 to-brand-black">
		<div class="max-w-6xl mx-auto grid lg:grid-cols-12 gap-10">
			<div class="lg:col-span-5 space-y-5">
				<div class="text-brand-blueLight font-mono text-sm uppercase tracking-widest">Get In Touch</div>
				<h2 class="heading-2">Let's build <span class="text-gradient-blue">something great</span> together.</h2>
				<p class="text-brand-gray-400 leading-relaxed">
					Have a project in mind, want to collaborate, or just want to say hi? Drop a message &mdash;
					I usually reply within 24 hours.
				</p>
				<div class="space-y-3 pt-3">
					<a href="mailto:itsajhon@gmail.com" class="flex items-center gap-3 text-brand-gray-300 hover:text-brand-blueLight transition group">
						<div class="w-10 h-10 rounded-lg bg-brand-blue/15 flex items-center justify-center group-hover:bg-brand-blue/25 transition">
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3388ff" stroke-width="2">
								<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
								<polyline points="22,6 12,13 2,6" />
							</svg>
						</div>
						itsajhon@gmail.com
					</a>
				</div>
			</div>
			<div class="lg:col-span-7">
				<RequestForm />
			</div>
		</div>
	</section>
</template>
