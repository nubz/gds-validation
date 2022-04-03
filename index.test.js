const validation = require('./index')
const { DateTimeFormatter, LocalDate } = require('@js-joda/core')

const isoFormatter = DateTimeFormatter.ofPattern('yyyy-MM-dd');

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

  test('zero pad does not pad when 0 already present on numbers below 10', () => {
    expect(validation.zeroPad('01')).toBe('01')
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

const getTestFieldError = (data, page) => validation.getPageErrors(data, page).text.test
const setTestPage = field => ({
  fields: {
    test: field
  }
})

describe('validating against currency fields', () => {
  test('returns currency error when answer is not able to be converted to a currency amount', () => {
    const field = {
      type: 'currency',
      name: 'test name'
    }
    const page = setTestPage(field)
    const expectedError = validation.errorMessage('currency', field)
    expect(getTestFieldError({test: 'twelve'}, page)).toBe(expectedError)
  })

  test('returns required error when currency answer is empty', () => {
    const field = {
      type: 'currency',
      name: 'test name'
    }
    const page = setTestPage(field)
    const expectedError = validation.errorMessage('required', field)
    expect(getTestFieldError({test: ''}, page)).toBe(expectedError)
  })

  test('does not return a currency error when answer is able to be converted to a currency amount', () => {
    const field = {
      type: 'currency',
      name: 'test name'
    }
    const page = setTestPage(field)
    expect(getTestFieldError({test: '123'}, page)).toBeUndefined()
    expect(getTestFieldError({test: '12.34'}, page)).toBeUndefined()
    expect(getTestFieldError({test: '1,234.99'}, page)).toBeUndefined()
  })

  test('returns a currencyMax error when field type is currency, max is a number and answer is more than max', () => {
    const field = {
      type: 'currency',
      name: 'test name',
      max: 50,
      evalMaxValue: 50
    }
    const page = setTestPage(field)
    const expectedError = validation.errorMessage('currencyMax', field)
    expect(getTestFieldError({test: '53'}, page)).toBe(expectedError)
  })

  test('returns a currencyMax error with description when field type is currency, max is a number and answer is more than max', () => {
    const field = {
      type: 'currency',
      name: 'test name',
      max: 50,
      evalMaxValue: 50,
      maxDescription: 'the limit'
    }
    const page = setTestPage(field)
    const expectedError = validation.errorMessage('currencyMax', field)
    expect(getTestFieldError({test: '53'}, page)).toBe(expectedError)
  })

  test('does not return a currencyMax error when answer is on or below the maximum amount', () => {
    const field = {
      type: 'currency',
      name: 'test name',
      max: 50,
      evalMaxValue: 50
    }
    const page = setTestPage(field)
    expect(getTestFieldError({test: '12'}, page)).toBeUndefined()
    expect(getTestFieldError({test: '50'}, page)).toBeUndefined()
  })

  test('returns a betweenCurrencyMinAndMax error when field is currency and min and max are set as numbers and answer is not within range', () => {
    const field = {
      type: 'currency',
      name: 'test name',
      max: 50,
      evalMaxValue: 50,
      min: 10,
      evalMinValue: 10
    }
    const page = setTestPage(field)
    const expectedError = validation.errorMessage('betweenCurrencyMinAndMax', field)
    expect(getTestFieldError({test: '53'}, page)).toBe(expectedError)
    expect(getTestFieldError({test: '5'}, page)).toBe(expectedError)
  })

  test('returns a betweenCurrencyMinAndMax error with descriptions when field is currency and min and max are set as numbers and answer is not within range', () => {
    const field = {
      type: 'currency',
      name: 'test name',
      max: 50,
      maxDescription: 'the highest permitted',
      evalMaxValue: 50,
      min: 10,
      minDescription: 'the lowest permitted',
      evalMinValue: 10
    }
    const page = setTestPage(field)
    const expectedError = validation.errorMessage('betweenCurrencyMinAndMax', field)
    expect(getTestFieldError({test: '53'}, page)).toBe(expectedError)
    expect(getTestFieldError({test: '5'}, page)).toBe(expectedError)
  })

  test('returns a currencyMin error when field type is currency, min is a number and the answer is less than min', () => {
    const field = {
      type: 'currency',
      name: 'test name',
      min: 10,
      evalMinValue: 10
    }
    const page = setTestPage(field)
    const expectedError = validation.errorMessage('currencyMin', field)
    expect(getTestFieldError({test: '3'}, page)).toBe(expectedError)
  })

  test('returns a currencyMin error with description when field type is currency, min is from a function and the answer is less than min', () => {
    const field = {
      type: 'currency',
      name: 'how much you can pay',
      min: data => parseFloat(data.otherAmount) / 4,
      evalMinValue: 25,
      minDescription: 'a quarter of what you told us you owe'
    }
    const page = setTestPage(field)
    const expectedError = validation.errorMessage('currencyMin', field)
    expect(getTestFieldError({test: '3', otherAmount: '100'}, page)).toBe(expectedError)
  })

  test('does not return a currencyMin error when answer is on or above the minimum amount', () => {
    const field = {
      type: 'currency',
      name: 'test name',
      min: 10,
      evalMinValue: 10
    }
    const page = setTestPage(field)
    expect(getTestFieldError({test: '123'}, page)).toBeUndefined()
    expect(getTestFieldError({test: '1,234'}, page)).toBeUndefined()
  })

  test('returns currencyMax error when answer is more than the amount from another named field', () => {
    const field = {
      type: 'currency',
      name: 'test name',
      max: 'otherAmount',
      evalMaxValue: 100
    }
    const page = setTestPage(field)
    const expectedError = validation.errorMessage('currencyMax', field)
    expect(getTestFieldError({test: '101', otherAmount: '100'}, page)).toBe(expectedError)
  })

  test('returns currencyMax error when answer is more than the function called on another field', () => {
    const field = {
      type: 'currency',
      name: 'test name',
      max:  data => parseFloat(data.otherAmount) / 2,
      evalMaxValue: 50
    }
    const page = setTestPage(field)
    const expectedError = validation.errorMessage('currencyMax', field)
    expect(getTestFieldError({test: '101', otherAmount: '100'}, page)).toBe(expectedError)
  })

  test('does not return a currencyMax error when answer not more than the amount from a function', () => {
    const field = {
      type: 'currency',
      name: 'test name',
      max:  data => parseFloat(data.otherAmount) / 2,
      evalMaxValue: 100
    }
    const page = setTestPage(field)
    expect(getTestFieldError({test: '49', otherAmount: '200'}, page)).toBeUndefined()
    expect(getTestFieldError({test: '100', otherAmount: '200'}, page)).toBeUndefined()
  })

})

describe('validating strings', () => {

  test('does not return an error when optionalString field is empty', () => {
    const field = {
      type: 'optionalString',
      name: 'test name'
    }
    const page = setTestPage(field)
    expect(validation.getPageErrors({test: ''}, page).text.test).toBeUndefined()
  })

  test('returns required error when nonEmptyString field is empty', () => {
    const field = {
      type: 'nonEmptyString',
      name: 'test name'
    }
    const page = setTestPage(field)
    const expectedError = validation.errorMessage('required', field)
    expect(validation.isValidPage({test: ''}, page)).toBeFalsy()
    expect(getTestFieldError({test: ''}, page)).toBe(expectedError)
  })

  test('does not return error when nonEmptyString field is valid', () => {
    const field = {
      type: 'nonEmptyString',
      name: 'test name'
    }
    const page = setTestPage(field)
    expect(getTestFieldError({test: 'string'}, page)).toBeUndefined()
  })

  test('returns pattern error when regex is not matched', () => {
    const field = {
      type: 'nonEmptyString',
      name: 'test name',
      regex: /^[0-9]*$/,
      patternText: 'Test name must only include numbers'
    }
    const page = setTestPage(field)
    const expectedError = validation.errorMessage('pattern', field)
    expect(getTestFieldError({test: 'ABC123'}, page)).toBe(expectedError)
  })

  test('returns pattern error when regex is not matched and field is optional', () => {
    // omitting the patternText ensures use of default
    const field = {
      type: 'optionalString',
      name: 'test name',
      regex: /^[0-9]*$/
    }
    const page = setTestPage(field)
    const expectedError = validation.errorMessage('pattern', field)
    expect(getTestFieldError({test: 'ABC123'}, page)).toBe(expectedError)
  })

  test('does not return an error when regex is matched', () => {
    const field = {
      type: 'optionalString',
      name: 'test name',
      regex: /^[0-9]*$/
    }
    const page = setTestPage(field)
    expect(getTestFieldError({test: '123456'}, page)).toBeUndefined()
  })

  test('returns exactLength error when exact length is not met', () => {
    const field = {
      type: 'optionalString',
      name: 'test name',
      exactLength: 3
    }
    const page = setTestPage(field)
    const expectedError = validation.errorMessage('exactLength', field)
    expect(getTestFieldError({test: 'ABC123'}, page)).toBe(expectedError)
  })

  test('does not return an error when exact length is met', () => {
    const field = {
      type: 'optionalString',
      name: 'test name',
      exactLength: 3
    }
    const page = setTestPage(field)
    expect(getTestFieldError({test: '123'}, page)).toBeUndefined()
  })

  test('does not return an error when exact length is met after transform', () => {
    const field = {
      type: 'optionalString',
      name: 'test name',
      exactLength: 3,
      transform: data => data.test.replace(/-/g, '').replace(/\s/g, '')
    }
    const page = setTestPage(field)
    expect(getTestFieldError({test: '1-2 3'}, page)).toBeUndefined()
  })

  test('returns betweenMinAndMaxLength error when answer length is not between min and max', () => {
    const field = {
      type: 'optionalString',
      name: 'test name',
      inputType: 'digits',
      minLength: 3,
      maxLength: 5
    }
    const page = setTestPage(field)
    const expectedError = validation.errorMessage('betweenMinAndMaxLength', field)
    expect(getTestFieldError({test: '1'}, page)).toBe(expectedError)
    expect(getTestFieldError({test: '123456'}, page)).toBe(expectedError)
  })

  test('returns betweenMinAndMaxLength error with default input type when answer length is not between min and max', () => {
    const field = {
      type: 'optionalString',
      name: 'test name',
      minLength: 3,
      maxLength: 5
    }
    const page = setTestPage(field)
    const expectedError = validation.errorMessage('betweenMinAndMaxLength', field)
    expect(getTestFieldError({test: '1'}, page)).toBe(expectedError)
    expect(getTestFieldError({test: '123456'}, page)).toBe(expectedError)
  })

  test('does not return a betweenMinAndMaxLength error when answer length is between min and max', () => {
    const field = {
      type: 'optionalString',
      name: 'test name',
      minLength: 3,
      maxLength: 5
    }
    const page = setTestPage(field)
    expect(getTestFieldError({test: '1234'}, page)).toBeUndefined()
  })

  test('returns tooShort error when answer is shorter than minimum length', () => {
    const field = {
      type: 'optionalString',
      name: 'test name',
      minLength: 3,
      inputType: 'digits'
    }
    const page = setTestPage(field)
    const expectedError = validation.errorMessage('tooShort', field)
    expect(getTestFieldError({test: '12'}, page)).toBe(expectedError)
  })

  test('returns tooShort error with default input type when answer is shorter than minimum length', () => {
    const field = {
      type: 'optionalString',
      name: 'test name',
      minLength: 3
    }
    const page = setTestPage(field)
    const expectedError = validation.errorMessage('tooShort', field)
    expect(getTestFieldError({test: '12'}, page)).toBe(expectedError)
  })

  test('does not return an error when answer is on or above minimum length', () => {
    const field = {
      type: 'optionalString',
      name: 'test name',
      minLength: 3
    }
    const page = setTestPage(field)
    expect(getTestFieldError({test: '123'}, page)).toBeUndefined()
    expect(getTestFieldError({test: '1234'}, page)).toBeUndefined()
  })

  test('returns tooLong error when answer is longer than maximum length', () => {
    const field = {
      type: 'optionalString',
      name: 'test name',
      maxLength: 5,
      inputType: 'digits'
    }
    const page = setTestPage(field)
    const expectedError = validation.errorMessage('tooLong', field)
    expect(getTestFieldError({test: '123456'}, page)).toBe(expectedError)
  })

  test('returns tooLong error with default input type when answer is longer than maximum length', () => {
    const field = {
      type: 'optionalString',
      name: 'test name',
      maxLength: 5
    }
    const page = setTestPage(field)
    const expectedError = validation.errorMessage('tooLong', field)
    expect(getTestFieldError({test: '123456'}, page)).toBe(expectedError)
  })

  test('does not return an error when answer is not longer than maximum length', () => {
    const field = {
      type: 'optionalString',
      name: 'test name',
      maxLength: 5
    }
    const page = setTestPage(field)
    expect(getTestFieldError({test: '1234'}, page)).toBeUndefined()
    expect(getTestFieldError({test: '12345'}, page)).toBeUndefined()
  })
})

describe('validating numbers', () => {

  test('returns number error when answer is not a number', () => {
    const field = {
      type: 'number',
      name: 'test name'
    }
    const page = setTestPage(field)
    const expectedError = validation.errorMessage('number', field)
    expect(getTestFieldError({test: 'twelve'}, page)).toBe(expectedError)
  })

  test('returns required error when number answer is empty', () => {
    const field = {
      type: 'number',
      name: 'test name'
    }
    const page = setTestPage(field)
    const expectedError = validation.errorMessage('required', field)
    expect(getTestFieldError({test: ''}, page)).toBe(expectedError)
  })

  test('does not return a number error when answer is a string representation of a number', () => {
    const field = {
      type: 'number',
      name: 'test name'
    }
    const page = setTestPage(field)
    expect(getTestFieldError({test: '12'}, page)).toBeUndefined()
  })

  test('returns a numberMin error when field type is number, min is a number and the answer is less than that number', () => {
    const field = {
      type: 'number',
      name: 'test name',
      min: 10,
      evalMinValue: 10
    }
    const page = setTestPage(field)
    const expectedError = validation.errorMessage('numberMin', field)
    expect(getTestFieldError({test: '3'}, page)).toBe(expectedError)
  })

  test('returns a numberMin error when field type is number, min is reference to a field value and the answer is less than that field', () => {
    const field = {
      type: 'number',
      name: 'test name',
      min: 'otherAmount',
      evalMinValue: 10
    }
    const page = setTestPage(field)
    const expectedError = validation.errorMessage('numberMin', field)
    expect(getTestFieldError({test: '3', otherAmount: '10'}, page)).toBe(expectedError)
  })

  test('returns a numberMin error when field type is number, min is from a function and the answer is less than that field', () => {
    const field = {
      type: 'number',
      name: 'test name',
      min: data => parseFloat(data.otherAmount),
      evalMinValue: 10
    }
    const page = setTestPage(field)
    const expectedError = validation.errorMessage('numberMin', field)
    expect(getTestFieldError({test: '3', otherAmount: '10'}, page)).toBe(expectedError)
  })

  test('returns a numberMin error with minDescription when field type is number, min is from a function and the answer is less than that field', () => {
    const field = {
      type: 'number',
      name: 'test name',
      min: data => parseFloat(data.otherAmount),
      evalMinValue: 10,
      minDescription: 'the other amount'
    }
    const page = setTestPage(field)
    const expectedError = validation.errorMessage('numberMin', field)
    expect(getTestFieldError({test: '3', otherAmount: '10'}, page)).toBe(expectedError)
  })

  test('does not return a numberMin error when field type is number and answer is on or above the minimum amount', () => {
    const field = {
      type: 'number',
      name: 'test name',
      min: 10,
      evalMinValue: 10
    }
    const page = setTestPage(field)
    expect(getTestFieldError({test: '10'}, page)).toBeUndefined()
    expect(getTestFieldError({test: '1234'}, page)).toBeUndefined()
  })

  test('returns a betweenMinAndMaxNumbers error when field type is number and min and max are numbers and answer is not within range', () => {
    const field = {
      type: 'number',
      name: 'test name',
      min: 10,
      evalMinValue: 10,
      max: 50,
      evalMaxValue: 50
    }
    const page = setTestPage(field)
    const expectedError = validation.errorMessage('betweenMinAndMaxNumbers', field)
    expect(getTestFieldError({test: '53'}, page)).toBe(expectedError)
    expect(getTestFieldError({test: '3'}, page)).toBe(expectedError)
  })

  test('returns a numberMax error when field type is number, max is a number and answer is more than max', () => {
    const field = {
      type: 'number',
      name: 'test name',
      max: 50,
      evalMaxValue: 50
    }
    const page = setTestPage(field)
    const expectedError = validation.errorMessage('numberMax', field)
    expect(getTestFieldError({test: '53'}, page)).toBe(expectedError)
  })

  test('returns a numberMax error when field type is number, max is a reference to another field and answer is more than field', () => {
    const field = {
      type: 'number',
      name: 'test name',
      max: 'otherAmount',
      evalMaxValue: 50
    }
    const page = setTestPage(field)
    const expectedError = validation.errorMessage('numberMax', field)
    expect(getTestFieldError({test: '53', otherAmount: '50'}, page)).toBe(expectedError)
  })

  test('returns a numberMax error when field type is number, max is from a function and answer is more than function returns', () => {
    const field = {
      type: 'number',
      name: 'test name',
      max: data => parseFloat(data.otherAmount) * 0.5,
      evalMaxValue: 25
    }
    const page = setTestPage(field)
    const expectedError = validation.errorMessage('numberMax', field)
    expect(getTestFieldError({test: '53', otherAmount: '50'}, page)).toBe(expectedError)
  })

  test('returns a numberMax error with maxDescription when field type is number, max is from a function and answer is more than function returns', () => {
    const field = {
      type: 'number',
      name: 'test name',
      max: data => parseFloat(data.otherAmount) * 0.5,
      evalMaxValue: 25,
      maxDescription: 'half of the other amount'
    }
    const page = setTestPage(field)
    const expectedError = validation.errorMessage('numberMax', field)
    expect(getTestFieldError({test: '53', otherAmount: '50'}, page)).toBe(expectedError)
  })

  test('does not return a numberMax error when answer is on or below the maximum amount', () => {
    const field = {
      type: 'number',
      name: 'test name',
      min: 10,
      evalMinValue: 10,
      max: 50,
      evalMaxValue: 50
    }
    const page = setTestPage(field)
    expect(getTestFieldError({test: '12'}, page)).toBeUndefined()
    expect(getTestFieldError({test: '50'}, page)).toBeUndefined()
  })

})

describe('validating enum and arrays', () => {

  test('returns an enum error when required enum answer is empty', () => {
    const field = {
      type: 'enum',
      name: 'test name',
      validValues: ['yes', 'no']
    }
    const page = setTestPage(field)
    const expectedError = validation.errorMessage('enum', field)
    expect(getTestFieldError({test: ''}, page)).toBe(expectedError)
  })

  test('returns an enum error when enum answer is not a valid value', () => {
    const field = {
      type: 'enum',
      name: 'test name',
      validValues: ['yes', 'no']
    }
    const page = setTestPage(field)
    const expectedError = validation.errorMessage('enum', field)
    expect(getTestFieldError({test: 'maybe'}, page)).toBe(expectedError)
  })

  test('does not return an enum error when enum answer is a valid value', () => {
    const field = {
      type: 'enum',
      name: 'test name',
      validValues: ['yes', 'no']
    }
    const page = setTestPage(field)
    expect(getTestFieldError({test: 'yes'}, page)).toBeUndefined()
    expect(getTestFieldError({test: 'no'}, page)).toBeUndefined()
  })

  test('returns an enum error when required array answer is empty', () => {
    const field = {
      type: 'array',
      name: 'test name',
      validValues: ['red', 'blue', 'green'],
      minLength: 1
    }
    const page = setTestPage(field)
    const expectedError = validation.errorMessage('enum', field)
    expect(getTestFieldError({}, page)).toBe(expectedError)
  })

  test('returns an enum error when not enough answers in array', () => {
    const field = {
      type: 'array',
      name: 'test name',
      validValues: ['red', 'blue', 'green'],
      minLength: 2
    }
    const page = setTestPage(field)
    const expectedError = validation.errorMessage('enum', field)
    expect(getTestFieldError({test: ['red']}, page)).toBe(expectedError)
  })

  test('does not return an error when optional array is empty', () => {
    const field = {
      type: 'array',
      name: 'test name',
      validValues: ['red', 'blue', 'green']
    }
    const page = setTestPage(field)
    expect(getTestFieldError({test: []}, page)).toBeUndefined()
  })

  test('returns an enum error when array answer includes invalid answer', () => {
    const field = {
      type: 'array',
      name: 'test name',
      validValues: ['red', 'blue', 'green']
    }
    const page = setTestPage(field)
    const expectedError = validation.errorMessage('enum', field)
    expect(getTestFieldError({test: ['red', 'yellow']}, page)).toBe(expectedError)
  })

  test('does not return an error when all array answers are valid', () => {
    const field = {
      type: 'array',
      name: 'test name',
      validValues: ['red', 'blue', 'green']
    }
    const page = setTestPage(field)
    expect(getTestFieldError({test: ['red', 'blue']}, page)).toBeUndefined()
  })

})

describe('validating matches and exclusions', () => {

  test('returns a noMatch error when input does not match', () => {
    const field = {
      type: 'nonEmptyString',
      name: 'test name',
      matches: ['abc'],
      noMatchText: 'the reference we hold for you'
    }
    const page = setTestPage(field)
    const expectedError = validation.errorMessage('noMatch', field)
    expect(getTestFieldError({test: 'def'}, page)).toBe(expectedError)
  })

  test('does not return a noMatch error when answer is matched', () => {
    const field = {
      type: 'nonEmptyString',
      name: 'test name',
      matches: ['abc'],
      noMatchText: 'the reference we hold for you'
    }
    const page = setTestPage(field)
    expect(getTestFieldError({test: 'abc'}, page)).toBeUndefined()
  })

  test('returns a noMatch error when input is in exclusions', () => {
    const field = {
      type: 'nonEmptyString',
      name: 'test name',
      matchingExclusions: ['abc']
    }
    const page = setTestPage(field)
    const expectedError = validation.errorMessage('noMatch', field)
    expect(getTestFieldError({test: 'abc'}, page)).toBe(expectedError)
  })

  test('does not return a noMatch error when answer is not in exclusions', () => {
    const field = {
      type: 'nonEmptyString',
      name: 'test name',
      matchingExclusions: ['abc']
    }
    const page = setTestPage(field)
    expect(getTestFieldError({test: 'def'}, page)).toBeUndefined()
  })

  test('returns a missingFile error when file is missing', () => {
    const field = {
      type: 'file',
      name: 'test name'
    }
    const page = setTestPage(field)
    const expectedError = validation.errorMessage('missingFile', field)
    expect(getTestFieldError({}, page)).toBe(expectedError)
  })

  test('does not return a missingFile error when file name is submitted', () => {
    const field = {
      type: 'file',
      name: 'test name'
    }
    const page = setTestPage(field)
    expect(getTestFieldError({test: 'any-file.pdf'}, page)).toBeUndefined()
  })

})

describe('validating dates', () => {

  test('returns date error when an invalid date is answered', () => {
    const field = {
      type: 'date',
      name: 'test name'
    }
    const page = setTestPage(field)
    const expectedError = validation.errorMessage('date', field)
    expect(getTestFieldError({'test-day': '99', 'test-month': '99', 'test-year': '2000'}, page)).toBe(expectedError)
  })

  test('composes date from date parts and validates', () => {
    const field = {
      type: 'date',
      name: 'test name'
    }
    const page = setTestPage(field)
    expect(getTestFieldError({'test-day': '26', 'test-month': '2', 'test-year': '2000'}, page)).toBeUndefined()
  })

  test('returns date error when no date is answered', () => {
    const field = {
      type: 'date',
      name: 'test name'
    }
    const page = setTestPage(field)
    const expectedError = validation.errorMessage('required', field)
    expect(getTestFieldError({'test-day': '', 'test-month': '', 'test-year': ''}, page)).toBe(expectedError)
  })

  test('returns dayRequired error when day is missing from date answers', () => {
    const field = {
      type: 'date',
      name: 'test name'
    }
    const page = setTestPage(field)
    const expectedError = validation.errorMessage('dayRequired', field)
    expect(getTestFieldError({'test-day': '', 'test-month': '2', 'test-year': '2000'}, page)).toBe(expectedError)
  })

  test('returns monthRequired error when month is missing from date answers', () => {
    const field = {
      type: 'date',
      name: 'test name'
    }
    const page = setTestPage(field)
    const expectedError = validation.errorMessage('monthRequired', field)
    expect(getTestFieldError({'test-day': '23', 'test-month': '', 'test-year': '2000'}, page)).toBe(expectedError)
  })

  test('returns yearRequired error when year is missing from date answers', () => {
    const field = {
      type: 'date',
      name: 'test name'
    }
    const page = setTestPage(field)
    const expectedError = validation.errorMessage('yearRequired', field)
    expect(getTestFieldError({'test-day': '23', 'test-month': '12', 'test-year': ''}, page)).toBe(expectedError)
  })

  test('expect error summary link to link to year field when only year missing', () => {
    const field = {
      type: 'date',
      name: 'test name'
    }
    const page = setTestPage(field)
    const errors = validation.getPageErrors({'test-day': '23', 'test-month': '12', 'test-year': ''}, page)
    expect(errors.summary[0].href).toBe('#test-year')
  })

  test('expect dateErrorLink to throw error when an unknown error key is passed', () => {
    expect(() => {
      validation.dateErrorLink('unknown')
    }).toThrow()
  })

  test('returns dayAndYearRequired error when both day and year are missing from date answers', () => {
    const field = {
      type: 'date',
      name: 'test name'
    }
    const page = setTestPage(field)
    const expectedError = validation.errorMessage('dayAndYearRequired', field)
    expect(getTestFieldError({'test-day': '', 'test-month': '12', 'test-year': ''}, page)).toBe(expectedError)
  })

  test('returns monthAndYearRequired error when both month and year are missing from date answers', () => {
    const field = {
      type: 'date',
      name: 'test name'
    }
    const page = setTestPage(field)
    const expectedError = validation.errorMessage('monthAndYearRequired', field)
    expect(getTestFieldError({'test-day': '23', 'test-month': '', 'test-year': ''}, page)).toBe(expectedError)
  })

  test('returns dayAndMonthRequired error when both day and month are missing from date answers', () => {
    const field = {
      type: 'date',
      name: 'test name'
    }
    const page = setTestPage(field)
    const expectedError = validation.errorMessage('dayAndMonthRequired', field)
    expect(getTestFieldError({'test-day': '', 'test-month': '', 'test-year': '2020'}, page)).toBe(expectedError)
  })

  test('returns beforeToday error when date is not before today', () => {
    const field = {
      type: 'date',
      name: 'test name',
      beforeToday: true
    }
    const page = setTestPage(field)
    const expectedError = validation.errorMessage('beforeToday', field)
    const tomorrow = LocalDate.now().plusDays(1)
    expect(getTestFieldError({
      'test-day': tomorrow.dayOfMonth().toString(),
      'test-month': tomorrow.monthValue().toString(),
      'test-year': tomorrow.year().toString()
    }, page)).toBe(expectedError)
  })

  test('does not return a beforeToday error when date is before today', () => {
    const field = {
      type: 'date',
      name: 'test name',
      beforeToday: true
    }
    const page = setTestPage(field)
    const yesterday = LocalDate.now().minusDays(1)
    expect(getTestFieldError({
      'test-day': yesterday.dayOfMonth().toString(),
      'test-month': yesterday.monthValue().toString(),
      'test-year': yesterday.year().toString()
    }, page)).toBeUndefined()
  })

  test('returns afterToday error when date is not after today', () => {
    const field = {
      type: 'date',
      name: 'test name',
      afterToday: true
    }
    const page = setTestPage(field)
    const expectedError = validation.errorMessage('afterToday', field)
    const yesterday = LocalDate.now().minusDays(1)
    expect(getTestFieldError({
      'test-day': yesterday.dayOfMonth().toString(),
      'test-month': yesterday.monthValue().toString(),
      'test-year': yesterday.year().toString()
    }, page)).toBe(expectedError)
  })

  test('does not return an afterToday error when date is after today', () => {
    const field = {
      type: 'date',
      name: 'test name',
      afterToday: true
    }
    const page = setTestPage(field)
    const tomorrow = LocalDate.now().plusDays(1)
    expect(getTestFieldError({
      'test-day': tomorrow.dayOfMonth().toString(),
      'test-month': tomorrow.monthValue().toString(),
      'test-year': tomorrow.year().toString()
    }, page)).toBeUndefined()
  })

  test('returns afterFixedDate error when date is not after supplied fixed date', () => {
    const field = {
      type: 'date',
      name: 'test name',
      min: '2010-11-16',
      minDescription: 'the day you joined',
      evalMinValue: '2010-11-16'
    }
    const page = setTestPage(field)
    const expectedError = validation.errorMessage('afterFixedDate', field)
    expect(getTestFieldError({'test-day': '29', 'test-month': '3', 'test-year': '2000'}, page)).toBe(expectedError)
  })

  test('does not return an afterFixedDate error when date is after fixed date', () => {
    const field = {
      type: 'date',
      name: 'test name',
      min: '2010-11-16',
      evalMinValue: '2010-11-16'
    }
    const page = setTestPage(field)
    expect(getTestFieldError({'test-day': '29', 'test-month': '3', 'test-year': '2011'}, page)).toBeUndefined()
  })

  test('returns beforeFixedDate error when date is not before supplied fixed date', () => {
    const field = {
      type: 'date',
      name: 'test name',
      max: '2010-11-16',
      maxDescription: 'the day you left',
      evalMaxValue: '2010-11-16'
    }
    const page = setTestPage(field)
    const expectedError = validation.errorMessage('beforeFixedDate', field)
    expect(getTestFieldError({'test-day': '29', 'test-month': '3', 'test-year': '2011'}, page)).toBe(expectedError)
  })

  test('does not return a beforeFixedDate error when date is before fixed date', () => {
    const field = {
      type: 'date',
      name: 'test name',
      max: '2010-11-16',
      evalMaxValue: '2010-11-16'
    }
    const page = setTestPage(field)
    expect(getTestFieldError({'test-day': '29', 'test-month': '3', 'test-year': '2010'}, page)).toBeUndefined()
  })

  test('returns beforeFixedDate error when date is not before the date in another field', () => {
    const field = {
      type: 'date',
      name: 'test name',
      max: 'otherDate',
      evalMaxValue: '2020-02-02'
    }
    const page = setTestPage(field)
    const expectedError = validation.errorMessage('beforeFixedDate', field)
    expect(getTestFieldError({
      'test-day': '29',
      'test-month': '3',
      'test-year': '2021',
      'otherDate-day': '2',
      'otherDate-month': '2',
      'otherDate-year': '2020'
    }, page)).toBe(expectedError)
  })

  test('does not return beforeFixedDate error when date to compare to is missing', () => {
    const field = {
      type: 'date',
      name: 'test name',
      max: 'otherDate'
    }
    const page = setTestPage(field)
    expect(getTestFieldError({
      'test-day': '29',
      'test-month': '3',
      'test-year': '2021',
      'otherDate-day': '',
      'otherDate-month': '',
      'otherDate-year': ''
    }, page)).toBeUndefined()
  })

  test('does not return a beforeFixedDate error when date is before the date in another field', () => {
    const field = {
      type: 'date',
      name: 'test name',
      max: 'otherDate',
      evalMaxValue: '2020-02-02'
    }
    const page = setTestPage(field)
    expect(getTestFieldError({test: '2010-11-15', otherDate: '2020-10-04'}, page)).toBeUndefined()
  })

  test('returns afterFixedDate error when date is not after the date in another field', () => {
    const field = {
      type: 'date',
      name: 'test name',
      min: 'otherDate',
      evalMinValue: '2020-02-02'
    }
    const page = setTestPage(field)
    const expectedError = validation.errorMessage('afterFixedDate', field)
    expect(getTestFieldError({
      test: '2020-01-01',
      'otherDate-day': '2',
      'otherDate-month': '2',
      'otherDate-year': '2020'
    }, page)).toBe(expectedError)
  })

  test('does not return afterFixedDate error when date to compare to is missing', () => {
    const field = {
      type: 'date',
      name: 'test name',
      min: 'otherDate'
    }
    const page = setTestPage(field)
    expect(getTestFieldError({
      'test-day': '29',
      'test-month': '3',
      'test-year': '2021',
      'otherDate-day': '',
      'otherDate-month': '',
      'otherDate-year': ''
    }, page)).toBeUndefined()
  })

  test('does not return an afterFixedDate error when date is after the date in another field', () => {
    const field = {
      type: 'date',
      name: 'test name',
      min: 'otherDate',
      evalMinValue: '2020-02-02'
    }
    const page = setTestPage(field)
    expect(getTestFieldError({
      test: '2020-11-15',
      otherDate: '2020-10-04'
    }, page)).toBeUndefined()
  })

  test('returns betweenMinAndMaxDates error when date is not within range of supplied dates', () => {
    const field = {
      type: 'date',
      name: 'test name',
      min: '2020-02-02',
      max: '2022-02-02',
      evalMinValue: '2020-02-02',
      evalMaxValue: '2022-02-02'
    }
    const page = setTestPage(field)
    const expectedError = validation.errorMessage('betweenMinAndMaxDates', field)
    expect(getTestFieldError({
      test: '2020-01-01'
    }, page)).toBe(expectedError)
    expect(getTestFieldError({
      test: '2023-01-01'
    }, page)).toBe(expectedError)
  })

  test('returns betweenMinAndMaxDates error when date is not within range of dates from functions', () => {
    const testDate = LocalDate.now()
    const field = {
      type: 'date',
      name: 'test name',
      min: data => testDate.minusYears(100).format(isoFormatter),
      minDescription: '100 years ago',
      max: data => testDate.minusYears(16).format(isoFormatter),
      maxDescription: '16 years ago',
      evalMinValue: testDate.minusYears(100).format(isoFormatter),
      evalMaxValue: testDate.minusYears(16).format(isoFormatter)
    }
    const page = setTestPage(field)
    const expectedError = validation.errorMessage('betweenMinAndMaxDates', field)
    expect(getTestFieldError({
      test: '2020-01-01'
    }, page)).toBe(expectedError)
    expect(getTestFieldError({
      test: '2023-01-01'
    }, page)).toBe(expectedError)
  })

  test('returns betweenMinAndMaxDates error when date is not within range of supplied dates', () => {
    const field = {
      type: 'date',
      name: 'test name',
      min: '2020-02-02',
      max: '2022-02-02',
      evalMinValue: '2020-02-02',
      evalMaxValue: '2022-02-02'
    }
    const page = setTestPage(field)
    const expectedError = validation.errorMessage('betweenMinAndMaxDates', field)
    expect(getTestFieldError({
      test: '2020-01-01'
    }, page)).toBe(expectedError)
    expect(getTestFieldError({
      test: '2023-01-01'
    }, page)).toBe(expectedError)
  })

  test('returns betweenMinAndMaxDates error when date is not within range of dates in other fields', () => {
    const field = {
      type: 'date',
      name: 'test name',
      min: 'earliest',
      max: 'latest',
      evalMinValue: '2020-02-02',
      evalMaxValue: '2022-02-02'
    }
    const page = setTestPage(field)
    const expectedError = validation.errorMessage('betweenMinAndMaxDates', field)
    expect(getTestFieldError({
      test: '2020-01-01',
      'earliest-day': '2',
      'earliest-month': '2',
      'earliest-year': '2020',
      'latest-day': '2',
      'latest-month': '2',
      'latest-year': '2022'
    }, page)).toBe(expectedError)
    expect(getTestFieldError({
      test: '2023-01-01',
      'earliest-day': '2',
      'earliest-month': '2',
      'earliest-year': '2020',
      'latest-day': '2',
      'latest-month': '2',
      'latest-year': '2022'
    }, page)).toBe(expectedError)
  })

  test('does not return betweenMinAndMaxDates error when date is within range of dates in other fields', () => {
    const field = {
      type: 'date',
      name: 'test name',
      min: 'earliest',
      max: 'latest',
      evalMinValue: '2020-02-02',
      evalMaxValue: '2022-02-02'
    }
    const page = setTestPage(field)

    expect(getTestFieldError({
      test: '2020-06-01',
      'earliest-day': '2',
      'earliest-month': '2',
      'earliest-year': '2020',
      'latest-day': '2',
      'latest-month': '2',
      'latest-year': '2022'
    }, page)).toBeUndefined()
    expect(getTestFieldError({
      test: '2022-01-01',
      'earliest-day': '2',
      'earliest-month': '2',
      'earliest-year': '2020',
      'latest-day': '2',
      'latest-month': '2',
      'latest-year': '2022'
    }, page)).toBeUndefined()
  })

})

describe('using custom error messages', () => {
  const pageModel = {
    fields: {
      test: {
        type: 'number',
        name: 'test field',
        maxLength: 4,
        min: 10,
        max: 1000,
        errors: {
          tooLong: 'The test field length cannot be more than 4 numbers long',
          betweenMinAndMaxNumbers: field => `The value you enter for test field must be a number between ${field.evalMinValue} and ${field.evalMaxValue}`,
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


