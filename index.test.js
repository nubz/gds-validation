const validation = require('./index')
const { LocalDate } = require('@js-joda/core')

describe('utilities used by error generation and validation', () => {

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

  test('currency display returns empty string if no value passed', () => {
    expect(validation.currencyDisplay()).toBe('')
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

  test('zero pads string representations of numbers below 10', () => {
    expect(validation.zeroPad('9')).toBe('09')
    expect(validation.zeroPad('3')).toBe('03')
  })

  test('does not zero pad string representations of numbers above 10', () => {
    expect(validation.zeroPad('12')).toBe('12')
    expect(validation.zeroPad('999')).toBe('999')
  })

  test('does not zero pad string representations that are not numbers', () => {
    expect(validation.zeroPad('twelve')).toBe('twelve')
    expect(validation.zeroPad('any old string')).toBe('any old string')
  })

})

describe('validating against page models', () => {

  const baseModel = {
    fields: {
      test: {
        type: 'optionalString',
        name: 'test name'
      }
    }
  }

  const deleteTestFieldProperty = prop => delete baseModel.fields.test[prop]
  const deleteTestFieldProperties = props => props.forEach(deleteTestFieldProperty)
  const setTestField = settings => baseModel.fields.test = {...baseModel.fields.test, ...settings}
  const getTestFieldError = data => validation.getPageErrors(data, baseModel).text.test

  test('does not throw error when optionalString field is empty', () => {
    expect(validation.getPageErrors({test: ''}, baseModel).text.test).toBeUndefined()
  })

  test('throws required error when nonEmptyString field is empty', () => {
    setTestField({type: 'nonEmptyString'})
    const expectedError = validation.errorMessage('required', baseModel.fields.test)
    expect(validation.isValidPage({}, baseModel)).toBeFalsy()
    expect(getTestFieldError({test: ''})).toBe(expectedError)
  })

  test('does not return error when nonEmptyString field is valid', () => {
    expect(getTestFieldError({test: 'string'})).toBeUndefined()
  })

  test('throws pattern error when regex is not matched', () => {
    setTestField({
      regex: /^[0-9]*$/,
      patternText: 'Test name must only include numbers'
    })
    const expectedError = validation.errorMessage('pattern', baseModel.fields.test)
    expect(getTestFieldError({test: 'ABC123'})).toBe(expectedError)
  })

  test('throws pattern error when regex is not matched and field is optional', () => {
    // deleting the patternText ensures use of default is covered
    deleteTestFieldProperty('patternText')
    setTestField({type: 'optionalString'})
    const expectedError = validation.errorMessage('pattern', baseModel.fields.test)
    expect(getTestFieldError({test: 'ABC123'})).toBe(expectedError)
  })

  test('does not throw error when regex is matched', () => {
    expect(getTestFieldError({test: '123456'})).toBeUndefined()
  })

  test('throws exactLength error when exact length is not met', () => {
    setTestField({exactLength: 3})
    const expectedError = validation.errorMessage('exactLength', baseModel.fields.test)
    expect(getTestFieldError({test: 'ABC123'})).toBe(expectedError)
  })

  test('does not throw error when exact length is met', () => {
    expect(getTestFieldError({test: '123'})).toBeUndefined()
  })

  test('does not throw error when exact length is met after transform', () => {
    setTestField({transform: data => data.test.replace(/-/g, '').replace(/\s/g, '')})
    expect(getTestFieldError({test: '1-2 3'})).toBeUndefined()
  })

  test('throws betweenMinAndMax error when answer length is not between min and max', () => {
    const min = 3
    const max = 5
    deleteTestFieldProperties(['exactLength', 'transform'])
    setTestField({minLength: min, maxLength: max, inputType: 'digits'})
    const expectedError = validation.errorMessage('betweenMinAndMax', baseModel.fields.test)
    expect(getTestFieldError({test: '1'})).toBe(expectedError)
    expect(getTestFieldError({test: '123456'})).toBe(expectedError)
  })

  test('throws betweenMinAndMax error with default input type when answer length is not between min and max', () => {
    deleteTestFieldProperty('inputType')
    const expectedError = validation.errorMessage('betweenMinAndMax', baseModel.fields.test)
    expect(getTestFieldError({test: '1'})).toBe(expectedError)
    expect(getTestFieldError({test: '123456'})).toBe(expectedError)
  })

  test('does not throw error when answer length is between min and max', () => {
    expect(getTestFieldError({test: '1234'})).toBeUndefined()
  })

  test('throws tooShort error when answer is shorter than minimum length', () => {
    deleteTestFieldProperty('maxLength')
    setTestField({inputType: 'digits'})
    const expectedError = validation.errorMessage('tooShort', baseModel.fields.test)
    expect(getTestFieldError({test: '12'})).toBe(expectedError)
  })

  test('throws tooShort error with default input type when answer is shorter than minimum length', () => {
    deleteTestFieldProperty('inputType')
    const expectedError = validation.errorMessage('tooShort', baseModel.fields.test)
    expect(getTestFieldError({test: '12'})).toBe(expectedError)
  })

  test('does not throw error when answer is on or above minimum length', () => {
    expect(getTestFieldError({test: '123'})).toBeUndefined()
    expect(getTestFieldError({test: '1234'})).toBeUndefined()
  })

  test('throws tooLong error when answer is longer than maximum length', () => {
    deleteTestFieldProperty('minLength')
    setTestField({
      maxLength: 5,
      inputType: 'digits'
    })
    const expectedError = validation.errorMessage('tooLong', baseModel.fields.test)
    expect(getTestFieldError({test: '123456'})).toBe(expectedError)
  })

  test('throws tooLong error with default input type when answer is longer than maximum length', () => {
    deleteTestFieldProperty('inputType')
    const expectedError = validation.errorMessage('tooLong', baseModel.fields.test)
    expect(getTestFieldError({test: '123456'})).toBe(expectedError)
  })

  test('does not throw error when answer is not longer than maximum length', () => {
    expect(getTestFieldError({test: '1234'})).toBeUndefined()
    expect(getTestFieldError({test: '12345'})).toBeUndefined()
  })

  test('throws number error when answer is not a number', () => {
    deleteTestFieldProperties(['maxLength', 'regex', 'patternText'])
    setTestField({ type: 'number'})
    const expectedError = validation.errorMessage('number', baseModel.fields.test)
    expect(getTestFieldError({test: 'twelve'})).toBe(expectedError)
  })

  test('throws required error when number answer is empty', () => {
    const expectedError = validation.errorMessage('required', baseModel.fields.test)
    expect(getTestFieldError({})).toBe(expectedError)
  })

  test('does not throw number error when answer is a number or string representation of a number', () => {
    expect(getTestFieldError({test: 12})).toBeUndefined()
    expect(getTestFieldError({test: '12'})).toBeUndefined()
  })

  test('throws an enum error when required enum answer is empty', () => {
    setTestField({ type: 'enum', validValues: ['yes', 'no'] })
    const expectedError = validation.errorMessage('enum', baseModel.fields.test)
    expect(getTestFieldError({})).toBe(expectedError)
  })

  test('throws an enum error when enum answer is not a valid value', () => {
    const expectedError = validation.errorMessage('enum', baseModel.fields.test)
    expect(getTestFieldError({test: 'maybe'})).toBe(expectedError)
  })

  test('does not throw an enum error when enum answer is a valid value', () => {
    expect(getTestFieldError({test: 'yes'})).toBeUndefined()
    expect(getTestFieldError({test: 'no'})).toBeUndefined()
  })

  test('does not throw an enum error when enum answer is a valid value', () => {
    expect(getTestFieldError({test: 'yes'})).toBeUndefined()
    expect(getTestFieldError({test: 'no'})).toBeUndefined()
  })

  test('throws an enum error when required array answer is empty', () => {
    setTestField({ type: 'array', name: 'all colours you like', validValues: ['red', 'blue', 'green'], minLength: 1 })
    const expectedError = validation.errorMessage('enum', baseModel.fields.test)
    expect(getTestFieldError({})).toBe(expectedError)
  })

  test('throws an enum error when not enough answers in array', () => {
    setTestField({ minLength: 2 })
    const expectedError = validation.errorMessage('enum', baseModel.fields.test)
    expect(getTestFieldError({test: ['red']})).toBe(expectedError)
  })

  test('does not throw an error when optional array is empty', () => {
    deleteTestFieldProperties(['minLength'])
    expect(getTestFieldError({test: []})).toBeUndefined()
  })

  test('throws an enum error when array answer includes invalid answer', () => {
    const expectedError = validation.errorMessage('enum', baseModel.fields.test)
    expect(getTestFieldError({test: ['red', 'yellow']})).toBe(expectedError)
  })

  test('does not throw an error when all array answers are valid', () => {
    expect(getTestFieldError({test: ['red', 'blue']})).toBeUndefined()
  })

  test('throws a noMatch error when input does not match', () => {
    deleteTestFieldProperties(['validValues'])
    setTestField({ type: 'nonEmptyString', matches: ['abc'], noMatchText: 'the reference we hold for you'})
    const expectedError = validation.errorMessage('noMatch', baseModel.fields.test)
    expect(getTestFieldError({test: 'def'})).toBe(expectedError)
  })

  test('does not throw a noMatch error when answer is matched', () => {
    expect(getTestFieldError({test: 'abc'})).toBeUndefined()
  })

  test('throws a noMatch error when input is in exclusions', () => {
    deleteTestFieldProperties(['matches', 'noMatchText'])
    setTestField({ type: 'nonEmptyString', matchingExclusions: ['abc']})
    const expectedError = validation.errorMessage('noMatch', baseModel.fields.test)
    expect(getTestFieldError({test: 'abc'})).toBe(expectedError)
  })

  test('does not throw a noMatch error when answer is not in exclusions', () => {
    expect(getTestFieldError({test: 'def'})).toBeUndefined()
  })

  test('throws a missingFile error when file is missing', () => {
    deleteTestFieldProperties(['validValues'])
    setTestField({ type: 'file', name: 'test name' })
    const expectedError = validation.errorMessage('missingFile', baseModel.fields.test)
    expect(getTestFieldError({})).toBe(expectedError)
  })

  test('does not throw a missingFile error when file name is submitted', () => {
    expect(getTestFieldError({test: 'any-file.pdf'})).toBeUndefined()
  })

  test('throws currency error when answer is not able to be converted to a currency amount', () => {
    setTestField({type: 'currency'})
    const expectedError = validation.errorMessage('currency', baseModel.fields.test)
    expect(getTestFieldError({test: 'twelve'})).toBe(expectedError)
  })

  test('throws required error when currency answer is empty', () => {
    const expectedError = validation.errorMessage('required', baseModel.fields.test)
    expect(getTestFieldError({test: ''})).toBe(expectedError)
  })

  test('does not throw currency error when answer is able to be converted to a currency amount', () => {
    expect(getTestFieldError({test: '123'})).toBeUndefined()
    expect(getTestFieldError({test: '12.34'})).toBeUndefined()
  })

  test('throws currencyMin error when answer is less than minimum amount', () => {
    setTestField({currencyMin: 50})
    const expectedError = validation.errorMessage('currencyMin', baseModel.fields.test)
    expect(getTestFieldError({test: '12'})).toBe(expectedError)
  })

  test('does not throw currencyMin error when answer is on or above the minimum amount', () => {
    expect(getTestFieldError({test: '123'})).toBeUndefined()
    expect(getTestFieldError({test: '1,234'})).toBeUndefined()
  })

  test('throws currencyMax error when answer is more than maximum amount', () => {
    deleteTestFieldProperty('currencyMin')
    setTestField({type: 'currency', currencyMax: 50})
    const expectedError = validation.errorMessage('currencyMax', baseModel.fields.test)
    expect(getTestFieldError({test: '52'})).toBe(expectedError)
  })

  test('does not throw currencyMax error when answer is on or below the maximum amount', () => {
    expect(getTestFieldError({test: '12'})).toBeUndefined()
    expect(getTestFieldError({test: '50'})).toBeUndefined()
  })

  test('throws betweenCurrencyMinAndMax error when answer is more than maximum amount or less than minimum amount', () => {
    setTestField({currencyMin: 10})
    const expectedError = validation.errorMessage('betweenCurrencyMinAndMax', baseModel.fields.test)
    expect(getTestFieldError({test: '52'})).toBe(expectedError)
  })

  test('does not throw currencyMax error when answer is on or below the maximum amount', () => {
    expect(getTestFieldError({test: '12'})).toBeUndefined()
    expect(getTestFieldError({test: '50'})).toBeUndefined()
  })

  test('throws betweenMinAndMaxNumbers error when answer is less than minimum amount ', () => {
    deleteTestFieldProperties(['currencyMin', 'currencyMax'])
    setTestField({type: 'number', numberMin: 50, numberMax: 100})
    const expectedError = validation.errorMessage('betweenMinAndMaxNumbers', baseModel.fields.test)
    expect(getTestFieldError({test: '12'})).toBe(expectedError)
  })

  test('throws betweenMinAndMaxNumbers error when answer is more than maximum amount ', () => {
    const expectedError = validation.errorMessage('betweenMinAndMaxNumbers', baseModel.fields.test)
    expect(getTestFieldError({test: '120'})).toBe(expectedError)
  })

  test('throws numberMin error when answer is less than minimum amount', () => {
    deleteTestFieldProperty('numberMax')
    const expectedError = validation.errorMessage('numberMin', baseModel.fields.test)
    expect(getTestFieldError({test: '12'})).toBe(expectedError)
  })

  test('does not throw numberMin error when answer is on or above the minimum amount', () => {
    expect(getTestFieldError({test: '123'})).toBeUndefined()
    expect(getTestFieldError({test: '1234'})).toBeUndefined()
  })

  test('throws numberMax error when answer is more than maximum amount', () => {
    deleteTestFieldProperty('numberMin')
    setTestField({type: 'number', numberMax: 50})
    const expectedError = validation.errorMessage('numberMax', baseModel.fields.test)
    expect(getTestFieldError({test: '52'})).toBe(expectedError)
  })

  test('does not throw numberMax error when answer is on or below the maximum amount', () => {
    expect(getTestFieldError({test: '12'})).toBeUndefined()
    expect(getTestFieldError({test: '50'})).toBeUndefined()
  })

  test('throws currencyMaxField error when answer is more than the amount from another named field', () => {
    deleteTestFieldProperty('numberMax')
    setTestField({
      name: 'total',
      type: 'currency',
      currencyMaxField: 'the other amount',
      getMaxCurrencyFromField: 'otherAmount'
    })
    const expectedError = validation.errorMessage('currencyMaxField', { ...baseModel.fields.test, evalCurrencyMaxValue: 100 })
    expect(getTestFieldError({test: '101', otherAmount: '100'})).toBe(expectedError)
  })

  test('throws currencyMaxField error without other field description when it is not supplied', () => {
    deleteTestFieldProperty('currencyMaxField')
    const expectedError = validation.errorMessage('currencyMaxField', { ...baseModel.fields.test, evalCurrencyMaxValue: 100 })
    expect(getTestFieldError({test: '101', otherAmount: '100'})).toBe(expectedError)
  })

  test('throws currencyMaxField error when answer is more than the function called on another field', () => {
    setTestField({
      name: 'total',
      type: 'currency',
      currencyMaxField: 'half of the other amount',
      getMaxCurrencyFromField: data => parseFloat(data.otherAmount) / 2
    })
    const expectedError = validation.errorMessage('currencyMaxField', { ...baseModel.fields.test, evalCurrencyMaxValue: 50 })
    expect(getTestFieldError({test: '101', otherAmount: '100'})).toBe(expectedError)
  })

  test('does not throw currencyMaxField error when answer not more than the amount from another field', () => {
    expect(getTestFieldError({test: '99', otherAmount: '200'})).toBeUndefined()
    expect(getTestFieldError({test: '100', otherAmount: '200'})).toBeUndefined()
  })

  test('throws date error when an invalid date is answered', () => {
    setTestField({
      type: 'date',
      name: 'Date'
    })
    deleteTestFieldProperties(['currencyMaxField', 'getMaxCurrencyFromField'])
    const expectedError = validation.errorMessage('date', baseModel.fields.test)
    expect(getTestFieldError({'test-day': '99', 'test-month': '99', 'test-year': '2000'})).toBe(expectedError)
  })

  test('composes date from date parts and validates', () => {
    expect(getTestFieldError({'test-day': '26', 'test-month': '2', 'test-year': '2000'})).toBeUndefined()
  })

  test('throws date error when no date is answered', () => {
    setTestField({
      type: 'date',
      name: 'Date'
    })
    const expectedError = validation.errorMessage('required', baseModel.fields.test)
    expect(getTestFieldError({'test-day': '', 'test-month': '', 'test-year': ''})).toBe(expectedError)
  })

  test('throws dayRequired error when day is missing from date answers', () => {
    const expectedError = validation.errorMessage('dayRequired', baseModel.fields.test)
    expect(getTestFieldError({'test-day': '', 'test-month': '2', 'test-year': '2000'})).toBe(expectedError)
  })

  test('throws monthRequired error when month is missing from date answers', () => {
    const expectedError = validation.errorMessage('monthRequired', baseModel.fields.test)
    expect(getTestFieldError({'test-day': '23', 'test-month': '', 'test-year': '2000'})).toBe(expectedError)
  })

  test('throws yearRequired error when year is missing from date answers', () => {
    const expectedError = validation.errorMessage('yearRequired', baseModel.fields.test)
    expect(getTestFieldError({'test-day': '23', 'test-month': '12', 'test-year': ''})).toBe(expectedError)
  })

  test('expect error summary link to link to year field when only year missing', () => {
    const errors = validation.getPageErrors({'test-day': '23', 'test-month': '12', 'test-year': ''}, baseModel)
    expect(errors.summary[0].href).toBe('#test-year')
  })

  test('expect dateErrorLink to throw error when an unknown error key is passed', () => {
    expect(() => {
      validation.dateErrorLink('unknown')
    }).toThrow()
  })

  test('throws dayAndYearRequired error when both day and year are missing from date answers', () => {
    const expectedError = validation.errorMessage('dayAndYearRequired', baseModel.fields.test)
    expect(getTestFieldError({'test-day': '', 'test-month': '12', 'test-year': ''})).toBe(expectedError)
  })

  test('throws monthAndYearRequired error when both month and year are missing from date answers', () => {
    const expectedError = validation.errorMessage('monthAndYearRequired', baseModel.fields.test)
    expect(getTestFieldError({'test-day': '23', 'test-month': '', 'test-year': ''})).toBe(expectedError)
  })

  test('throws dayAndMonthRequired error when both day and month are missing from date answers', () => {
    const expectedError = validation.errorMessage('dayAndMonthRequired', baseModel.fields.test)
    expect(getTestFieldError({'test-day': '', 'test-month': '', 'test-year': '2020'})).toBe(expectedError)
  })

  test('throws beforeToday error when date is not before today', () => {
    setTestField({
      beforeToday: true
    })
    const expectedError = validation.errorMessage('beforeToday', baseModel.fields.test)
    const tomorrow = LocalDate.now().plusDays(1)
    expect(getTestFieldError({
      'test-day': tomorrow.dayOfMonth().toString(),
      'test-month': tomorrow.monthValue().toString(),
      'test-year': tomorrow.year().toString()})).toBe(expectedError)
  })

  test('does not throw beforeToday error when date is before today', () => {
    const yesterday = LocalDate.now().minusDays(1)
    expect(getTestFieldError({
      'test-day': yesterday.dayOfMonth().toString(),
      'test-month': yesterday.monthValue().toString(),
      'test-year': yesterday.year().toString()})).toBeUndefined()
  })

  test('throws afterFixedDate error when date is not after supplied fixed date', () => {
    const fixedDate = '2010-11-16'
    deleteTestFieldProperty('beforeToday')
    setTestField({
      afterFixedDate: fixedDate
    })
    const expectedError = validation.errorMessage('afterFixedDate', baseModel.fields.test)
    expect(getTestFieldError({'test-day': '29', 'test-month': '3', 'test-year': '2000'})).toBe(expectedError)
  })

  test('does not throw afterFixedDate error when date is after fixed date', () => {
    expect(getTestFieldError({'test-day': '29', 'test-month': '3', 'test-year': '2011'})).toBeUndefined()
  })

  test('throws beforeFixedDate error when date is not before supplied fixed date', () => {
    const fixedDate = '2010-11-16'
    deleteTestFieldProperty('afterFixedDate')
    setTestField({
      beforeFixedDate: fixedDate
    })
    const expectedError = validation.errorMessage('beforeFixedDate', baseModel.fields.test)
    expect(getTestFieldError({'test-day': '29', 'test-month': '3', 'test-year': '2011'})).toBe(expectedError)
  })

  test('does not throw beforeFixedDate error when date is before fixed date', () => {
    expect(getTestFieldError({'test-day': '29', 'test-month': '3', 'test-year': '2010'})).toBeUndefined()
  })

  test('throws beforeDate error when date is not before the date in another field', () => {
    deleteTestFieldProperty('beforeFixedDate')
    setTestField({
      beforeField: 'otherDate',
      beforeDateField: data => data.otherDate,
      evalBeforeDateValue: '2020-02-02'
    })
    const expectedError = validation.errorMessage('beforeDate', baseModel.fields.test)
    expect(getTestFieldError({
      'test-day': '29',
      'test-month': '3',
      'test-year': '2021',
      otherDate: '2020-02-02'
    })).toBe(expectedError)
  })

  test('does not throw beforeDate error when date is before the date in another field', () => {
    expect(getTestFieldError({test: '2010-11-15', otherDate: '2020-10-04'})).toBeUndefined()
  })

  test('throws afterDate error when date is not after the date in another field', () => {
    deleteTestFieldProperties(['beforeDateField', 'evalBeforeDateValue', 'beforeField'])
    setTestField({
      afterField: 'otherDate',
      afterDateField: data => data.otherDate,
      evalAfterDateValue: '2020-02-02'
    })
    const expectedError = validation.errorMessage('afterDate', baseModel.fields.test)
    expect(getTestFieldError({
      test: '2020-01-01',
      otherDate: '2020-02-02'
    })).toBe(expectedError)
  })

  test('does not throw afterDate error when date is after the date in another field', () => {
    setTestField({
      afterField: 'otherDate',
      afterDateField: data => data.otherDate
    })
    expect(getTestFieldError({
      test: '2020-11-15',
      otherDate: '2020-10-04'
    })).toBeUndefined()
  })

})

describe('using custom error messages', () => {
  const pageModel = {
    fields: {
      test: {
        type: 'number',
        name: 'test field',
        maxLength: 4,
        numberMin: 10,
        numberMax: 1000,
        errors: {
          tooLong: 'The test field length cannot be more than 4 numbers long',
          betweenMinAndMaxNumbers: field => `The value you enter for test field must be a number between ${field.numberMin} and ${field.numberMax}`,
          required: field => `You must enter a value for ${field.name}`
        }
      }
    }
  }

  const getTestFieldError = data => validation.getPageErrors(data, pageModel).text.test

  test('returns custom required error via method', () => {
    const expectedError = validation.errorMessage('required', pageModel.fields.test)
    expect(getTestFieldError({test: ''})).toBe(expectedError)
  })

  test('returns custom betweenMinAndMaxNumbers error via function', () => {
    const expectedError = validation.errorMessage('betweenMinAndMaxNumbers', pageModel.fields.test)
    expect(getTestFieldError({test: '8'})).toBe(expectedError)
  })

  test('returns custom maxLength error as string', () => {
    const expectedError = validation.errorMessage('tooLong', pageModel.fields.test)
    expect(getTestFieldError({test: '10000'})).toBe(expectedError)
  })

})

describe('validating against fields', () => {

  const fieldModel = {
    includeIf: data => data.requireFieldModel,
    type: 'optionalString',
    name: 'test field'
  }
  test('returns valid when field is not required by condition in includeIf function', () => {
    expect(validation.isValidField({requireFieldModel: false, fieldModel: ''}, fieldModel, 'fieldModel')).toBe(true)
  })
  test('returns false when field is required by condition in includeIf and data is not supplied', () => {
    expect(validation.isValidField({requireFieldModel: true, fieldModel: ''}, fieldModel, 'fieldModel')).toBe(false)
  })
})

describe('wrapper functions', () => {
  const schema = {
    firstPage: { fields: { 'test': { type: 'nonEmptyString', name: 'test string' } }},
    secondPage: { fields: { 'test2': { type: 'nonEmptyString', name: 'test string 2' } }}
  }

  const mockData = {
    test: '',
    test2: 'some string'
  }

  test('wrapper for validating first page should return false', () => {
    expect(validation.isValidPageWrapper(mockData)(schema.firstPage)).toBe(false)
  })

  test('wrapper for validating second page should return true', () => {
    expect(validation.isValidPageWrapper(mockData)(schema.secondPage)).toBe(true)
  })

  test('wrapper for validating first page should not return false if all fields are valid', () => {
    mockData.test = 'valid string'
    expect(validation.isValidPageWrapper(mockData)(schema.firstPage)).toBe(true)
  })

  test('entire schemas will validate to true if all pages are valid', () => {
    const wholeSchemaIsValid = Object.entries(schema).every(([key, value]) => validation.isValidPage(mockData, value))
    expect(wholeSchemaIsValid).toBe(true)
  })

  test('entire schemas will validate to false if all pages are not valid', () => {
    mockData.test = ''
    const wholeSchemaIsValid = Object.entries(schema).every(([key, value]) => validation.isValidPage(mockData, value))
    expect(wholeSchemaIsValid).toBe(false)
  })


})


