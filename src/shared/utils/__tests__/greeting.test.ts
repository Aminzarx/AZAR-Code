import { getTimeBasedGreeting, isNightOwlHour, NIGHT_LINES, pickNightLine } from '../greeting'

const at = (hour: number) => new Date(2026, 9, 27, hour, 30)

describe('home greeting (Amin #5749)', () => {
  it('says «سلام» by day and «شب بخیر» in the evening and night', () => {
    expect(getTimeBasedGreeting(at(9))).toBe('سلام')
    expect(getTimeBasedGreeting(at(17))).toBe('سلام')
    expect(getTimeBasedGreeting(at(20))).toBe('شب بخیر')
    expect(getTimeBasedGreeting(at(2))).toBe('شب بخیر')
  })

  it('night lines only between 01:00 and 04:00', () => {
    expect([0, 1, 3, 4].map((h) => isNightOwlHour(at(h)))).toEqual([false, true, true, false])
  })

  it('picks one of the four lines', () => {
    expect(pickNightLine(() => 0)).toBe(NIGHT_LINES[0])
    expect(pickNightLine(() => 0.99)).toBe(NIGHT_LINES[3])
    expect(NIGHT_LINES).toContain(pickNightLine())
  })
})
