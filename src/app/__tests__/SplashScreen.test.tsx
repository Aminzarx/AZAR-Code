import React from 'react'
import { act, render } from '@testing-library/react-native'
import { SPLASH_MIN_MS, useSplash } from '../SplashScreen'

function Probe({ ready, seen }: { ready: boolean; seen: (done: boolean) => void }) {
  const splash = useSplash(ready)
  seen(splash.done)
  return null
}

describe('splash (Amin #4936)', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  it('stays at least 3 s even when the app is ready at once', async () => {
    let done = false
    await render(<Probe ready seen={(d) => (done = d)} />)
    await act(async () => jest.advanceTimersByTime(SPLASH_MIN_MS - 1))
    expect(done).toBe(false)
    await act(async () => jest.advanceTimersByTime(1))
    expect(done).toBe(true)
  })

  it('stays past 3 s until the app is really ready', async () => {
    let done = false
    const view = await render(<Probe ready={false} seen={(d) => (done = d)} />)
    await act(async () => jest.advanceTimersByTime(SPLASH_MIN_MS * 3))
    expect(done).toBe(false)
    await view.rerender(<Probe ready seen={(d) => (done = d)} />)
    expect(done).toBe(true)
  })
})
