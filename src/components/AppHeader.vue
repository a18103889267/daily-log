<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
const route = useRoute()
const { user, signOut } = useAuth()

async function handleSignOut() {
  await signOut()
  await router.push({ name: 'login' })
}

function isActive(name: string) {
  return route.name === name
}
</script>

<template>
  <header class="app-header">
    <div class="brand">
      <span class="logo">Daily Log</span>
      <span class="subtitle">记录每一天</span>
    </div>
    <nav class="nav">
      <button
        type="button"
        class="nav-link"
        :class="{ active: isActive('home') }"
        @click="router.push({ name: 'home' })"
      >
        日历
      </button>
      <button
        type="button"
        class="nav-link"
        :class="{ active: isActive('goals') }"
        @click="router.push({ name: 'goals' })"
      >
        目标
      </button>
      <button
        type="button"
        class="nav-link"
        :class="{ active: isActive('summary') }"
        @click="router.push({ name: 'summary' })"
      >
        总结
      </button>
    </nav>
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
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}

.brand {
  display: flex;
  align-items: baseline;
  gap: 12px;
  flex-shrink: 0;
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

.nav {
  display: flex;
  gap: 8px;
}

.nav-link {
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-muted);
  border-radius: 8px;
  padding: 8px 12px;
  font: inherit;
  cursor: pointer;
}

.nav-link.active {
  border-color: var(--primary);
  color: var(--primary);
  background: rgba(255, 102, 0, 0.08);
  font-weight: 600;
}

.actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
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

@media (max-width: 768px) {
  .subtitle,
  .email {
    display: none;
  }
}
</style>
