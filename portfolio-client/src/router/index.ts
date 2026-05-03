import { useUserStore } from '@/stores/user'
import { Role } from '@/types'
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	scrollBehavior(to) {
		if (to.hash) {
			return { el: to.hash, behavior: 'smooth' }
		}
		return { top: 0, behavior: 'smooth' }
	},
	routes: [
		{
			path: '/',
			name: 'home',
			component: () => import('@/views/HomeView.vue'),
			meta: { requiresAuth: false },
		},
		{
			path: '/projects',
			name: 'projects',
			component: () => import('@/views/ProjectsView.vue'),
			meta: { requiresAuth: false },
		},
		{
			path: '/projects/:slug',
			name: 'project-detail',
			component: () => import('@/views/ProjectDetailView.vue'),
			meta: { requiresAuth: false },
		},
		{
			path: '/login',
			name: 'login',
			component: () => import('@/views/LoginView.vue'),
			meta: { requiresAuth: false },
		},
		{
			path: '/admin',
			redirect: '/admin/dashboard',
			meta: { requiresAuth: true },
		},
		{
			path: '/admin/dashboard',
			name: 'admin-dashboard',
			component: () => import('@/views/admin/DashboardView.vue'),
			meta: { requiresAuth: true },
		},
		{
			path: '/admin/projects',
			name: 'admin-projects',
			component: () => import('@/views/admin/ProjectsCmsView.vue'),
			meta: { requiresAuth: true },
		},
		{
			path: '/admin/tech-stack',
			name: 'admin-tech-stack',
			component: () => import('@/views/admin/TechStackCmsView.vue'),
			meta: { requiresAuth: true },
		},
		{
			path: '/admin/experience',
			name: 'admin-experience',
			component: () => import('@/views/admin/ExperienceCmsView.vue'),
			meta: { requiresAuth: true },
		},
		{
			path: '/admin/client-requests',
			name: 'admin-client-requests',
			component: () => import('@/views/admin/ClientRequestsView.vue'),
			meta: { requiresAuth: true },
		},
		{
			path: '/admin/chatbot',
			name: 'admin-chatbot',
			component: () => import('@/views/admin/ChatbotKbView.vue'),
			meta: { requiresAuth: true },
		},
		{
			path: '/admin/site-content',
			name: 'admin-site-content',
			component: () => import('@/views/admin/SiteContentView.vue'),
			meta: { requiresAuth: true },
		},
		{
			path: '/admin/users',
			name: 'admin-users',
			component: () => import('@/views/admin/UsersView.vue'),
			meta: { requiresAuth: true, requiresOwner: true },
		},
		{
			path: '/admin/profile',
			name: 'admin-profile',
			component: () => import('@/views/admin/ProfileView.vue'),
			meta: { requiresAuth: true },
		},
		{
			path: '/:pathMatch(.*)*',
			redirect: '/',
		},
	],
})

router.beforeEach(async (to) => {
	if (!to.meta.requiresAuth) return true

	const userStore = useUserStore()
	const token = localStorage.getItem('portfolio_token')
	if (!token) {
		return { path: '/login', query: { redirect: to.fullPath } }
	}

	if (!userStore.isAuthenticated) {
		const ok = await userStore.whoAmI()
		if (!ok) {
			return { path: '/login', query: { redirect: to.fullPath } }
		}
	}

	if (to.meta.requiresOwner && userStore.user?.role !== Role.OWNER) {
		return { path: '/admin/dashboard' }
	}

	return true
})

export default router
