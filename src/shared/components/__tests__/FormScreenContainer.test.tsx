import React from 'react'
import { Text } from 'react-native'
import { fireEvent, render } from '@testing-library/react-native'
import { withTheme } from '../testHelpers'
import { FormScreenContainer } from '../FormScreenContainer'

describe('FormScreenContainer', () => {
  it('renders its children inside the scrollable, keyboard-aware layout', async () => {
    const { getByText } = await render(
      withTheme(
        <FormScreenContainer>
          <Text>محتوای فرم</Text>
        </FormScreenContainer>
      )
    )
    expect(getByText('محتوای فرم')).toBeTruthy()
  })

  it('allows saving by default when isDirty is not passed', async () => {
    const onSave = jest.fn()
    const { getByLabelText } = await render(
      withTheme(
        <FormScreenContainer headerTitle="عنوان" onSave={onSave}>
          <Text>محتوا</Text>
        </FormScreenContainer>
      )
    )
    fireEvent.press(getByLabelText('ذخیره'))
    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it('disables the save action when isDirty is false', async () => {
    const onSave = jest.fn()
    const { getByLabelText } = await render(
      withTheme(
        <FormScreenContainer headerTitle="عنوان" onSave={onSave} isDirty={false}>
          <Text>محتوا</Text>
        </FormScreenContainer>
      )
    )
    fireEvent.press(getByLabelText('ذخیره'))
    expect(onSave).not.toHaveBeenCalled()
  })

  it('shows a spinner instead of the label while saving', async () => {
    const { queryByText } = await render(
      withTheme(
        <FormScreenContainer headerTitle="عنوان" onSave={jest.fn()} isSaving>
          <Text>محتوا</Text>
        </FormScreenContainer>
      )
    )
    expect(queryByText('ذخیره')).toBeNull()
  })

  it('shows a brief success flash when saveSucceeded is true', async () => {
    const { findByText } = await render(
      withTheme(
        <FormScreenContainer headerTitle="عنوان" onSave={jest.fn()} saveSucceeded>
          <Text>محتوا</Text>
        </FormScreenContainer>
      )
    )
    expect(await findByText('ذخیره شد')).toBeTruthy()
  })
})
