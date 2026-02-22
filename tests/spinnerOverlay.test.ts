import { describe, it, expect } from 'vitest'
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
})
