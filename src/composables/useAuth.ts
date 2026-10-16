import { computed, onMounted, ref } from 'vue'
import { auth, getCloudBaseErrorMessage } from '../lib/cloudbase'

export type EmailOtpSession = {
  verifyOtp: (params: { token: string }) => Promise<{
    data?: { user?: CloudBaseUser; session?: unknown }
    error?: { message?: string; code?: string } | null
  }>
}

export type SetPasswordSession = {
  updateUser: (params: { nonce: string; password: string }) => Promise<{
    data?: { user?: CloudBaseUser; session?: unknown }
    error?: { message?: string; code?: string } | null
  }>
}

export class PasswordNotSetError extends Error {
  constructor(public account: string) {
    super('该账号尚未设置密码')
    this.name = 'PasswordNotSetError'
  }
}

type CloudBaseUser = {
  uid: string
  email?: string
  nickName?: string
}

type LoginState = {
  user: CloudBaseUser
}

const loginState = ref<LoginState | null>(null)
const loading = ref(true)

function firstText(...values: unknown[]) {
  return values.find((value): value is string => typeof value === 'string' && value.trim().length > 0)
}

function mapUser(user: Record<string, unknown> | undefined | null): CloudBaseUser | null {
  if (!user) return null
  const uid = String(user.uid ?? user.id ?? user.customUserId ?? '')
  if (!uid) return null
  const metadata =
    user.user_metadata && typeof user.user_metadata === 'object'
      ? (user.user_metadata as Record<string, unknown>)
      : undefined
  return {
    uid,
    email: firstText(user.email),
    nickName: firstText(user.displayName, user.name, user.nickName, metadata?.nickName, metadata?.nickname),
  }
}

const WECHAT_LOGIN_ERROR_KEY = 'daily-log-wechat-login-error'
const WECHAT_ATTEMPT_KEY = 'daily-log-wechat-attempt'

type OAuthClient = {
  signInWithOAuth: (params: {
    provider: string
    options?: { redirectTo?: string }
  }) => Promise<{ error?: { message?: string } | null }>
  verifyOAuth: () => Promise<{
    error?: { message?: string } | null
  }>
}

function oauthClient() {
  return auth as unknown as OAuthClient
}

export function isWechatBrowser() {
  return /MicroMessenger/i.test(navigator.userAgent)
}

function wechatLoginMessage(error: unknown, fallback: string) {
  const message =
    typeof error === 'string' && error.trim() ? error : getCloudBaseErrorMessage(error, fallback)
  if (/not enabled|未开启|未启用|未配置|不支持|disabled|provider.+not/i.test(message)) {
    return '微信登录还没开通。请在 CloudBase 控制台打开「身份认证 → 登录方式 → 微信」，填入已认证服务号的 AppID 和 AppSecret。'
  }
  return message
}

export function consumeWechatLoginError() {
  const message = sessionStorage.getItem(WECHAT_LOGIN_ERROR_KEY)
  if (message) sessionStorage.removeItem(WECHAT_LOGIN_ERROR_KEY)
  return message || ''
}

export function shouldAutoStartWechatLogin() {
  return isWechatBrowser() && sessionStorage.getItem(WECHAT_ATTEMPT_KEY) !== '1'
}

export async function signInWithWechat() {
  sessionStorage.setItem(WECHAT_ATTEMPT_KEY, '1')
  const redirectTo = `${location.origin}${location.pathname}${location.search}${location.hash}`
  const { error } = await oauthClient().signInWithOAuth({
    provider: 'wechat',
    options: { redirectTo },
  })

  if (error) {
    throw new Error(wechatLoginMessage(error, '微信登录失败'))
  }
}

function savedOAuthHash(state: string) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(state) || 'null') as { hash?: string } | null
    return saved?.hash || ''
  } catch {
    return ''
  }
}

function clearOAuthQuery() {
  const url = new URL(location.href)
  url.searchParams.delete('code')
  url.searchParams.delete('state')
  url.searchParams.delete('provider')
  url.searchParams.delete('error')
  url.searchParams.delete('error_description')
  history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
}

export async function completeWechatRedirect() {
  const params = new URLSearchParams(location.search)
  const code = params.get('code')
  const state = params.get('state')
  const oauthError = params.get('error_description') || params.get('error')

  if (!code || !state) {
    if (oauthError) {
      sessionStorage.setItem(WECHAT_LOGIN_ERROR_KEY, wechatLoginMessage(oauthError, '微信登录失败'))
      clearOAuthQuery()
    }
    return
  }

  const savedHash = savedOAuthHash(state)
  if (savedHash && location.hash !== savedHash) return

  try {
    const { error } = await oauthClient().verifyOAuth()
    if (error) {
      sessionStorage.setItem(WECHAT_LOGIN_ERROR_KEY, wechatLoginMessage(error, '微信登录失败'))
    } else {
      sessionStorage.removeItem(WECHAT_ATTEMPT_KEY)
      await refreshLoginState()
    }
  } catch (error) {
    sessionStorage.setItem(WECHAT_LOGIN_ERROR_KEY, wechatLoginMessage(error, '微信登录失败'))
  } finally {
    clearOAuthQuery()
  }
}

