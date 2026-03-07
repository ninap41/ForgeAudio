import { createRouter, createWebHashHistory } from 'vue-router'
import LibraryView from './views/LibraryView.vue'
import SettingsView from './views/SettingsView.vue'
import MidiView from './views/MidiView.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'library', component: LibraryView },
    { path: '/midi', name: 'midi', component: MidiView },
    { path: '/settings', name: 'settings', component: SettingsView },
  ],
})

export default router
