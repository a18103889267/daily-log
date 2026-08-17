<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
const route = useRoute()
const { signIn, signUp } = useAuth()

const email = ref('')
const password = ref('')
const isRegister = ref(false)
const loading = ref(false)
const message = ref('')
const error = ref('')

function formatAuthError(err: unknown) {
  const raw = err instanceof Error ? err.message : '操作失败，请稍后重试'

  if (raw.toLowerCase().includes('email not confirmed')) {
    return '邮箱尚未验证。请到注册邮箱查收 Supabase 验证邮件并点击链接；个人项目也可在 Supabase 控制台关闭邮箱验证。'
  }

  return raw
}

async function handleSubmit() {
  loading.value = true
  error.value = ''
  message.value = ''

  try {
    if (isRegister.value) {
      await signUp(email.value, password.value)
      message.value = '注册成功。若开启了邮箱验证，请先查收邮件后再登录。'
    } else {
      await signIn(email.value, password.value)
      const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
      await router.push(redirect)
    }
  } catch (err) {
    error.value = formatAuthError(err)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="card">
      <h1>{{ isRegister ? '注册账号' : '登录 Daily Log' }}</h1>
      <p class="hint">使用 Supabase 账号，电脑和手机可同步同一份记录。</p>

      <form @submit.prevent="handleSubmit">
        <label>
          邮箱
          <input v-model="email" type="email" required placeholder="you@example.com" />
        </label>

        <label>
          密码
          <input v-model="password" type="password" required minlength="6" placeholder="至少 6 位" />
        </label>

        <button type="submit" :disabled="loading">
          {{ loading ? '处理中...' : isRegister ? '注册' : '登录' }}
        </button>
      </form>

      <button type="button" class="switch" @click="isRegister = !isRegister">
        {{ isRegister ? '已有账号？去登录' : '没有账号？去注册' }}
      </button>

      <p v-if="message" class="message">{{ message }}</p>
      <p v-if="error" class="error">{{ error }}</p>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  background:
    radial-gradient(circle at top, rgba(255, 102, 0, 0.12), transparent 40%),
    var(--bg);
}

.card {
  width: 100%;
  max-width: 420px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 32px;
  box-shadow: var(--shadow);
}

h1 {
  margin: 0 0 8px;
  font-size: 28px;
}

.hint {
  margin: 0 0 24px;
  color: var(--text-muted);
  font-size: 14px;
}

form {
  display: grid;
  gap: 16px;
}

label {
  display: grid;
  gap: 8px;
  font-size: 14px;
  color: var(--text-muted);
}

input {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px 14px;
  font: inherit;
  background: var(--bg);
  color: var(--text);
}

button[type='submit'] {
  border: none;
  border-radius: 10px;
  padding: 12px 16px;
  background: var(--primary);
  color: #fff;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

button[type='submit']:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.switch {
  margin-top: 16px;
  border: none;
  background: transparent;
  color: var(--primary);
  cursor: pointer;
  font: inherit;
}

.message {
  margin-top: 16px;
  color: #059669;
  font-size: 14px;
}

.error {
  margin-top: 16px;
  color: #dc2626;
  font-size: 14px;
}
</style>
