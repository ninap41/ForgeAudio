import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DockPanel from '../src/components/DockPanel.vue'

function createWrapper(props: Partial<InstanceType<typeof DockPanel>['$props']> = {}) {
  return mount(DockPanel, {
    props: {
      panelId: 'test-panel',
      title: 'Test Panel',
      collapsed: false,
      ...props,
    },
    slots: {
      default: '<div class="slot-content">Body content</div>',
    },
  })
}

describe('DockPanel', () => {
  describe('rendering', () => {
    it('renders the title', () => {
      const wrapper = createWrapper()
      expect(wrapper.find('.dock-panel-title').text()).toBe('Test Panel')
    })

    it('renders the body slot', () => {
      const wrapper = createWrapper()
      expect(wrapper.find('.slot-content').text()).toBe('Body content')
    })

    it('applies default dimensions', () => {
      const wrapper = createWrapper()
      const style = wrapper.find('.dock-panel').attributes('style')
      expect(style).toContain('width: 280px')
      expect(style).toContain('height: 350px')
    })

    it('applies custom dimensions', () => {
      const wrapper = createWrapper({ width: 400, height: 500 })
      const style = wrapper.find('.dock-panel').attributes('style')
      expect(style).toContain('width: 400px')
      expect(style).toContain('height: 500px')
    })
  })

  describe('collapsed state', () => {
    it('hides body when collapsed', () => {
      const wrapper = createWrapper({ collapsed: true })
      expect(wrapper.find('.dock-panel-body').exists()).toBe(false)
    })

    it('sets height to auto when collapsed', () => {
      const wrapper = createWrapper({ collapsed: true })
      const style = wrapper.find('.dock-panel').attributes('style')
      expect(style).toContain('height: auto')
    })

    it('adds collapsed class when collapsed', () => {
      const wrapper = createWrapper({ collapsed: true })
      expect(wrapper.find('.dock-panel').classes()).toContain('dock-panel--collapsed')
    })

    it('does not add collapsed class when expanded', () => {
      const wrapper = createWrapper({ collapsed: false })
      expect(wrapper.find('.dock-panel').classes()).not.toContain('dock-panel--collapsed')
    })
  })

  describe('events', () => {
    it('emits toggle-collapse on title bar click', async () => {
      const wrapper = createWrapper()
      await wrapper.find('.dock-panel-titlebar').trigger('click')
      expect(wrapper.emitted('toggle-collapse')).toHaveLength(1)
    })

    it('emits toggle-collapse on collapse button click', async () => {
      const wrapper = createWrapper()
      const buttons = wrapper.findAll('.dock-panel-btn')
      await buttons[0].trigger('click')
      // .stop prevents double-emit: only the button's handler fires, not titlebar's
      expect(wrapper.emitted('toggle-collapse')).toHaveLength(1)
    })

    it('emits close on close button click', async () => {
      const wrapper = createWrapper()
      const buttons = wrapper.findAll('.dock-panel-btn')
      await buttons[1].trigger('click')
      expect(wrapper.emitted('close')).toHaveLength(1)
    })

    it('does not emit toggle-collapse on close button click', async () => {
      const wrapper = createWrapper()
      const buttons = wrapper.findAll('.dock-panel-btn')
      await buttons[1].trigger('click')
      // .stop on close button prevents titlebar click from firing
      expect(wrapper.emitted('toggle-collapse')).toBeUndefined()
    })
  })
})
