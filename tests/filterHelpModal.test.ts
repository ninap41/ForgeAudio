import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import FilterHelpModal from '../src/components/FilterHelpModal.vue'

describe('FilterHelpModal', () => {
  function mountModal() {
    return mount(FilterHelpModal)
  }

  it('renders with title "Search Filters"', () => {
    const wrapper = mountModal()
    expect(wrapper.find('h3').text()).toBe('Search Filters')
  })

  it('has role="dialog" and aria-modal', () => {
    const wrapper = mountModal()
    const overlay = wrapper.find('.modal-overlay')
    expect(overlay.attributes('role')).toBe('dialog')
    expect(overlay.attributes('aria-modal')).toBe('true')
  })

  it('has aria-label "Search Filters"', () => {
    const wrapper = mountModal()
    const overlay = wrapper.find('.modal-overlay')
    expect(overlay.attributes('aria-label')).toBe('Search Filters')
  })

  it('renders a table with 4 data rows', () => {
    const wrapper = mountModal()
    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(4)
  })

  it('table has Syntax, Type, Action, Description headers', () => {
    const wrapper = mountModal()
    const headers = wrapper.findAll('thead th').map(th => th.text())
    expect(headers).toEqual(['Syntax', 'Type', 'Action', 'Description'])
  })

  it('first row shows "text" syntax for description include', () => {
    const wrapper = mountModal()
    const firstRow = wrapper.findAll('tbody tr')[0]
    const cells = firstRow.findAll('td')
    expect(cells[0].find('code').text()).toBe('text')
    expect(cells[1].text()).toBe('Description')
    expect(cells[2].text()).toBe('Include')
  })

  it('second row shows "!text" syntax for description exclude', () => {
    const wrapper = mountModal()
    const row = wrapper.findAll('tbody tr')[1]
    const cells = row.findAll('td')
    expect(cells[0].find('code').text()).toBe('!text')
    expect(cells[1].text()).toBe('Description')
    expect(cells[2].text()).toBe('Exclude')
  })

  it('third row shows "#tag" syntax for tag include', () => {
    const wrapper = mountModal()
    const row = wrapper.findAll('tbody tr')[2]
    const cells = row.findAll('td')
    expect(cells[0].find('code').text()).toBe('#tag')
    expect(cells[1].text()).toBe('Tag')
    expect(cells[2].text()).toBe('Include')
  })

  it('fourth row shows "!#tag" syntax for tag exclude', () => {
    const wrapper = mountModal()
    const row = wrapper.findAll('tbody tr')[3]
    const cells = row.findAll('td')
    expect(cells[0].find('code').text()).toBe('!#tag')
    expect(cells[1].text()).toBe('Tag')
    expect(cells[2].text()).toBe('Exclude')
  })

  it('each syntax cell uses <code> element', () => {
    const wrapper = mountModal()
    const syntaxCells = wrapper.findAll('tbody td:first-child code')
    expect(syntaxCells).toHaveLength(4)
  })

  it('has a tips section', () => {
    const wrapper = mountModal()
    expect(wrapper.find('.tips').exists()).toBe(true)
    expect(wrapper.find('.tips-title').text()).toBe('Tips')
  })

  it('tips section has bullet points', () => {
    const wrapper = mountModal()
    const items = wrapper.findAll('.tips li')
    expect(items.length).toBeGreaterThanOrEqual(3)
  })

  it('emits close when BaseModal emits close', async () => {
    const wrapper = mountModal()
    await wrapper.find('.modal-overlay').trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('has a default Close button from BaseModal', () => {
    const wrapper = mountModal()
    const closeBtn = wrapper.find('.modal-actions .btn')
    expect(closeBtn.text()).toBe('Close')
  })

  it('uses maxWidth of 520px', () => {
    const wrapper = mountModal()
    const modal = wrapper.find('.modal')
    expect(modal.attributes('style')).toContain('max-width: 520px')
  })
})
