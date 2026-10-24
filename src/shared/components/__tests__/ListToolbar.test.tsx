import React from 'react'
import { fireEvent, render } from '@testing-library/react-native'
import { ListToolbar } from '../ListToolbar'
import { withTheme } from '../testHelpers'

async function setup(activeFilterCount: number) {
  const handlers = {
    onOpenFilters: jest.fn(),
    onClearAll: jest.fn(),
    onSale: jest.fn(),
    onRemoveType: jest.fn()
  }
  const view = await render(
    withTheme(
      <ListToolbar
        search=""
        onSearchChange={() => {}}
        searchPlaceholder="جست‌وجو"
        activeFilterCount={activeFilterCount}
        onOpenFilters={handlers.onOpenFilters}
        filterLabel="فیلتر فایل‌ها"
        chips={
          activeFilterCount > 1
            ? [{ key: 'type', label: 'آپارتمان', onRemove: handlers.onRemoveType }]
            : []
        }
        quickFilters={[
          { key: 'sale', label: 'فروش', selected: activeFilterCount > 0, onPress: handlers.onSale },
          { key: 'rent', label: 'اجاره', selected: false, onPress: () => {} }
        ]}
        onClearAll={handlers.onClearAll}
      />
    )
  )
  return { handlers, view }
}

describe('ListToolbar (Amin #5067)', () => {
  it('shows the quick chips with «همه فیلترها» first, and no summary while nothing is on', async () => {
    const { handlers, view } = await setup(0)
    const { getByLabelText, queryByText } = view
    await fireEvent.press(getByLabelText('همه فیلترها'))
    expect(handlers.onOpenFilters).toHaveBeenCalledTimes(1)
    await fireEvent.press(getByLabelText('فروش'))
    expect(handlers.onSale).toHaveBeenCalledTimes(1)
    expect(getByLabelText('فروش').props.accessibilityState).toEqual({ selected: false })
    expect(queryByText('پاک کردن همه')).toBeNull()
  })

  it('while filters are on: the quick chip is selected, the count shows, and everything can be cleared', async () => {
    const { handlers, view } = await setup(2)
    const { getByLabelText, getByText } = view
    expect(getByLabelText('فروش').props.accessibilityState).toEqual({ selected: true })
    expect(getByLabelText('فیلتر فایل‌ها').props.accessibilityState).toEqual({ selected: true })
    expect(getByText('۲ فیلتر فعال')).toBeTruthy()
    await fireEvent.press(getByLabelText('حذف فیلتر آپارتمان'))
    expect(handlers.onRemoveType).toHaveBeenCalledTimes(1)
    await fireEvent.press(getByLabelText('پاک کردن همه فیلترها'))
    expect(handlers.onClearAll).toHaveBeenCalledTimes(1)
  })
})
