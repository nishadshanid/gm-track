import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dateKey, addDays, diffDays, lastNDays, weekdayOf, fromKey } from '../src/utils/date.ts'

test('dateKey uses local components, not UTC', () => {
  // 4:30 AM on 22 Sep. In IST (+05:30) the UTC date is still the 21st, so
  // toISOString().slice(0,10) would file his 6:30 AM wake-up meal under
  // yesterday — every single morning.
  const d = new Date(2026, 8, 22, 4, 30)
  assert.equal(dateKey(d), '2026-09-22')
})

test('dateKey pads month and day', () => {
  assert.equal(dateKey(new Date(2026, 0, 5)), '2026-01-05')
})

test('addDays crosses month and year boundaries', () => {
  assert.equal(addDays('2026-01-31', 1), '2026-02-01')
  assert.equal(addDays('2026-12-31', 1), '2027-01-01')
  assert.equal(addDays('2026-03-01', -1), '2026-02-28')
})

test('addDays survives a DST-style shift by rebuilding from local parts', () => {
  assert.equal(addDays('2026-09-22', 7), '2026-09-29')
  assert.equal(diffDays('2026-09-29', '2026-09-22'), 7)
})

test('lastNDays returns n keys, oldest first, ending at the given day', () => {
  const week = lastNDays('2026-09-22', 7)
  assert.equal(week.length, 7)
  assert.equal(week[0], '2026-09-16')
  assert.equal(week[6], '2026-09-22')
})

test('weekdayOf matches the local calendar', () => {
  // 2026-09-22 is a Tuesday.
  assert.equal(weekdayOf('2026-09-22'), 2)
})

test('fromKey round-trips through dateKey', () => {
  const key = '2026-07-04'
  assert.equal(dateKey(fromKey(key)), key)
})
