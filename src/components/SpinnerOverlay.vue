<template>
  <div class="spinner-overlay">
    <div class="spinner" />
    <p class="spinner-label">Scanning directory...</p>
  </div>
</template>

<style scoped>
.spinner-overlay {
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
</style>
