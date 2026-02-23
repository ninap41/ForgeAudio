import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseModal from '../src/components/BaseModal.vue'

describe('BaseModal', () => {
  it('renders title in h3', () => {
    const wrapper = mount(BaseModal, {
      props: { title: 'Test Title' },
    })

    expect(wrapper.find('h3').text()).toBe('Test Title')
  })

  it('renders subtitle slot content', () => {
    const wrapper = mount(BaseModal, {
      props: { title: 'Test' },
      slots: {
        subtitle: '<p class="modal-subtitle">Subtitle text</p>',
      },
    })

    expect(wrapper.find('.modal-subtitle').text()).toBe('Subtitle text')
  })

  it('renders default slot content', () => {
    const wrapper = mount(BaseModal, {
      props: { title: 'Test' },
      slots: {
        default: '<div class="custom-body">Body content</div>',
      },
    })

    expect(wrapper.find('.custom-body').text()).toBe('Body content')
  })

  it('renders custom actions slot', () => {
    const wrapper = mount(BaseModal, {
      props: { title: 'Test' },
      slots: {
        actions: '<button class="btn btn-accent">Save</button>',
      },
    })

    expect(wrapper.find('.btn-accent').text()).toBe('Save')
    // The default Close button should not be present
    expect(wrapper.findAll('.btn').every(b => b.text() !== 'Close')).toBe(true)
  })

  it('default actions slot shows Close button', () => {
    const wrapper = mount(BaseModal, {
      props: { title: 'Test' },
    })

    const closeBtn = wrapper.find('.modal-actions .btn')
    expect(closeBtn.text()).toBe('Close')
  })

  it('emits close on overlay click (not on .modal click)', async () => {
    const wrapper = mount(BaseModal, {
      props: { title: 'Test' },
    })

    // Click on the modal content — should NOT emit close
    await wrapper.find('.modal').trigger('click')
    expect(wrapper.emitted('close')).toBeFalsy()

    // Click on the overlay — should emit close
    await wrapper.find('.modal-overlay').trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('emits close on Escape keydown', async () => {
    const wrapper = mount(BaseModal, {
      props: { title: 'Test' },
    })

    await wrapper.find('.modal-overlay').trigger('keydown', { key: 'Escape' })

    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('sets aria-label from prop', () => {
    const wrapper = mount(BaseModal, {
      props: { title: 'Test', ariaLabel: 'Custom Label' },
    })

    expect(wrapper.find('.modal-overlay').attributes('aria-label')).toBe('Custom Label')
  })

  it('falls back to title for aria-label', () => {
    const wrapper = mount(BaseModal, {
      props: { title: 'Fallback Title' },
    })

    expect(wrapper.find('.modal-overlay').attributes('aria-label')).toBe('Fallback Title')
  })

  it('applies maxWidth style to .modal', () => {
    const wrapper = mount(BaseModal, {
      props: { title: 'Test', maxWidth: '600px' },
    })

    const modal = wrapper.find('.modal')
    expect(modal.attributes('style')).toContain('max-width: 600px')
  })

  it('uses default maxWidth of 400px', () => {
    const wrapper = mount(BaseModal, {
      props: { title: 'Test' },
    })

    const modal = wrapper.find('.modal')
    expect(modal.attributes('style')).toContain('max-width: 400px')
  })

  it('has role=dialog and aria-modal=true', () => {
    const wrapper = mount(BaseModal, {
      props: { title: 'Test' },
    })

    const overlay = wrapper.find('.modal-overlay')
    expect(overlay.attributes('role')).toBe('dialog')
    expect(overlay.attributes('aria-modal')).toBe('true')
  })
})
