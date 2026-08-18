<script setup lang="ts">
import { onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth, type EmailOtpSession, type SetPasswordSession, PasswordNotSetError } from '../composables/useAuth'
import { getCloudBaseErrorMessage } from '../lib/cloudbase'

type LoginMode = 'password' | 'otp'
type PasswordLoginType = 'email' | 'username'
type PasswordView = 'login' | 'register' | 'set-password'

const router = useRouter()
const route = useRoute()
const {
  sendEmailCode,
  signInWithEmailCode,
  signInWithPassword,
  signUpWithPassword,
  sendSetPasswordCode,
  completeSetPassword,
} = useAuth()

const loginMode = ref<LoginMode>('password')
const passwordLoginType = ref<PasswordLoginType>('email')
const passwordView = ref<PasswordView>('login')

const account = ref('')
const password = ref('')
const registerUsername = ref('')
const email = ref('')
const verificationCode = ref('')
const otpSession = ref<EmailOtpSession | null>(null)
const registerOtpSession = ref<EmailOtpSession | null>(null)
const setPasswordSession = ref<SetPasswordSession | null>(null)
const setPasswordEmail = ref('')
const setPasswordValue = ref('')

const loading = ref(false)
const sendingCode = ref(false)
const countdown = ref(0)
const registerCountdown = ref(0)
const setPasswordCountdown = ref(0)
const message = ref('')
const error = ref('')

let countdownTimer: ReturnType<typeof setInterval> | null = null
let registerCountdownTimer: ReturnType<typeof setInterval> | null = null
let setPasswordCountdownTimer: ReturnType<typeof setInterval> | null = null

function startCountdown(target: 'otp' | 'register' | 'set-password') {
  if (target === 'otp') {
    countdown.value = 60
    if (countdownTimer) clearInterval(countdownTimer)
    countdownTimer = setInterval(() => {
      countdown.value -= 1
      if (countdown.value <= 0 && countdownTimer) {
        clearInterval(countdownTimer)
        countdownTimer = null
      }
    }, 1000)
    return
  }

  if (target === 'register') {
    registerCountdown.value = 60
    if (registerCountdownTimer) clearInterval(registerCountdownTimer)
    registerCountdownTimer = setInterval(() => {
      registerCountdown.value -= 1
      if (registerCountdown.value <= 0 && registerCountdownTimer) {
        clearInterval(registerCountdownTimer)
        registerCountdownTimer = null
      }
    }, 1000)
    return
  }

  setPasswordCountdown.value = 60
  if (setPasswordCountdownTimer) clearInterval(setPasswordCountdownTimer)
  setPasswordCountdownTimer = setInterval(() => {
    setPasswordCountdown.value -= 1
    if (setPasswordCountdown.value <= 0 && setPasswordCountdownTimer) {
      clearInterval(setPasswordCountdownTimer)
      setPasswordCountdownTimer = null
    }
  }, 1000)
}

function resetMessages() {
  error.value = ''
  message.value = ''
}

function switchLoginMode(mode: LoginMode) {
  loginMode.value = mode
  resetMessages()
}

function switchPasswordView(view: PasswordView) {
  passwordView.value = view
  if (view === 'set-password') {
    setPasswordEmail.value =
      passwordLoginType.value === 'email'
        ? account.value.trim() || email.value.trim()
        : email.value.trim()
    setPasswordValue.value = ''
    verificationCode.value = ''
    setPasswordSession.value = null
  }
  resetMessages()
}

async function redirectAfterLogin() {
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
  await router.push(redirect)
}

function openSetPasswordView(prefillEmail = '') {
  switchPasswordView('set-password')
  if (prefillEmail.trim()) {
    setPasswordEmail.value = prefillEmail.trim()
  }
}

async function handlePasswordLogin() {
  loading.value = true
  resetMessages()

  try {
    await signInWithPassword(account.value, password.value, passwordLoginType.value)
    await redirectAfterLogin()
  } catch (err) {
    const isPasswordNotSet =
      err instanceof PasswordNotSetError ||
      (err instanceof Error && err.name === 'PasswordNotSetError')

    if (isPasswordNotSet) {
      const prefill =
        passwordLoginType.value === 'email'
          ? account.value.trim() || (err as PasswordNotSetError).account
          : setPasswordEmail.value || email.value
      error.value = '该账号尚未设置密码，请切换到「设置密码」完成设置。'
      openSetPasswordView(prefill)
    } else {
      error.value = getCloudBaseErrorMessage(err, '登录失败，请稍后重试')
    }
  } finally {
    loading.value = false
  }
}

