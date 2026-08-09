import React from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import { withTheme } from '../testHelpers'
import { AutocompleteInput } from '../AutocompleteInput'

const SUGGESTIONS = ['آپارتمان', 'ویلایی', 'زمین', 'مغازه', 'دفتر']

describe('AutocompleteInput', () => {
  it('lets the user type freely without forcing a selection', async () => {
    const onChangeValue = jest.fn()
    const { getByLabelText } = await render(
      withTheme(
        <AutocompleteInput
          label="نوع ملک"
          value=""
          onChangeValue={onChangeValue}
          suggestions={SUGGESTIONS}
        />
      )
    )
    fireEvent.changeText(getByLabelText('نوع ملک'), 'یک مکان عجیب')
    expect(onChangeValue).toHaveBeenCalledWith('یک مکان عجیب')
  })

  it('shows matching suggestions while focused and typing', async () => {
    const { getByLabelText, findByLabelText } = await render(
      withTheme(
        <AutocompleteInput
          label="نوع ملک"
          value="آپار"
          onChangeValue={jest.fn()}
          suggestions={SUGGESTIONS}
        />
      )
    )
    fireEvent(getByLabelText('نوع ملک'), 'focus')
    expect(await findByLabelText('آپارتمان')).toBeTruthy()
  })

  it('fills the field when a suggestion is pressed', async () => {
    const onChangeValue = jest.fn()
    const { getByLabelText, findByLabelText } = await render(
      withTheme(
        <AutocompleteInput
          label="نوع ملک"
          value="آپار"
          onChangeValue={onChangeValue}
          suggestions={SUGGESTIONS}
        />
      )
    )
    fireEvent(getByLabelText('نوع ملک'), 'focus')
    fireEvent.press(await findByLabelText('آپارتمان'))
    expect(onChangeValue).toHaveBeenCalledWith('آپارتمان')
  })

  it('shows a typo-correction hint after blur, without overwriting the input', async () => {
    const onChangeValue = jest.fn()
    const { getByLabelText, findByLabelText } = await render(
      withTheme(
        <AutocompleteInput
          label="نوع ملک"
          value="آبارتمان"
          onChangeValue={onChangeValue}
          suggestions={SUGGESTIONS}
        />
      )
    )
    fireEvent(getByLabelText('نوع ملک'), 'blur')
    const hint = await findByLabelText('اصلاح به آپارتمان')
    expect(onChangeValue).not.toHaveBeenCalled()

    fireEvent.press(hint)
    await waitFor(() => expect(onChangeValue).toHaveBeenCalledWith('آپارتمان'))
  })

  it('does not show a typo hint for an exact match', async () => {
    const { getByLabelText, queryByLabelText } = await render(
      withTheme(
        <AutocompleteInput
          label="نوع ملک"
          value="آپارتمان"
          onChangeValue={jest.fn()}
          suggestions={SUGGESTIONS}
        />
      )
    )
    fireEvent(getByLabelText('نوع ملک'), 'blur')
    expect(queryByLabelText('اصلاح به آپارتمان')).toBeNull()
  })
})
