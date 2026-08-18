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

function mapUser(user: Record<string, unknown> | undefined | null): CloudBaseUser | null {
  if (!user) return null
  const uid = String(user.uid ?? user.id ?? user.customUserId ?? '')
  if (!uid) return null
  return {
    uid,
    email: (user.email as string | undefined) ?? undefined,
    nickName: (user.displayName as string | undefined) ?? (user.name as string | undefined),
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
