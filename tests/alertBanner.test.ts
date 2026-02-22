import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import AlertBanner from '../src/components/AlertBanner.vue'

describe('AlertBanner', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders message text', () => {
    const wrapper = mount(AlertBanner, {
      props: { type: 'success', message: 'Scan complete' },
    })

    expect(wrapper.find('.alert-message').text()).toBe('Scan complete')
  })

  it('renders details when provided', () => {
    const wrapper = mount(AlertBanner, {
      props: { type: 'info', message: 'Done', details: 'in 2.3s' },
    })

    expect(wrapper.find('.alert-details').text()).toBe('in 2.3s')
  })

  it('omits details when not provided', () => {
    const wrapper = mount(AlertBanner, {
      props: { type: 'info', message: 'Done' },
    })

    expect(wrapper.find('.alert-details').exists()).toBe(false)
  })

  it('applies correct CSS class for success type', () => {
    const wrapper = mount(AlertBanner, {
      props: { type: 'success', message: 'OK' },
    })

    expect(wrapper.find('.alert-success').exists()).toBe(true)
  })

  it('applies correct CSS class for error type', () => {
    const wrapper = mount(AlertBanner, {
      props: { type: 'error', message: 'Fail' },
    })

    expect(wrapper.find('.alert-error').exists()).toBe(true)
  })

  it('applies correct CSS class for info type', () => {
    const wrapper = mount(AlertBanner, {
      props: { type: 'info', message: 'Info' },
    })

    expect(wrapper.find('.alert-info').exists()).toBe(true)
  })

  it('applies correct CSS class for warning type', () => {
    const wrapper = mount(AlertBanner, {
      props: { type: 'warning', message: 'Warn' },
    })

    expect(wrapper.find('.alert-warning').exists()).toBe(true)
  })

  it('has role="alert" for accessibility', () => {
    const wrapper = mount(AlertBanner, {
      props: { type: 'success', message: 'Done' },
    })

    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
  })

  it('shows dismiss button by default', () => {
    const wrapper = mount(AlertBanner, {
      props: { type: 'success', message: 'Done' },
    })

    expect(wrapper.find('.alert-dismiss').exists()).toBe(true)
  })

  it('hides dismiss button when dismissible is false', () => {
    const wrapper = mount(AlertBanner, {
      props: { type: 'success', message: 'Done', dismissible: false },
    })

    expect(wrapper.find('.alert-dismiss').exists()).toBe(false)
  })

  it('dismiss button has aria-label', () => {
    const wrapper = mount(AlertBanner, {
      props: { type: 'success', message: 'Done' },
    })

    expect(wrapper.find('.alert-dismiss').attributes('aria-label')).toBe('Dismiss alert')
  })

  it('auto-dismisses after duration', async () => {
    const wrapper = mount(AlertBanner, {
      props: { type: 'success', message: 'Done', duration: 3000 },
    })

    expect(wrapper.find('.alert-banner').exists()).toBe(true)

    vi.advanceTimersByTime(3000)
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.alert-banner').exists()).toBe(false)
  })

  it('does not auto-dismiss when duration is 0', async () => {
    const wrapper = mount(AlertBanner, {
      props: { type: 'success', message: 'Done', duration: 0 },
    })

    vi.advanceTimersByTime(10000)
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.alert-banner').exists()).toBe(true)
  })

  it('hides on manual dismiss click', async () => {
    const wrapper = mount(AlertBanner, {
      props: { type: 'success', message: 'Done', duration: 0 },
    })

    await wrapper.find('.alert-dismiss').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.alert-banner').exists()).toBe(false)
  })
})
