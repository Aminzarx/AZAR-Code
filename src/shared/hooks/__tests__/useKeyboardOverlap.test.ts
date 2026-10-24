import { scrollToShow } from '../useKeyboardOverlap'

describe('scrollToShow (Amin #5057)', () => {
  const view = { scrollY: 100, height: 300 } // shows 100..400 of the form

  it('leaves a field that is already in view', () => {
    expect(scrollToShow({ top: 150, bottom: 200 }, view)).toBeNull()
  })

  it('scrolls down so a field under the keyboard shows with a margin', () => {
    expect(scrollToShow({ top: 420, bottom: 470 }, view)).toBe(470 + 24 - 300)
  })

  it('scrolls up to a field above the visible part, never past the top', () => {
    expect(scrollToShow({ top: 60, bottom: 110 }, view)).toBe(36)
    expect(scrollToShow({ top: 10, bottom: 60 }, { scrollY: 20, height: 300 })).toBe(0)
  })
})
