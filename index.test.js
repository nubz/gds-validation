const validation = require('./index')
const { LocalDate } = require('@js-joda/core')

test('adds commas to long numbers', () => {
  expect(validation.addCommas(1000000)).toBe('1,000,000')
  expect(validation.addCommas('2344424')).toBe('2,344,424')
  expect(validation.addCommas(23248.34)).toBe('23,248.34')
});

test('strips commas from numbers', () => {
  expect(validation.stripCommas('1,000,000')).toBe('1000000')
  expect(validation.stripCommas('2,323')).toBe('2323')
  expect(validation.stripCommas('44,434,432,233.54')).toBe('44434432233.54')
})

test('transforms numbers and number strings to UK currency', () => {
  expect(validation.currencyDisplay('234443.4')).toBe('£234,443.40')
  expect(validation.currencyDisplay(2345)).toBe('£2,345')
})

test('capitalises sentences', () => {
  expect(validation.capitalise('a test sentence')).toBe('A test sentence')
  expect(validation.capitalise('testing this sentence')).toBe('Testing this sentence')
  expect(validation.capitalise('Testing already capitalised')).toBe('Testing already capitalised')
})

test('converts strings of words into slugs', () => {
  expect(validation.slugify('test words to slugify')).toBe('test-words-to-slugify')
  expect(validation.slugify('with 23 numbers, commas and (punctuation)')).toBe('with-23-numbers-commas-and-punctuation')
  expect(validation.slugify('test-hyphenated already')).toBe('test-hyphenated-already')
  expect(validation.slugify('test-----multiple-hyphens in a string!')).toBe('test-multiple-hyphens-in-a-string')
})

const fieldName = 'test name'

const baseModel = {
  fields: {
    test: {
      type: 'optionalString',
      name: fieldName
    }
  }
}

const deleteTestFieldProperty = field => delete baseModel.fields.test[field]
const deleteTestFieldProperties = fields => fields.forEach(deleteTestFieldProperty)
const setTestField = settings => baseModel.fields.test = { ...baseModel.fields.test, ...settings }

test('does not throw error when optionalString field is empty', () => {
  expect(validation.getPageErrors({}, baseModel).text.test).toBeUndefined()
})

test('throws required error when nonEmptyString field is empty', () => {
  setTestField({ type: 'nonEmptyString' })
  const expectedError = validation.errorTemplates.required(fieldName)
  expect(validation.getPageErrors({}, baseModel).text.test).toBe(expectedError)
})

test('does not return error when nonEmptyString field is valid', () => {
  expect(validation.getPageErrors({test: 'string'}, baseModel).text.test).toBeUndefined()
})

test('throws pattern error when regex is not matched', () => {
  setTestField({
    regex: /^[0-9]*$/,
    patternText: 'Test name must only include numbers'
  })
  const expectedError = validation.errorTemplates.pattern(fieldName, baseModel.fields.test.patternText)
  expect(validation.getPageErrors({test: 'ABC123'}, baseModel).text.test).toBe(expectedError)
})

test('throws pattern error when regex is not matched and field is optional', () => {
  setTestField({ type: 'optionalString' })
  const expectedError = validation.errorTemplates.pattern('test', baseModel.fields.test.patternText)
  expect(validation.getPageErrors({test: 'ABC123'}, baseModel).text.test).toBe(expectedError)
})

test('does not throw error when regex is matched', () => {
  expect(validation.getPageErrors({test: '123456'}, baseModel).text.test).toBeUndefined()
})

test('throws exactLength error when exact length is not met', () => {
  setTestField({ exactLength: 3 })
  const expectedError = validation.errorTemplates.exactLength(fieldName, baseModel.fields.test.exactLength, 'characters')
  expect(validation.getPageErrors({test: 'ABC123'}, baseModel).text.test).toBe(expectedError)
})

test('does not throw error when exact length is met', () => {
  expect(validation.getPageErrors({test: '123'}, baseModel).text.test).toBeUndefined()
})

test('throws betweenMinAndMax error when answer is not between min and max', () => {
  const min = 3
  const max = 5
  deleteTestFieldProperty('exactLength')
  setTestField({ minLength: min, maxLength: max })
  const expectedError = validation.errorTemplates.betweenMinAndMax(fieldName, min, max)
  expect(validation.getPageErrors({test: '1'}, baseModel).text.test).toBe(expectedError)
  expect(validation.getPageErrors({test: '123456'}, baseModel).text.test).toBe(expectedError)
})

