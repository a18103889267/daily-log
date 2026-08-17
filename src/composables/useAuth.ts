import { computed, onMounted, ref } from 'vue'
import { auth, getCloudBaseErrorMessage } from '../lib/cloudbase'

export type EmailOtpSession = {
  verifyOtp: (params: { token: string }) => Promise<{
    data?: { user?: CloudBaseUser; session?: unknown }
    error?: { message?: string; code?: string } | null
  }>
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

    const mappedUser = mapUser(data?.user as Record<string, unknown> | undefined)
    if (mappedUser) {
      loginState.value = { user: mappedUser }
    } else {
      await refreshLoginState()
    }
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
    signOut,
  }
}

export function useAuthBootstrap() {
  const { initAuth } = useAuth()

  onMounted(() => {
    void initAuth()
  })
}
