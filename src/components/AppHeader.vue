<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
const { user, signOut } = useAuth()

async function handleSignOut() {
  await signOut()
  await router.push({ name: 'login' })
}
</script>

<template>
  <header class="app-header">
    <div class="brand">
      <span class="logo">Daily Log</span>
      <span class="subtitle">记录每一天</span>
    </div>
    <div class="actions">
      <span v-if="user" class="email">{{ user.email }}</span>
      <button type="button" class="ghost" @click="handleSignOut">退出</button>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}

.brand {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.logo {
  font-size: 20px;
  font-weight: 700;
  color: var(--primary);
}

.subtitle {
  color: var(--text-muted);
  font-size: 14px;
}

.actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.email {
  color: var(--text-muted);
  font-size: 14px;
}

.ghost {
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text);
  border-radius: 8px;
  padding: 8px 14px;
  cursor: pointer;
}

.ghost:hover {
  border-color: var(--primary);
  color: var(--primary);
}
</style>