async function refreshLoginState() {
  const { data, error } = await auth.getSession()
  if (error || !data?.session) {
    loginState.value = null
    return
  }
  const user = mapUser(data.user as Record<string, unknown> | undefined)
  loginState.value = user ? { user } : null
}

export function useAuth() {
  const user = computed<CloudBaseUser | null>(() => loginState.value?.user ?? null)
  const isAuthenticated = computed(() => !!loginState.value)

  async function initAuth() {
    loading.value = true
    await refreshLoginState()

    auth.onLoginStateChanged((state: LoginState | null) => {
      loginState.value = state
    })

    loading.value = false
  }

  async function sendEmailCode(email: string): Promise<EmailOtpSession> {
    const { data, error } = await auth.signInWithOtp({ email })

    if (error) {
      throw new Error(getCloudBaseErrorMessage(error, '发送验证码失败'))
    }

    if (!data?.verifyOtp) {
      throw new Error('发送验证码失败，请检查 CloudBase 邮箱验证码是否已开启')
    }

    return data as EmailOtpSession
  }

  async function signInWithEmailCode(verificationCode: string, otpSession: EmailOtpSession) {
    const { data, error } = await otpSession.verifyOtp({
      token: verificationCode.trim(),
    })

    if (error) {
      throw new Error(getCloudBaseErrorMessage(error, '验证码错误或已过期'))
    }

    await applyAuthResponse(data?.user as Record<string, unknown> | undefined)
  }

  async function applyAuthResponse(user: Record<string, unknown> | undefined) {
    const mappedUser = mapUser(user)
    if (mappedUser) {
      loginState.value = { user: mappedUser }
    } else {
      await refreshLoginState()
    }
  }

  async function signInWithPassword(
    account: string,
    password: string,
    loginType: 'email' | 'username',
  ) {
    const trimmedAccount = account.trim()
    const trimmedPassword = password.trim()

    if (!trimmedAccount || !trimmedPassword) {
      throw new Error('请填写账号和密码')
    }

    const credentials =
      loginType === 'email'
        ? { email: trimmedAccount, password: trimmedPassword }
        : { username: trimmedAccount, password: trimmedPassword }

    const { data, error } = await auth.signInWithPassword(credentials)

    if (error) {
      const code = (error as { code?: string }).code
      if (code === 'password_not_set') {
        throw new PasswordNotSetError(trimmedAccount)
      }
      throw new Error(getCloudBaseErrorMessage(error, '账号或密码错误'))
    }

    await applyAuthResponse(data?.user as Record<string, unknown> | undefined)
  }

  async function signUpWithPassword(
    email: string,
    password: string,
    username: string | undefined,
  ): Promise<EmailOtpSession> {
    const trimmedEmail = email.trim()
    const trimmedPassword = password.trim()
    const trimmedUsername = username?.trim()

    if (!trimmedEmail || !trimmedPassword) {
      throw new Error('请填写邮箱和密码')
    }

    const { data, error } = await auth.signUp({
      email: trimmedEmail,
      password: trimmedPassword,
      ...(trimmedUsername ? { username: trimmedUsername } : {}),
    })

    if (error) {
      throw new Error(getCloudBaseErrorMessage(error, '注册失败'))
    }

    if (!data?.verifyOtp) {
      throw new Error('注册失败，请检查 CloudBase 邮箱验证码是否已开启')
    }

    return data as EmailOtpSession
  }

  async function sendSetPasswordCode(email: string): Promise<SetPasswordSession> {
    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      throw new Error('请先填写邮箱')
    }

    const { data, error } = await auth.resetPasswordForEmail(trimmedEmail)

    if (error) {
      throw new Error(getCloudBaseErrorMessage(error, '发送验证码失败'))
    }

    if (!data?.updateUser) {
      throw new Error('发送验证码失败，请检查 CloudBase 邮箱验证码是否已开启')
    }

    return data as SetPasswordSession
  }

  async function completeSetPassword(
    verificationCode: string,
    newPassword: string,
    setPasswordSession: SetPasswordSession,
  ) {
    const { data, error } = await setPasswordSession.updateUser({
      nonce: verificationCode.trim(),
      password: newPassword.trim(),
    })

    if (error) {
      throw new Error(getCloudBaseErrorMessage(error, '设置密码失败，请检查验证码是否正确'))
    }

    await applyAuthResponse(data?.user as Record<string, unknown> | undefined)
  }

  async function signOut() {
    await auth.signOut()
    loginState.value = null
  }

  return {
    user,
    loginState,
    loading,
    isAuthenticated,
    initAuth,
    sendEmailCode,
    signInWithEmailCode,
    signInWithPassword,
    signUpWithPassword,
    sendSetPasswordCode,
    completeSetPassword,
    signOut,
  }
}

export function useAuthBootstrap() {
  const { initAuth } = useAuth()

  onMounted(() => {
    void initAuth()
  })
}
