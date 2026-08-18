import { createRouter, createWebHistory } from 'vue-router'
import { auth } from '../lib/cloudbase'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      meta: { public: true },
    },
    {
      path: '/',
      name: 'home',
      component: () => import('../views/HomeView.vue'),
    },
    {
      path: '/goals',
      name: 'goals',
      component: () => import('../views/GoalsView.vue'),
    },
    {
      path: '/summary',
      name: 'summary',
      component: () => import('../views/SummaryView.vue'),
    },
    {
      path: '/day/:date',
      name: 'day',
      component: () => import('../views/DayView.vue'),
      props: true,
    },
  ],
})

router.beforeEach(async (to) => {
  if (to.meta.public) return true

  const { data, error } = await auth.getSession()
  if (error || !data?.session) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  return true
})

export default router
