import { getNextStage } from '../dealStageLabels'

describe('getNextStage', () => {
  it('returns the following stage in the forward pipeline order', () => {
    expect(getNextStage('new')).toBe('contacted')
    expect(getNextStage('contacted')).toBe('interested')
    expect(getNextStage('interested')).toBe('visit_scheduled')
    expect(getNextStage('visit_scheduled')).toBe('visited')
    expect(getNextStage('visited')).toBe('negotiation')
    expect(getNextStage('negotiation')).toBe('offer')
    expect(getNextStage('offer')).toBe('contract')
  })

  it('returns null once at the last pre-terminal stage', () => {
    expect(getNextStage('contract')).toBeNull()
  })

  it('returns null for already-terminal stages', () => {
    expect(getNextStage('won')).toBeNull()
    expect(getNextStage('lost')).toBeNull()
  })
})
