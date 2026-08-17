<script setup lang="ts">
import { onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth, type EmailOtpSession } from '../composables/useAuth'
import { getCloudBaseErrorMessage } from '../lib/cloudbase'

const router = useRouter()
const route = useRoute()
const { sendEmailCode, signInWithEmailCode } = useAuth()

const email = ref('')
const verificationCode = ref('')
const otpSession = ref<EmailOtpSession | null>(null)
const loading = ref(false)
const sendingCode = ref(false)
const countdown = ref(0)
const message = ref('')
const error = ref('')

let countdownTimer: ReturnType<typeof setInterval> | null = null

function startCountdown() {
  countdown.value = 60
  countdownTimer = setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0 && countdownTimer) {
      clearInterval(countdownTimer)
      countdownTimer = null
    }
  }, 1000)
}

async function handleSendCode() {
  if (!email.value.trim()) {
    error.value = '请先填写邮箱'
    return
  }

  sendingCode.value = true
  error.value = ''
  message.value = ''

  try {
    otpSession.value = await sendEmailCode(email.value.trim())
    message.value = '验证码已发送，请查收邮箱（含垃圾箱）'
    startCountdown()
  } catch (err) {
    error.value = getCloudBaseErrorMessage(err, '发送验证码失败')
  } finally {
    sendingCode.value = false
  }
}

async function handleSubmit() {
  if (!otpSession.value) {
    error.value = '请先获取验证码'
    return
  }

  loading.value = true
  error.value = ''
  message.value = ''

  try {
    await signInWithEmailCode(verificationCode.value, otpSession.value)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    await router.push(redirect)
  } catch (err) {
    error.value = getCloudBaseErrorMessage(err, '登录失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer)
})
</script>

<template>
  <div class="login-page">
    <div class="card">
      <h1>登录 Daily Log</h1>
      <p class="hint">使用邮箱验证码登录，首次登录会自动注册。电脑和手机可同步同一份记录。</p>

      <form @submit.prevent="handleSubmit">
        <label>
          邮箱
          <input v-model="email" type="email" required placeholder="you@example.com" />
        </label>

        <label>
          验证码
          <div class="code-row">
            <input
              v-model="verificationCode"
              type="text"
              required
              maxlength="6"
              inputmode="numeric"
              placeholder="6 位验证码"
            />
            <button
              type="button"
              class="ghost"
              :disabled="sendingCode || countdown > 0"
              @click="handleSendCode"
            >
              {{
                sendingCode
                  ? '发送中...'
                  : countdown > 0
                    ? `${countdown}s 后重发`
                    : '获取验证码'
              }}
            </button>
          </div>
        </label>

        <button type="submit" :disabled="loading">
          {{ loading ? '登录中...' : '登录' }}
        </button>
      </form>

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

.code-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
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

.ghost {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px 12px;
  background: transparent;
  color: var(--text);
  font: inherit;
  white-space: nowrap;
  cursor: pointer;
}

.ghost:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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