async function handleSendSetPasswordCode() {
  if (!setPasswordEmail.value.trim()) {
    error.value = '请先填写邮箱'
    return
  }
  if (!setPasswordValue.value.trim()) {
    error.value = '请先填写新密码'
    return
  }

  sendingCode.value = true
  resetMessages()

  try {
    setPasswordSession.value = await sendSetPasswordCode(setPasswordEmail.value.trim())
    message.value = '验证码已发送，请查收邮箱（含垃圾箱）'
    startCountdown('set-password')
  } catch (err) {
    error.value = getCloudBaseErrorMessage(err, '发送验证码失败')
  } finally {
    sendingCode.value = false
  }
}

async function handleSetPasswordSubmit() {
  if (!setPasswordSession.value) {
    error.value = '请先获取验证码'
    return
  }

  loading.value = true
  resetMessages()

  try {
    await completeSetPassword(
      verificationCode.value,
      setPasswordValue.value,
      setPasswordSession.value,
    )
    message.value = '密码设置成功，正在登录...'
    await redirectAfterLogin()
  } catch (err) {
    error.value = getCloudBaseErrorMessage(err, '设置密码失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

async function handleSendRegisterCode() {
  if (!email.value.trim()) {
    error.value = '请先填写邮箱'
    return
  }
  if (!password.value.trim()) {
    error.value = '请先填写密码'
    return
  }

  sendingCode.value = true
  resetMessages()

  try {
    registerOtpSession.value = await signUpWithPassword(
      email.value.trim(),
      password.value,
      registerUsername.value.trim() || undefined,
    )
    message.value = '验证码已发送，请查收邮箱（含垃圾箱）'
    startCountdown('register')
  } catch (err) {
    error.value = getCloudBaseErrorMessage(err, '发送验证码失败')
  } finally {
    sendingCode.value = false
  }
}

async function handleRegisterSubmit() {
  if (!registerOtpSession.value) {
    error.value = '请先获取验证码'
    return
  }

  loading.value = true
  resetMessages()

  try {
    await signInWithEmailCode(verificationCode.value, registerOtpSession.value)
    await redirectAfterLogin()
  } catch (err) {
    error.value = getCloudBaseErrorMessage(err, '注册失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

async function handleSendCode() {
  if (!email.value.trim()) {
    error.value = '请先填写邮箱'
    return
  }

  sendingCode.value = true
  resetMessages()

  try {
    otpSession.value = await sendEmailCode(email.value.trim())
    message.value = '验证码已发送，请查收邮箱（含垃圾箱）'
    startCountdown('otp')
  } catch (err) {
    error.value = getCloudBaseErrorMessage(err, '发送验证码失败')
  } finally {
    sendingCode.value = false
  }
}

async function handleOtpSubmit() {
  if (!otpSession.value) {
    error.value = '请先获取验证码'
    return
  }

  loading.value = true
  resetMessages()

  try {
    await signInWithEmailCode(verificationCode.value, otpSession.value)
    await redirectAfterLogin()
  } catch (err) {
    error.value = getCloudBaseErrorMessage(err, '登录失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer)
  if (registerCountdownTimer) clearInterval(registerCountdownTimer)
  if (setPasswordCountdownTimer) clearInterval(setPasswordCountdownTimer)
})
</script>

<template>
  <div class="login-page">
    <div class="card">
      <h1>登录 Daily Log</h1>
      <p class="hint">支持密码登录（邮箱或账号），也可使用邮箱验证码登录。电脑和手机可同步同一份记录。</p>

      <div class="mode-tabs">
        <button
          type="button"
          class="mode-tab"
          :class="{ active: loginMode === 'password' }"
          @click="switchLoginMode('password')"
        >
          密码登录
        </button>
        <button
          type="button"
          class="mode-tab"
          :class="{ active: loginMode === 'otp' }"
          @click="switchLoginMode('otp')"
        >
          验证码登录
        </button>
      </div>

      <template v-if="loginMode === 'password'">
        <div class="sub-tabs sub-tabs-3">
          <button
            type="button"
            class="sub-tab"
            :class="{ active: passwordView === 'login' }"
            @click="switchPasswordView('login')"
          >
            登录
          </button>
          <button
            type="button"
            class="sub-tab"
            :class="{ active: passwordView === 'set-password' }"
            @click="switchPasswordView('set-password')"
          >
            设置密码
          </button>
          <button
            type="button"
            class="sub-tab"
            :class="{ active: passwordView === 'register' }"
            @click="switchPasswordView('register')"
          >
            注册
          </button>
        </div>

        <div v-if="passwordView === 'login'" class="password-panel">
          <div class="sub-tabs">
            <button
              type="button"
              class="sub-tab"
              :class="{ active: passwordLoginType === 'email' }"
              @click="passwordLoginType = 'email'"
            >
              邮箱 + 密码
            </button>
            <button
              type="button"
              class="sub-tab"
              :class="{ active: passwordLoginType === 'username' }"
              @click="passwordLoginType = 'username'"
            >
              账号 + 密码
            </button>
          </div>

          <form @submit.prevent="handlePasswordLogin">
            <label>
              {{ passwordLoginType === 'email' ? '邮箱' : '账号' }}
              <input
                v-model="account"
                :type="passwordLoginType === 'email' ? 'email' : 'text'"
                required
                :placeholder="passwordLoginType === 'email' ? 'you@example.com' : '你的账号名'"
              />
            </label>

            <label>
              密码
              <input v-model="password" type="password" required placeholder="请输入密码" />
            </label>

            <button type="submit" :disabled="loading">
              {{ loading ? '登录中...' : '登录' }}
            </button>
          </form>
        </div>

        <div v-else-if="passwordView === 'set-password'" class="password-panel">
          <p class="register-hint">
            验证码注册过的账号需在此设置密码。填写邮箱和新密码，收验证码后即可生效。
          </p>

          <form @submit.prevent="handleSetPasswordSubmit">
            <label>
              邮箱
              <input v-model="setPasswordEmail" type="email" required placeholder="you@example.com" />
            </label>

            <label>
              新密码
              <input
                v-model="setPasswordValue"
                type="password"
                required
                placeholder="至少 6 位"
                minlength="6"
              />
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
                  :disabled="sendingCode || setPasswordCountdown > 0"
                  @click="handleSendSetPasswordCode"
                >
                  {{
                    sendingCode
                      ? '发送中...'
                      : setPasswordCountdown > 0
                        ? `${setPasswordCountdown}s 后重发`
                        : '获取验证码'
                  }}
                </button>
              </div>
            </label>

            <button type="submit" :disabled="loading">
              {{ loading ? '设置中...' : '设置密码并登录' }}
            </button>
          </form>
        </div>

        <div v-else class="password-panel">
          <p class="register-hint">注册需验证邮箱一次，之后可直接用邮箱或账号 + 密码登录。</p>

          <form @submit.prevent="handleRegisterSubmit">
            <label>
              邮箱
              <input v-model="email" type="email" required placeholder="you@example.com" />
            </label>

            <label>
              账号（可选）
              <input v-model="registerUsername" type="text" placeholder="设置后可使用账号登录" />
            </label>

            <label>
              密码
              <input v-model="password" type="password" required placeholder="至少 6 位" minlength="6" />
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
                  :disabled="sendingCode || registerCountdown > 0"
                  @click="handleSendRegisterCode"
                >
                  {{
                    sendingCode
                      ? '发送中...'
                      : registerCountdown > 0
                        ? `${registerCountdown}s 后重发`
                        : '获取验证码'
                  }}
                </button>
              </div>
            </label>

            <button type="submit" :disabled="loading">
              {{ loading ? '注册中...' : '注册并登录' }}
            </button>
          </form>
        </div>
      </template>

      <template v-else>
        <form @submit.prevent="handleOtpSubmit">
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
      </template>

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
  margin: 0 0 20px;
  color: var(--text-muted);
  font-size: 14px;
}

.mode-tabs,
.sub-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 20px;
}

.sub-tabs-3 {
  grid-template-columns: repeat(3, 1fr);
}

.mode-tab,
.sub-tab {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px 10px;
  background: transparent;
  color: var(--text-muted);
  font: inherit;
  cursor: pointer;
  min-height: 44px;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.mode-tab.active,
.sub-tab.active {
  border-color: var(--primary);
  color: var(--primary);
  background: rgba(255, 102, 0, 0.08);
  font-weight: 600;
}

.password-panel {
  display: grid;
  gap: 16px;
}

.register-hint {
  margin: 0;
  color: var(--text-muted);
  font-size: 13px;
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
