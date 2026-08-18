import { createRouter, createWebHashHistory, createWebHistory } from 'vue-router'
import { auth } from '../lib/cloudbase'

const router = createRouter({
  // 子路径静态托管无法为 /dailylogs/* 配置 history fallback，生产环境用 hash 避免刷新 404
  history: import.meta.env.PROD
    ? createWebHashHistory(import.meta.env.BASE_URL)
    : createWebHistory(import.meta.env.BASE_URL),
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
