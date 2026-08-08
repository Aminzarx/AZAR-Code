/**
 * Confirms the Jest test runner itself works, so later phases inherit a
 * working test harness instead of debugging test infrastructure while
 * also trying to write real tests (Phase 5 acceptance criteria).
 */
describe('test harness sanity', () => {
  it('runs a trivial assertion', () => {
    expect(1 + 1).toBe(2)
  })
})
