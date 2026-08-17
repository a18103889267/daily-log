<script setup lang="ts">
import { RouterView } from 'vue-router'
import { useAuthBootstrap } from './composables/useAuth'

useAuthBootstrap()
</script>

<template>
  <RouterView />
</template>