test('does not throw error when answer is between min and max', () => {
  expect(validation.getPageErrors({test: '1234'}, baseModel).text.test).toBeUndefined()
})

test('throws tooShort error when answer is shorter than minimum length', () => {
  deleteTestFieldProperty('maxLength')
  const expectedError = validation.errorTemplates.tooShort(fieldName, 3)
  expect(validation.getPageErrors({test: '12'}, baseModel).text.test).toBe(expectedError)
})

test('does not throw error when answer is on or above minimum length', () => {
  expect(validation.getPageErrors({test: '123'}, baseModel).text.test).toBeUndefined()
  expect(validation.getPageErrors({test: '1234'}, baseModel).text.test).toBeUndefined()
})

test('throws currency error when answer is not able to be converted to a currency amount', () => {
  deleteTestFieldProperties(['minLength', 'regex', 'patternText'])
  setTestField({ type: 'currency' })
  const expectedError = validation.errorTemplates.currency(fieldName)
  expect(validation.getPageErrors({test: 'twelve'}, baseModel).text.test).toBe(expectedError)
})

test('does not throw currency error when answer is able to be converted to a currency amount', () => {
  expect(validation.getPageErrors({test: '123'}, baseModel).text.test).toBeUndefined()
  expect(validation.getPageErrors({test: '12.34'}, baseModel).text.test).toBeUndefined()
})

test('throws currencyMin error when answer is less than minimum amount', () => {
  setTestField({ currencyMin: 50 })
  const expectedError = validation.errorTemplates.currencyMin(fieldName, 50)
  expect(validation.getPageErrors({test: '12'}, baseModel).text.test).toBe(expectedError)
})

test('does not throw currencyMin error when answer is on or above the minimum amount', () => {
  expect(validation.getPageErrors({test: '123'}, baseModel).text.test).toBeUndefined()
  expect(validation.getPageErrors({test: '1234'}, baseModel).text.test).toBeUndefined()
})

test('throws numberMin error when answer is less than minimum amount', () => {
  deleteTestFieldProperty('currencyMin')
  setTestField({ type: 'number', numberMin: 50 })
  const expectedError = validation.errorTemplates.numberMin(fieldName, 50)
  expect(validation.getPageErrors({test: 12}, baseModel).text.test).toBe(expectedError)
})

test('does not throw numberMin error when answer is on or above the minimum amount', () => {
  expect(validation.getPageErrors({test: 123}, baseModel).text.test).toBeUndefined()
  expect(validation.getPageErrors({test: 1234}, baseModel).text.test).toBeUndefined()
})

test('throws currencyMax error when answer is more than maximum amount', () => {
  deleteTestFieldProperty('numberMin')
  setTestField({ type: 'currency', currencyMax: 50 })
  const expectedError = validation.errorTemplates.currencyMax(fieldName, 50)
  expect(validation.getPageErrors({test: '52'}, baseModel).text.test).toBe(expectedError)
})

test('does not throw currencyMax error when answer is on or below the maximum amount', () => {
  expect(validation.getPageErrors({test: '12'}, baseModel).text.test).toBeUndefined()
  expect(validation.getPageErrors({test: '50'}, baseModel).text.test).toBeUndefined()
})

test('throws numberMax error when answer is more than maximum amount', () => {
  deleteTestFieldProperty('currencyMax')
  setTestField({ type: 'number', numberMax: 50 })
  const expectedError = validation.errorTemplates.numberMax(fieldName, 50)
  expect(validation.getPageErrors({test: 52}, baseModel).text.test).toBe(expectedError)
})

test('does not throw numberMax error when answer is on or below the maximum amount', () => {
  expect(validation.getPageErrors({test: 12}, baseModel).text.test).toBeUndefined()
  expect(validation.getPageErrors({test: 50}, baseModel).text.test).toBeUndefined()
})

test('throws currencyMaxField error when answer is more than the amount from another field', () => {
  setTestField({
    type: 'currency',
    currencyMaxField: 'otherAmount',
    getMaxCurrencyFromField: data => data.otherAmount
  })
  deleteTestFieldProperty('numberMax')
  const otherAmount = 100
  const expectedError = validation.errorTemplates.currencyMaxField(fieldName, 'otherAmount', otherAmount)
  expect(validation.getPageErrors({ test: 101, otherAmount: otherAmount }, baseModel).text.test).toBe(expectedError)
})

