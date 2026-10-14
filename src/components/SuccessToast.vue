<script setup lang="ts">
withDefaults(
  defineProps<{
    visible: boolean
    title?: string
    subtitle?: string
  }>(),
  {
    title: '保存成功',
    subtitle: '记录已更新',
  },
)
</script>

<template>
  <Teleport to="body">
    <Transition name="success-toast">
      <div v-if="visible" class="success-toast" role="status" aria-live="polite">
        <div class="success-toast__card">
          <div class="success-toast__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" class="success-toast__icon-ring" />
              <path
                d="M8 12.5l2.5 2.5L16 9.5"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>
          <div class="success-toast__body">
            <p class="success-toast__title">{{ title }}</p>
            <p v-if="subtitle" class="success-toast__subtitle">{{ subtitle }}</p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.success-toast {
  position: fixed;
  left: 50%;
  bottom: calc(28px + env(safe-area-inset-bottom, 0px));
  z-index: 1000;
  transform: translateX(-50%);
  pointer-events: none;
  width: min(420px, calc(100vw - 32px));
}

.success-toast__card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(16, 185, 129, 0.22);
  box-shadow:
    0 20px 50px rgba(15, 23, 42, 0.14),
    0 4px 12px rgba(15, 23, 42, 0.06);
  backdrop-filter: blur(10px);
}

.success-toast__icon {
  flex-shrink: 0;
  width: 42px;
  height: 42px;
  color: #059669;
}

.success-toast__icon svg {
  width: 100%;
  height: 100%;
}

.success-toast__icon-ring {
  fill: #ecfdf5;
  stroke: #a7f3d0;
  stroke-width: 1;
}

.success-toast__body {
  min-width: 0;
}

.success-toast__title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  line-height: 1.35;
}

.success-toast__subtitle {
  margin: 2px 0 0;
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.4;
}

.success-toast-enter-active,
.success-toast-leave-active {
  transition:
    opacity 0.28s ease,
    transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
}

.success-toast-enter-from,
.success-toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(18px) scale(0.98);
}

.success-toast-enter-to,
.success-toast-leave-from {
  opacity: 1;
  transform: translateX(-50%) translateY(0) scale(1);
}
</style>
