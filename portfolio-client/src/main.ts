import './assets/main.css'

import { createPinia } from 'pinia'
import piniaPluginPersistedState from 'pinia-plugin-persistedstate'
import { createApp } from 'vue'
import Vue3Toastify, { toast, type ToastContainerOptions } from 'vue3-toastify'
import 'vue3-toastify/dist/index.css'
import App from './App.vue'
import router from './router'

const app = createApp(App)

app.config.performance = true

const pinia = createPinia()

pinia.use(piniaPluginPersistedState)

app.use(pinia)
app.use(router)
app.use(Vue3Toastify, {
	autoClose: 3000,
	position: toast.POSITION.TOP_RIGHT,
	transition: toast.TRANSITIONS.SLIDE,
	theme: 'dark',
	hideProgressBar: false,
	closeButton: true,
	clearOnUrlChange: false,
} as ToastContainerOptions)

app.mount('#app')
