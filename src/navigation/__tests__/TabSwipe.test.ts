import { backSwipe, swipeTarget } from '../TabSwipe'

describe('swipeTarget (Amin #5046)', () => {
  it('in Persian, pulling the page to the right brings the next tab (it sits to the left in the bar)', () => {
    expect(swipeTarget(0, 5, 120, 0, true)).toBe(1)
    expect(swipeTarget(2, 5, -120, 0, true)).toBe(1)
  })

  it('in LTR it is the other way round', () => {
    expect(swipeTarget(0, 5, -120, 0, false)).toBe(1)
    expect(swipeTarget(2, 5, 120, 0, false)).toBe(1)
  })

  it('a short slow drag stays; a short fast flick in the same direction moves', () => {
    expect(swipeTarget(1, 5, 30, 100, true)).toBeNull()
    expect(swipeTarget(1, 5, 30, 900, true)).toBe(2)
    expect(swipeTarget(1, 5, 30, -900, true)).toBeNull() // flicked back
  })

  it('stops at the ends, no wrap-around', () => {
    expect(swipeTarget(0, 5, -120, 0, true)).toBeNull()
    expect(swipeTarget(4, 5, 120, 0, true)).toBeNull()
  })
})

describe('backSwipe (Amin #5182)', () => {
  it('a swipe to the left, far or fast enough, goes back', () => {
    expect(backSwipe(-120, 0)).toBe(true)
    expect(backSwipe(-30, -900)).toBe(true)
  })

  it('a short swipe, or one to the right, does not', () => {
    expect(backSwipe(-30, -100)).toBe(false)
    expect(backSwipe(120, 0)).toBe(false)
    expect(backSwipe(30, -900)).toBe(false)
  })
})
