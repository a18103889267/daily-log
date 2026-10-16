import { createApp } from 'vue'
import App from './App.vue'
import { completeWechatRedirect } from './composables/useAuth'
import router from './router'
import './style.css'

await completeWechatRedirect()

createApp(App).use(router).mount('#app')
