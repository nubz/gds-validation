  require('@js-joda/timezone')
  const Locale = require('@js-joda/locale_en').Locale
  const LocalDate = require('@js-joda/core').LocalDate
  const DateTimeFormatter = require('@js-joda/core').DateTimeFormatter
  const govDateFormat = DateTimeFormatter.ofPattern('d MMMM uuuu').withLocale(Locale.ENGLISH)
  const addCommas = val => val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const stripCommas = val => val.toString().trim().replace(/,/g, '')
  const currencyDisplay = val => {
    if (!val) return ''
    const withoutCommas = stripCommas(val)
    const asFloat = parseFloat(withoutCommas)
    return `£${addCommas(asFloat % 1 !== 0 ?
      Math.abs(asFloat).toFixed(2) :
      Math.abs(parseInt(withoutCommas)))}`
  }
  const inputType = field => field.inputType || 'characters'
  const capitalise = word => word.charAt(0).toUpperCase() + word.slice(1)
  const slugify = str => str.toLowerCase().replace(/\W+/g, '-').replace(/-$/, '')
  const errorTemplates = {
    required: field => `Enter ${field.name}`,
    betweenMinAndMax: field => `${capitalise(field.name)} must be between ${field.minLength} and ${field.maxLength} ${inputType(field)}`,
    betweenMinAndMaxNumbers: field => `${capitalise(field.name)} must be between ${field.numberMin} and ${field.numberMax}`,
    tooShort: field => `${capitalise(field.name)} must must be ${field.minLength} ${inputType(field)} or more`,
    tooLong: field => `${capitalise(field.name)} must be ${field.maxLength} ${inputType(field)} or fewer`,
    exactLength: field => `${capitalise(field.name)} must be ${field.exactLength} ${inputType(field)}`,
    number: field => `${capitalise(field.name)} must be a number`,
    currency: field => `${capitalise(field.name)} must be an amount of money`,
    numberMin: field => `${capitalise(field.name)} must be ${field.numberMin} or more`,
    currencyMin: field => `${capitalise(field.name)} must be ${currencyDisplay(field.currencyMin)} or more`,
    numberMax: field => `${capitalise(field.name)} must be ${field.numberMax} or less`,
    currencyMax: field => `${capitalise(field.name)} must be ${currencyDisplay(field.currencyMax)} or less`,
    currencyMaxField: field => `${capitalise(field.name)} must not be more than the value of ${field.currencyMaxField} which is ${currencyDisplay(field.evalNumberMaxValue)}`,
    pattern: field => `${field.patternText || field.name + ` is not valid`}`,
    enum: field => `Select ${field.name}`,
    missingFile: field => `Upload ${field.name}`,
    date: field => `${capitalise(field.name)} must be a real date`,
    beforeDate: field => `${capitalise(field.name)} must be before ${field.beforeField}, ${LocalDate.parse(field.evalBeforeDateValue).format(govDateFormat)}`,
    afterDate: field => `${capitalise(field.name)} must be after ${field.afterField}, ${LocalDate.parse(field.evalAfterDateValue).format(govDateFormat)}`,
    beforeToday: field => `${capitalise(field.name)} must be in the past`,
    afterFixedDate: field => `${capitalise(field.name)} must be after ${LocalDate.parse(field.afterFixedDate).format(govDateFormat)}`,
    beforeFixedDate: field => `${capitalise(field.name)} must be before ${LocalDate.parse(field.beforeFixedDate).format(govDateFormat)}`,
    noMatch: field => `${capitalise(field.name)} does not match ${field.noMatchText || `our records`}`
  }

  const evalValuesFromData = (data, field) => {

    if (typeof field.getMaxCurrencyFromField === 'function') {
      field.evalNumberMaxValue = field.getMaxCurrencyFromField(data)
    }

    if (typeof field.afterDateField === 'function') {
      field.evalAfterDateValue = field.afterDateField(data)
    }

    if (typeof field.beforeDateField === 'function') {
      field.evalBeforeDateValue = field.beforeDateField(data)
    }
  }

  const isValidField = (payLoad, field, fieldKey) => {

    if (typeof field.includeIf === 'function' && !field.includeIf(payLoad)) {
      return true
    }

    evalValuesFromData(payLoad, field)

    if (payLoad[fieldKey] && typeof field.transform === 'function') {
      payLoad[fieldKey] = field.transform(payLoad)
    }

    if (payLoad[fieldKey] && field.type === 'currency') {
      payLoad[fieldKey] = stripCommas(payLoad[fieldKey].toString().replace(/£/, ''))
    }

    if (payLoad[fieldKey]) {
      return !validationError(field, payLoad[fieldKey], fieldKey)
    }

    return false
  }

  const buildHref = (fieldKey, field) =>
    field.type === 'enum' && field.validValues.length > 0 ?
      fieldKey + '-' + slugify(field.validValues[0]) : fieldKey

  const isValidDate = date => {
    try {
      return LocalDate.parse(date)
    } catch (e) {
      return false
    }
  }

  const errorMessage = (errorKey, field) => field.hasOwnProperty('errors') && field.errors.hasOwnProperty(errorKey) ?
      (typeof field.errors[errorKey] === 'function' ? field.errors[errorKey](field) : field.errors[errorKey]) :
      errorTemplates[errorKey](field)

  const validationError = (field, value, fieldKey) => {
    let errorText
    switch (field.type) {
      case 'date':
        if (!value) {
          errorText = errorMessage('required', field)
        } else if (!isValidDate(value)) {
          errorText = errorMessage('date', field)
        }
        break
      case 'optionalString':
        break
      case 'nonEmptyString':
      default:
        if (!value || !value.length) {
          errorText = errorMessage('required', field)
        }
        break
      case 'enum':
        if (!value || !field.validValues.includes(value)) {
          errorText = errorMessage('enum', field)
        }
        break
      case 'array':
        if ((field.minLength && (!value || value.length < field.minLength)) ||
          (field.validValues && Array.isArray(value) && !value.every(v => field.validValues.includes(v)))) {
          errorText = errorMessage('enum', field)
        }
        break
      case 'number':
        if (!value) {
          errorText = errorMessage('required', field)
        } else if (isNaN(+value)) {
          errorText = errorMessage('number', field)
        }
        break
      case 'currency':
        if (!value || typeof value === 'undefined') {
          errorText = errorMessage('required', field)
        } else if (!/^[0-9,]+(\.[0-9]{1,2})?$/.test(value.toString())) {
          errorText = errorMessage('currency', field)
        }
        break
      case 'file':
        if (!value || !value.length) {
          errorText = errorMessage('missingFile', field)
        }
        break
    }

    // check generic field rules
    if (!errorText && !(field.type === 'optionalString' && value.length === 0)) {
      if (field.hasOwnProperty('exactLength') && value.toString().replace(/ /g, '').length !== field.exactLength) {
        errorText = errorMessage('exactLength', field)
      } else if (field.hasOwnProperty('minLength') && field.hasOwnProperty('maxLength') &&
        (value.length < field.minLength || value.length > field.maxLength)) {
        errorText = errorMessage('betweenMinAndMax', field)
      } else if (field.hasOwnProperty('maxLength') && value.length > field.maxLength) {
        errorText = errorMessage('tooLong', field)
      } else if (field.hasOwnProperty('minLength') && value.length < field.minLength) {
        errorText = errorMessage('tooShort', field)
      } else if (field.hasOwnProperty('currencyMin') && parseFloat(value) < field.currencyMin) {
        errorText = errorMessage('currencyMin', field)
      } else if (field.hasOwnProperty('numberMin') && field.hasOwnProperty('numberMax') &&
          (value < field.numberMin || value > field.numberMax)) {
        errorText = errorMessage('betweenMinAndMaxNumbers', field)
      } else if (field.hasOwnProperty('numberMin') && value < field.numberMin) {
        errorText = errorMessage('numberMin', field)
      } else if (field.hasOwnProperty('evalNumberMaxValue') && value > field.evalNumberMaxValue) {
        errorText = errorMessage('currencyMaxField', field)
      } else if (field.hasOwnProperty('currencyMax') && parseFloat(value) > field.currencyMax) {
        errorText = errorMessage('currencyMax', field)
      } else if (field.hasOwnProperty('numberMax') && value > field.numberMax) {
        errorText = errorMessage('numberMax', field)
      } else if (field.hasOwnProperty('regex') && !field.regex.test(value)) {
        errorText = errorMessage('pattern', field)
      } else if (field.hasOwnProperty('evalBeforeDateValue') && !LocalDate.parse(value).isBefore(LocalDate.parse(field.evalBeforeDateValue))) {
        errorText = errorMessage('beforeDate', field)
      } else if (field.hasOwnProperty('beforeToday') && !LocalDate.parse(value).isBefore(LocalDate.now())) {
        errorText = errorMessage('beforeToday', field)
      } else if (field.hasOwnProperty('evalAfterDateValue') && !LocalDate.parse(value).isAfter(LocalDate.parse(field.evalAfterDateValue))) {
        errorText = errorMessage('afterDate', field)
      } else if (field.hasOwnProperty('afterFixedDate') && !LocalDate.parse(value).isAfter(LocalDate.parse(field.afterFixedDate))) {
        errorText = errorMessage('afterFixedDate', field)
      } else if (field.hasOwnProperty('beforeFixedDate') && !LocalDate.parse(value).isBefore(LocalDate.parse(field.beforeFixedDate))) {
        errorText = errorMessage('beforeFixedDate', field)
      } else if (field.hasOwnProperty('matches') && !field.matches.includes(value)) {
        errorText = errorMessage('noMatch', field)
      } else if (field.hasOwnProperty('matchingExclusions') && field.matchingExclusions.includes(value)) {
        errorText = errorMessage('noMatch', field)
      }
    }

    return errorText ? {
      id: fieldKey,
      href: '#' + buildHref(fieldKey, field),
      text: errorText
    } : null
  }

  const isValidFieldWrapper = (payLoad, page) => fieldKey =>
    isValidField(payLoad, page.fields[fieldKey], fieldKey)

  const isValidPage = (payLoad, page) =>
    Object.keys(page.fields).every(isValidFieldWrapper(payLoad, page))

  const isValidPageWrapper = data => page =>
    Object.keys(page.fields).every(isValidFieldWrapper(data, page))

  const getPageErrors = (data, page) =>
    Object.keys(page.fields)
    .reduce((list, next) => {
      const error = !isValidField(data, page.fields[next], next) &&
        validationError(page.fields[next], data[next], next)
      if (error) {
        list.summary = [...list.summary, error]
        list.inline[next] = error
        list.text[next] = error.text
        list.hasErrors = true
      }
      return list
    }, {summary: [], inline: {}, text: {}, hasErrors: false})


  module.exports = {
    addCommas,
    stripCommas,
    currencyDisplay,
    capitalise,
    slugify,
    errorTemplates,
    getPageErrors,
    isValidPageWrapper,
    isValidPage,
    isValidField,
    errorMessage
  }
