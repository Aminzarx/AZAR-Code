const test = require('node:test')
const assert = require('node:assert/strict')
const fixture = require('./fixtures/divar-gaffwOpk.json')
const { postToken, parsePost, number } = require('../src/divar')

test('post token from a shared link, a long link or a bare token', () => {
  assert.equal(postToken('https://divar.ir/v/gaffwOpk'), 'gaffwOpk')
  assert.equal(postToken('آگهی را ببین https://divar.ir/v/۱۴۲متر/gaffwOpk?x=1'), 'gaffwOpk')
  assert.equal(postToken('gaffwOpk'), 'gaffwOpk')
  assert.equal(postToken('https://example.com/v/gaffwOpk'), null)
})

test('numbers in Persian with separators', () => {
  assert.equal(number('‏۳,۹۷۶,۰۰۰,۰۰۰ تومان'), 3976000000)
  assert.equal(number('۲۶ از بیشتر از ۳۰'), 26)
  assert.equal(number(undefined), null)
})

test('Navid #5653 sample post becomes a new file', () => {
  const post = parsePost(fixture)
  assert.equal(post.token, 'gaffwOpk')
  assert.equal(post.title, '۱۴۲متر/دریاچه‌ چیتگر/فول امکانات/تهاتر')
  assert.equal(post.propertyType, 'آپارتمان')
  assert.deepEqual(post.transactionTypes, ['فروش', 'تهاتر'])
  assert.equal(post.city, 'تهران')
  assert.equal(post.region, 'دریاچه شهدای خلیج فارس')
  assert.equal(post.price, 3976000000)
  assert.equal(post.area, 142)
  assert.equal(post.rooms, 3)
  assert.equal(post.yearBuilt, 1405)
  assert.match(post.floor, /^۲۶/)
  assert.ok(post.description.length > 50)
  assert.equal(post.photos.length, 9)
  assert.ok(post.photos.every((url) => !url.includes('/videos/')))
})

test('an empty or odd answer gives empty fields, not a crash', () => {
  const post = parsePost({})
  assert.equal(post.title, '')
  assert.deepEqual(post.photos, [])
  assert.equal(post.price, null)
})
