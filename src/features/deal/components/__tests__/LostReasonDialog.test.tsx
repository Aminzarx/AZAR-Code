import React from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import { withTheme } from '@shared/components/testHelpers'
import { LostReasonDialog } from '../LostReasonDialog'
import type { LostReasonRecord } from '@infrastructure/database/repositories/LostReasonRepository'

const REASONS: LostReasonRecord[] = [
  { id: 'r1', label: 'قیمت بالا', isSystemDefault: true, createdAt: '2026-08-08T00:00:00.000Z' },
  { id: 'r2', label: 'انصراف مشتری', isSystemDefault: true, createdAt: '2026-08-08T00:00:00.000Z' }
]

describe('LostReasonDialog', () => {
  it('disables the confirm button until a reason is selected', async () => {
    const onConfirm = jest.fn()
    const { getByText } = await render(
      withTheme(
        <LostReasonDialog visible reasons={REASONS} onConfirm={onConfirm} onCancel={jest.fn()} />
      )
    )

    await waitFor(() => fireEvent.press(getByText('ثبت به‌عنوان ناموفق')))
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('confirms with the selected reason id', async () => {
    const onConfirm = jest.fn()
    const { getByText } = await render(
      withTheme(
        <LostReasonDialog visible reasons={REASONS} onConfirm={onConfirm} onCancel={jest.fn()} />
      )
    )

    await waitFor(() => fireEvent.press(getByText('انصراف مشتری')))
    await waitFor(() => fireEvent.press(getByText('ثبت به‌عنوان ناموفق')))

    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith('r2'))
  })

  it('calls onCancel and does not call onConfirm when cancelled', async () => {
    const onConfirm = jest.fn()
    const onCancel = jest.fn()
    const { getByText } = await render(
      withTheme(
        <LostReasonDialog visible reasons={REASONS} onConfirm={onConfirm} onCancel={onCancel} />
      )
    )

    await waitFor(() => fireEvent.press(getByText('انصراف')))

    await waitFor(() => expect(onCancel).toHaveBeenCalledTimes(1))
    expect(onConfirm).not.toHaveBeenCalled()
  })
})
