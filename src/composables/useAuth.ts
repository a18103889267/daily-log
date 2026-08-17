import { computed, onMounted, ref } from 'vue'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

const session = ref<Session | null>(null)
const loading = ref(true)

export function useAuth() {
  const user = computed<User | null>(() => session.value?.user ?? null)
  const isAuthenticated = computed(() => !!session.value)

  async function initAuth() {
    loading.value = true
    const { data } = await supabase.auth.getSession()
    session.value = data.session

    supabase.auth.onAuthStateChange((_event, nextSession) => {
      session.value = nextSession
    })

    loading.value = false
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signUp(email: string, password: string) {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  return {
    user,
    session,
    loading,
    isAuthenticated,
    initAuth,
    signIn,
    signUp,
    signOut,
  }
}

export function useAuthBootstrap() {
  const { initAuth } = useAuth()

  onMounted(() => {
    void initAuth()
  })
}
