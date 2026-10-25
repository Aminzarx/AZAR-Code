/** how far (dp) or how fast (dp/s) a horizontal swipe has to go before it changes the tab */
const SWIPE_DISTANCE = 60
const SWIPE_VELOCITY = 500

/**
 * Amin #5046: which tab a finished horizontal swipe leads to, or null to stay. The tabs follow the tab bar: in Persian
 * (RTL) the next tab sits to the LEFT of the current one, so pulling the page to the right (a positive translationX)
 * brings it in, as with a page turned in a Persian book; in LTR it is the other way round. No wrap-around at the ends.
 */
export function swipeTarget(
  index: number,
  count: number,
  translationX: number,
  velocityX: number,
  isRTL: boolean
): number | null {
  const far = Math.abs(translationX) >= SWIPE_DISTANCE
  const fast =
    Math.abs(velocityX) >= SWIPE_VELOCITY && Math.sign(velocityX) === Math.sign(translationX)
  if (!far && !fast) return null
  const towardNext = isRTL ? translationX > 0 : translationX < 0
  const target = index + (towardNext ? 1 : -1)
  return target >= 0 && target < count ? target : null
}

/**
 * Amin #5182: on an inner page of a tab, a swipe to the LEFT (in his words «سواپ به چپ») goes back one page. Same
 * distance/speed as the tab swipe; a flick the other way never counts.
 */
export function backSwipe(translationX: number, velocityX: number): boolean {
  if (translationX >= 0) return false
  return -translationX >= SWIPE_DISTANCE || velocityX <= -SWIPE_VELOCITY
}