test('does not throw currencyMaxField error when answer not more than the amount from another field', () => {
  expect(validation.getPageErrors({ test: 99, otherAmount: 100 }, baseModel).text.test).toBeUndefined()
  expect(validation.getPageErrors({ test: 100, otherAmount: 100 }, baseModel).text.test).toBeUndefined()
})

test('throws date error when an invalid date is answered', () => {
  setTestField({
    type: 'date',
    name: 'Date'
  })
  deleteTestFieldProperty('currencyMaxField', 'getMaxCurrencyFromField')
  const expectedError = validation.errorTemplates.date('Date')
  expect(validation.getPageErrors({ test: '2000-99-99' }, baseModel).text.test).toBe(expectedError)
})

test('throws date error when no date is answered', () => {
  const expectedError = validation.errorTemplates.required('Date')
  expect(validation.getPageErrors({ test: '' }, baseModel).text.test).toBe(expectedError)
})

test('does not throw date error when valid date is answered', () => {
  expect(validation.getPageErrors({ test: '2021-10-04' }, baseModel).text.test).toBeUndefined()
})

test('throws beforeToday error when date is not before today', () => {
  setTestField({
    beforeToday: true
  })
  const expectedError = validation.errorTemplates.beforeToday('Date')
  const tomorrow = LocalDate.now().plusDays(1)
  expect(validation.getPageErrors({ test: tomorrow.toString() }, baseModel).text.test).toBe(expectedError)
})

test('does not throw beforeToday error when date is before today', () => {
  expect(validation.getPageErrors({ test: '2000-01-01' }, baseModel).text.test).toBeUndefined()
})

test('throws afterFixedDate error when date is not after supplied fixed date', () => {
  const fixedDate = '2010-11-16'
  deleteTestFieldProperty('beforeToday')
  setTestField({
    afterFixedDate: fixedDate
  })
  const expectedError = validation.errorTemplates.afterFixedDate('Date', fixedDate)
  expect(validation.getPageErrors({ test: '2009-10-04' }, baseModel).text.test).toBe(expectedError)
})

test('does not throw afterFixedDate error when date is after fixed date', () => {
  expect(validation.getPageErrors({ test: '2010-11-17' }, baseModel).text.test).toBeUndefined()
})

test('throws beforeFixedDate error when date is not before supplied fixed date', () => {
  const fixedDate = '2010-11-16'
  deleteTestFieldProperty('afterFixedDate')
  setTestField({
    beforeFixedDate: fixedDate
  })
  const expectedError = validation.errorTemplates.beforeFixedDate('Date', fixedDate)
  expect(validation.getPageErrors({ test: '2011-10-04' }, baseModel).text.test).toBe(expectedError)
})

test('does not throw beforeFixedDate error when date is before fixed date', () => {
  expect(validation.getPageErrors({ test: '2010-11-15' }, baseModel).text.test).toBeUndefined()
})

test('throws beforeDate error when date is not before the date in another field', () => {
  const otherDate = '2020-02-02'
  deleteTestFieldProperty('beforeFixedDate')
  setTestField({
    beforeField: 'otherDate',
    beforeDateField: data => data.otherDate
  })
  const expectedError = validation.errorTemplates.beforeDate('Date', 'otherDate', otherDate)
  expect(validation.getPageErrors({ test: '2020-03-01', otherDate: otherDate }, baseModel).text.test).toBe(expectedError)
})

test('does not throw beforeDate error when date is before the date in another field', () => {
  expect(validation.getPageErrors({ test: '2010-11-15', otherDate: '2020-10-04' }, baseModel).text.test).toBeUndefined()
})

test('throws afterDate error when date is not after the date in another field', () => {
  const otherDate = '2020-02-02'
  deleteTestFieldProperties(['beforeDateField', 'evalBeforeDateValue', 'beforeField'])
  setTestField({
    afterField: 'otherDate',
    afterDateField: data => data.otherDate
  })
  const expectedError = validation.errorTemplates.afterDate('Date', 'otherDate', otherDate)
  expect(validation.getPageErrors({ test: '2020-01-01', otherDate: otherDate }, baseModel).text.test).toBe(expectedError)
})

test('does not throw afterDate error when date is after the date in another field', () => {
  setTestField({
    afterField: 'otherDate',
    afterDateField: data => data.otherDate
  })
  expect(validation.getPageErrors({ test: '2020-11-15', otherDate: '2020-10-04' }, baseModel).text.test).toBeUndefined()
})
