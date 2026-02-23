<template>
  <div class="spinner-overlay">
    <div class="spinner" />
    <p class="spinner-label">Scanning directory...</p>
    <p v-if="isLargeDir" class="spinner-large-dir">Large directory detected — hang tight!</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue"

const isLargeDir = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null

onMounted(() => {
  timer = setTimeout(() => {
    isLargeDir.value = true
  }, 5000)
})

onUnmounted(() => {
  if (timer !== null) {
    clearTimeout(timer)
  }
})
</script>

<style scoped>
.spinner-overlay {
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: var(--text-secondary);
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.spinner-label {
  font-size: 13px;
}

.spinner-large-dir {
  font-size: 11px;
  color: var(--text-muted, var(--text-secondary));
  opacity: 0.7;
}
</style>
