import { amountInWords } from '../amountInWords'

describe('amountInWords', () => {
  it('names a typical sale price', () => {
    expect(amountInWords('8500000000')).toBe('هشت میلیارد و پانصد میلیون تومان')
  })

  it('handles teens, tens and hundreds inside a group', () => {
    expect(amountInWords('2015000')).toBe('دو میلیون و پانزده هزار تومان')
    expect(amountInWords('45750000')).toBe('چهل و پنج میلیون و هفتصد و پنجاه هزار تومان')
  })

  it('is empty for nothing, zero, or a number too long to name', () => {
    expect(amountInWords('')).toBe('')
    expect(amountInWords('000')).toBe('')
    expect(amountInWords('1234567890123456')).toBe('')
  })
})
