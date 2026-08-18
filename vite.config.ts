import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const deepseekKey = env.DEEPSEEK_API_KEY?.trim()

  return {
    base: '/dailylogs/',
    plugins: [vue()],
    server: {
      proxy: deepseekKey
        ? {
            '/api/deepseek': {
              target: 'https://api.deepseek.com',
              changeOrigin: true,
              rewrite: (path) => path.replace(/^\/api\/deepseek/, ''),
              configure: (proxy) => {
                proxy.on('proxyReq', (proxyReq) => {
                  proxyReq.setHeader('Authorization', `Bearer ${deepseekKey}`)
                })
              },
            },
          }
        : undefined,
    },
    preview: {
      proxy: deepseekKey
        ? {
            '/api/deepseek': {
              target: 'https://api.deepseek.com',
              changeOrigin: true,
              rewrite: (path) => path.replace(/^\/api\/deepseek/, ''),
              configure: (proxy) => {
                proxy.on('proxyReq', (proxyReq) => {
                  proxyReq.setHeader('Authorization', `Bearer ${deepseekKey}`)
                })
              },
            },
          }
        : undefined,
    },
  }
})
