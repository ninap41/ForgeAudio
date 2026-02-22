import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import SpinnerOverlay from '../src/components/SpinnerOverlay.vue'

describe('SpinnerOverlay', () => {
  it('renders the spinner element', () => {
    const wrapper = mount(SpinnerOverlay)

    expect(wrapper.find('.spinner').exists()).toBe(true)
  })

  it('shows scanning label', () => {
    const wrapper = mount(SpinnerOverlay)

    expect(wrapper.find('.spinner-label').text()).toBe('Scanning directory...')
  })

  it('has the overlay container', () => {
    const wrapper = mount(SpinnerOverlay)

    expect(wrapper.find('.spinner-overlay').exists()).toBe(true)
  })

  describe('large directory timer', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('does not show large-dir message initially', () => {
      const wrapper = mount(SpinnerOverlay)

      expect(wrapper.find('.spinner-large-dir').exists()).toBe(false)
    })

    it('shows large-dir message after 5 seconds', async () => {
      const wrapper = mount(SpinnerOverlay)

      vi.advanceTimersByTime(5000)
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.spinner-large-dir').exists()).toBe(true)
      expect(wrapper.find('.spinner-large-dir').text()).toBe('Large directory detected — hang tight!')
    })

    it('does not show large-dir message before 5 seconds', async () => {
      const wrapper = mount(SpinnerOverlay)

      vi.advanceTimersByTime(4999)
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.spinner-large-dir').exists()).toBe(false)
    })
  })
})
