import React from 'react'
import { render } from '@testing-library/react-native'
import { withTheme } from '@shared/components/testHelpers'
import { FloatingActionButton, ListToolbar } from '@shared/components'
import { LicenceContext, OPEN_LICENCE, type Licence } from '@shared/licence/LicenceContext'
import { SubscriptionCard } from '../SubscriptionCard'

jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: jest.fn() }) }))

const ended: Licence = { ...OPEN_LICENCE, canEdit: false, state: 'expired', endsAt: '2026-10-20T00:00:00Z' }

function within(licence: Licence, node: React.ReactElement) {
  return render(withTheme(<LicenceContext.Provider value={licence}>{node}</LicenceContext.Provider>))
}

const toolbar = (
  <ListToolbar
    search=""
    onSearchChange={() => undefined}
    searchPlaceholder="جستجو"
    activeFilterCount={0}
    onOpenFilters={() => undefined}
    filterLabel="فیلترها"
    chips={[]}
  />
)

describe('read-only after the licence ends (Amin #4906)', () => {
  it('keeps the add button and search while the licence is open', async () => {
    const { findByLabelText } = await within(OPEN_LICENCE, <>
      <FloatingActionButton accessibilityLabel="افزودن" onPress={() => undefined} />
      {toolbar}
    </>)
    expect(await findByLabelText('افزودن')).toBeTruthy()
    expect(await findByLabelText('جستجو')).toBeTruthy()
  })

  it('hides adding and searching once it has ended', async () => {
    const { queryByLabelText } = await within(ended, <>
      <FloatingActionButton accessibilityLabel="افزودن" onPress={() => undefined} />
      {toolbar}
    </>)
    expect(queryByLabelText('افزودن')).toBeNull()
    expect(queryByLabelText('جستجو')).toBeNull()
  })

  it('the subscription card says the files stay readable and shows the renewal', async () => {
    const { findByText } = await within(ended, <SubscriptionCard />)
    expect(await findByText('تمام شده؛ پرونده‌ها سر جایشان است و فقط خواندنی‌اند.')).toBeTruthy()
    expect(await findByText('تمدید اشتراک')).toBeTruthy()
    expect(await findByText('به‌زودی اعلام می‌شود')).toBeTruthy()
  })

  it('the trial shows the days left out of the trial days', async () => {
    const endsAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 - 1000).toISOString()
    const { findByText } = await within({ ...OPEN_LICENCE, state: 'trial', endsAt, trialDays: 7, monthlyToman: 290000 }, <SubscriptionCard />)
    expect(await findByText('۵ روز از ۷ روز آزمایش رایگان مانده')).toBeTruthy()
    expect(await findByText('۲۹۰٬۰۰۰ تومان')).toBeTruthy()
  })
})
