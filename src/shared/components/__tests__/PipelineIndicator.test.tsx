import React from 'react'
import { render } from '@testing-library/react-native'
import { withTheme } from '../testHelpers'
import { PipelineIndicator } from '../PipelineIndicator'

describe('PipelineIndicator', () => {
  it('renders the 4 in-progress group labels', async () => {
    const { getByText } = await render(withTheme(<PipelineIndicator stage="negotiation" />))
    expect(getByText('تماس')).toBeTruthy()
    expect(getByText('بازدید')).toBeTruthy()
    expect(getByText('مذاکره')).toBeTruthy()
    expect(getByText('قرارداد')).toBeTruthy()
  })

  it('renders a terminal won badge instead of the step row', async () => {
    const { getByText, queryByText } = await render(withTheme(<PipelineIndicator stage="won" />))
    expect(getByText('موفق')).toBeTruthy()
    expect(queryByText('تماس')).toBeNull()
  })

  it('renders a terminal lost badge instead of the step row', async () => {
    const { getByText, queryByText } = await render(withTheme(<PipelineIndicator stage="lost" />))
    expect(getByText('لغوشده')).toBeTruthy()
    expect(queryByText('قرارداد')).toBeNull()
  })
})
