<template>
  <div id="app-shell">
    <header class="app-header">
      <nav class="nav-tabs">
        <router-link to="/" class="nav-tab" active-class="active">Library</router-link>
        <router-link to="/settings" class="nav-tab" active-class="active">Settings</router-link>
      </nav>
    </header>
    <main class="app-main">
      <router-view />
    </main>
    <Player />
  </div>
</template>

<script setup lang="ts">
import Player from './components/Player.vue'
</script>

<style scoped>
#app-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.app-header {
  flex-shrink: 0;
  border-bottom: 1px solid var(--border);
  background: var(--bg-secondary);
  padding: 0 16px;
}

.nav-tabs {
  display: flex;
  gap: 4px;
  padding-top: 8px;
}

.nav-tab {
  padding: 8px 16px;
  text-decoration: none;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  border-radius: 6px 6px 0 0;
  transition: color 0.15s, background 0.15s;
}

.nav-tab:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.nav-tab.active {
  color: var(--text-primary);
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-bottom-color: var(--bg-primary);
  margin-bottom: -1px;
}

.app-main {
  flex: 1;
  overflow: hidden;
}
</style>
