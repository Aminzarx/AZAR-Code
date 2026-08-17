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

  it('renders no header at all when neither onBack nor onSave is passed', async () => {
    const { queryByLabelText } = await render(
      withTheme(
        <FormScreenContainer>
          <Text>محتوا</Text>
        </FormScreenContainer>
      )
    )
    expect(queryByLabelText('بازگشت')).toBeNull()
  })

  it('renders a back button and calls onBack when pressed, even without onSave', async () => {
    const onBack = jest.fn()
    const { getByLabelText } = await render(
      withTheme(
        <FormScreenContainer onBack={onBack}>
          <Text>محتوا</Text>
        </FormScreenContainer>
      )
    )
    fireEvent.press(getByLabelText('بازگشت'))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('shows both the back button and the title when a read-only screen passes both', async () => {
    const onBack = jest.fn()
    const { getByLabelText, findByText } = await render(
      withTheme(
        <FormScreenContainer onBack={onBack} headerTitle="عنوان">
          <Text>محتوا</Text>
        </FormScreenContainer>
      )
    )
    expect(getByLabelText('بازگشت')).toBeTruthy()
    expect(await findByText('عنوان')).toBeTruthy()
  })

  it('keeps the back button independently pressable alongside an active save action', async () => {
    const onBack = jest.fn()
    const onSave = jest.fn()
    const { getByLabelText } = await render(
      withTheme(
        <FormScreenContainer onBack={onBack} onSave={onSave} headerTitle="عنوان">
          <Text>محتوا</Text>
        </FormScreenContainer>
      )
    )
    fireEvent.press(getByLabelText('بازگشت'))
    expect(onBack).toHaveBeenCalledTimes(1)
    expect(onSave).not.toHaveBeenCalled()

    fireEvent.press(getByLabelText('ذخیره'))
    expect(onSave).toHaveBeenCalledTimes(1)
  })
})
