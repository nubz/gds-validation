  require('@js-joda/timezone')
  const Locale = require('@js-joda/locale_en').Locale
  const LocalDate = require('@js-joda/core').LocalDate
  const DateTimeFormatter = require('@js-joda/core').DateTimeFormatter
  const govDateFormat = DateTimeFormatter.ofPattern('d MMMM uuuu').withLocale(Locale.ENGLISH)
  const isoDateRegex = /^\d{4}-([0][1-9]|1[0-2])-([0-2][1-9]|[1-3]0|3[01])$/
  const wholeDateErrors = ['date', 'required', 'beforeDate', 'afterDate', 'beforeFixedDate', 'afterFixedDate', 'beforeToday']
  const dayErrors = ['dayRequired', 'dayAndYearRequired', 'dayAndMonthRequired']
  const monthErrors = ['monthRequired', 'monthAndYearRequired', 'dayAndMonthRequired']
  const yearErrors = ['yearRequired', 'monthAndYearRequired', 'dayAndYearRequired']
  const addCommas = val => val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const stripCommas = val => val.toString().trim().replace(/,/g, '')
  const zeroPad = val => !isNaN(+val) ? (val.toString().length === 1 ? '0' + val : val) : val
  const dateErrorLink = errorKey => {
    if (wholeDateErrors.includes(errorKey) || dayErrors.includes(errorKey)) { return 'day' }
    else if (monthErrors.includes(errorKey)) { return 'month' }
    else if (yearErrors.includes(errorKey)) { return 'year' }
    else throw `errorKey ${errorKey} found that does not have a link`
  }
  const getDateInputsInError = (fieldKey, field, value) => {
    const errorKey = getDateErrorKey(value)
    const inputs = []
    if (wholeDateErrors.includes(errorKey) || dayErrors.includes(errorKey)) { inputs.push('day') }
    if (wholeDateErrors.includes(errorKey) || monthErrors.includes(errorKey)) { inputs.push('month') }
    if (wholeDateErrors.includes(errorKey) || yearErrors.includes(errorKey)) { inputs.push('year') }
    return inputs
  }
  const makeYearString = (data, key) => data[`${key}-year`] && data[`${key}-year`].length > 0 ? data[`${key}-year`] : null
  const makeMonthString = (data, key) => data[`${key}-month`] && data[`${key}-month`].length > 0 ? zeroPad(data[`${key}-month`]) : null
  const makeDayString = (data, key) => data[`${key}-day`] && data[`${key}-day`].length > 0 ? zeroPad(data[`${key}-day`]) : null
  const makeDateString = (data, key) => {
    if (data[key] && isoDateRegex.test(data[key])) {
      return data[key]
    }
    const year = makeYearString(data, key)
    const month = makeMonthString(data, key)
    const day = makeDayString(data, key)
    const hasMissingDateInputs = [day, month, year].some(input => !input)
    return hasMissingDateInputs ? [day, month, year] : `${year}-${month}-${day}`
  }
  const currencyDisplay = val => {
    if (!val) return ''
    const withoutCommas = stripCommas(val)
    const asFloat = parseFloat(withoutCommas)
    return `£${addCommas(asFloat % 1 !== 0 ?
      Math.abs(asFloat).toFixed(2) :
      Math.abs(parseInt(withoutCommas)))}`
  }
  const isAfter = (value, min) => LocalDate.parse(value).isAfter(LocalDate.parse(min))
  const isBefore = (value, max) => LocalDate.parse(value).isBefore(LocalDate.parse(max))
  const minMaxTemplates = {
    number: {
      betweenMinAndMax: 'betweenMinAndMaxNumbers',
      min: 'numberMin',
      max: 'numberMax'
    },
    currency: {
      betweenMinAndMax: 'betweenCurrencyMinAndMax',
      min: 'currencyMin',
      max: 'currencyMax'
    },
    date: {
      betweenMinAndMax: 'betweenMinAndMaxDates',
      min: 'afterFixedDate',
      max: 'beforeFixedDate'
    }
  }
  const inputType = field => field.inputType || 'characters'
  const capitalise = word => word.charAt(0).toUpperCase() + word.slice(1)
  const slugify = str => str.toLowerCase().replace(/\W+/g, '-').replace(/-$/, '')
  const errorTemplates = {
    required: field => `Enter ${field.name}`,
    betweenMinAndMaxLength: field => `${capitalise(field.name)} must be between ${field.minLength} and ${field.maxLength} ${inputType(field)}`,
    betweenMinAndMaxNumbers: field => `${capitalise(field.name)} must be between ${field.evalMinValue} and ${field.evalMaxValue}`,
    betweenCurrencyMinAndMax: field => `${capitalise(field.name)} must be between ${currencyDisplay(field.evalMinValue)}${field.minDescription ? `, ${field.minDescription},` : ``} and ${currencyDisplay(field.evalMaxValue)}${field.maxDescription ? `, ${field.maxDescription}` : ``}`,
    betweenMinAndMaxDates: field => `${capitalise(field.name)} must be between ${LocalDate.parse(field.evalMinValue).format(govDateFormat)}${field.minDescription ? `, ${field.minDescription},` : ``} and ${LocalDate.parse(field.evalMaxValue).format(govDateFormat)}${field.maxDescription ? `, ${field.maxDescription}` : ``}`,
    tooShort: field => `${capitalise(field.name)} must must be ${field.minLength} ${inputType(field)} or more`,
    tooLong: field => `${capitalise(field.name)} must be ${field.maxLength} ${inputType(field)} or fewer`,
    exactLength: field => `${capitalise(field.name)} must be ${field.exactLength} ${inputType(field)}`,
    number: field => `${capitalise(field.name)} must be a number`,
    numberMin: field => `${capitalise(field.name)} must be ${field.evalMinValue} or more${field.minDescription ? `, ${field.minDescription}` : ``}`,
    numberMax: field => `${capitalise(field.name)} must be ${field.evalMaxValue} or less${field.maxDescription ? `, ${field.maxDescription}` : ``}`,
    currency: field => `${capitalise(field.name)} must be an amount of money`,
    currencyMin: field => `${capitalise(field.name)} must be ${currencyDisplay(field.evalMinValue)} or more${field.minDescription ? `, ${field.minDescription}` : ``}`,
    currencyMax: field => `${capitalise(field.name)} must be ${currencyDisplay(field.evalMaxValue)} or less${field.maxDescription ? `, ${field.maxDescription}` : ``}`,
    pattern: field => `${field.patternText || field.name + ` is not valid`}`,
    enum: field => `Select ${field.name}`,
    missingFile: field => `Upload ${field.name}`,
    date: field => `${capitalise(field.name)} must be a real date`,
    dayRequired: field => `${capitalise(field.name)} must include a day`,
    monthRequired: field => `${capitalise(field.name)} must include a month`,
    yearRequired: field => `${capitalise(field.name)} must include a year`,
    dayAndYearRequired: field => `${capitalise(field.name)} must include a day and a year`,
    dayAndMonthRequired: field => `${capitalise(field.name)} must include a day and a month`,
    monthAndYearRequired: field => `${capitalise(field.name)} must include a month and a year`,
    beforeToday: field => `${capitalise(field.name)} must be in the past`,
    afterToday: field => `${capitalise(field.name)} must be in the future`,
    afterFixedDate: field => `${capitalise(field.name)} must be after ${LocalDate.parse(field.evalMinValue).format(govDateFormat)}${field.minDescription ? `, ${field.minDescription}` : ``}`,
    beforeFixedDate: field => `${capitalise(field.name)} must be before ${LocalDate.parse(field.evalMaxValue).format(govDateFormat)}${field.maxDescription ? `, ${field.maxDescription}` : ``}`,
    noMatch: field => `${capitalise(field.name)} does not match ${field.noMatchText || `our records`}`
  }

  const getDateErrorKey = value => {
    if (!value[0] && !value[1] && !value[2]) {
      return 'required'
    } else if (value[0] && !value[1] && !value[2]) {
      return 'monthAndYearRequired'
    } else if (!value[0] && value[1] && !value[2]) {
      return 'dayAndYearRequired'
    } else if (!value[0] && !value[1] && value[2]) {
      return 'dayAndMonthRequired'
    } else if (value[0] && value[1] && !value[2]) {
      return 'yearRequired'
    } else if (value[0] && !value[1] && value[2]) {
      return 'monthRequired'
    } else if (!value[0] && value[1] && value[2]) {
      return 'dayRequired'
    } else {
      return 'date'
    }
  }

  const evaluatedValues = (data, field) => {

    if (field.hasOwnProperty('min') && minMaxTemplates.hasOwnProperty(field.type)) {
      switch (typeof field.min) {
        case 'number':
          field.evalMinValue = field.min
              break
        case 'string':
          field.evalMinValue = isoDateRegex.test(field.min)
              ? field.min : (field.type === 'date') ? makeDateString(data, field.min) : parseFloat(data[field.min])
              break
        case 'function':
          field.evalMinValue = field.min(data)
              break
      }

    }

    if (field.hasOwnProperty('max') && minMaxTemplates.hasOwnProperty(field.type)) {
      switch (typeof field.max) {
        case 'number':
          field.evalMaxValue = field.max
          break
        case 'string':
          field.evalMaxValue = isoDateRegex.test(field.max)
              ? field.max : (field.type === 'date') ? makeDateString(data, field.max) : parseFloat(data[field.max])
          break
        case 'function':
          field.evalMaxValue = field.max(data)
          break
      }

    }

  }

  const isValidField = (payLoad, field, fieldKey) => {

    if (typeof field.includeIf === 'function' && !field.includeIf(payLoad)) {
      return true
    }

    evaluatedValues(payLoad, field)

    if (payLoad[fieldKey] && typeof field.transform === 'function') {
      payLoad[fieldKey] = field.transform(payLoad)
    }

    if (payLoad[fieldKey] && field.type === 'currency') {
      payLoad[fieldKey] = stripCommas(payLoad[fieldKey].toString().replace(/£/, ''))
    }

    if (field.type === 'date' && !isoDateRegex.test(payLoad[fieldKey])) {
      payLoad[fieldKey] = makeDateString(payLoad, fieldKey)
    }

    if (payLoad[fieldKey]) {
      return !validationError(field, payLoad[fieldKey], fieldKey)
    }

    return false
  }

  const buildHref = (fieldKey, field, value) => {
    if (field.type === 'enum' && field.validValues.length > 0) {
      return fieldKey + '-' + slugify(field.validValues[0])
    } else if (field.type === 'date') {
      return fieldKey + '-' + dateErrorLink(getDateErrorKey(value))
    }

    return fieldKey
  }

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
        if (Array.isArray(value)) {
          errorText = errorMessage(getDateErrorKey(value), field)
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
        if (!value.length) {
          errorText = errorMessage('required', field)
        } else if (isNaN(+value)) {
          errorText = errorMessage('number', field)
        }
        break
      case 'currency':
        if (value.length === 0 || typeof value === 'undefined') {
          errorText = errorMessage('required', field)
        } else if (!/^[0-9,]+(\.[0-9]{1,2})?$/.test(value)) {
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
        errorText = errorMessage('betweenMinAndMaxLength', field)
      } else if (field.hasOwnProperty('maxLength') && value.length > field.maxLength) {
        errorText = errorMessage('tooLong', field)
      } else if (field.hasOwnProperty('minLength') && value.length < field.minLength) {
        errorText = errorMessage('tooShort', field)
      } else if (field.hasOwnProperty('evalMinValue') && field.hasOwnProperty('evalMaxValue')) {
        if (field.type === 'date' && (!isAfter(value, field.evalMinValue) || !isBefore(value, field.evalMaxValue))) {
          errorText = errorMessage(minMaxTemplates[field.type].betweenMinAndMax, field)
        } else if (parseFloat(value) < field.evalMinValue || parseFloat(value) > field.evalMaxValue) {
          errorText = errorMessage(minMaxTemplates[field.type].betweenMinAndMax, field)
        }
      } else if (field.hasOwnProperty('evalMinValue') &&
          ((field.type !== 'date' && parseFloat(value) < field.evalMinValue) || (field.type === 'date' && !isAfter(value, field.evalMinValue)))) {
        errorText = errorMessage(minMaxTemplates[field.type].min, field)
      } else if (field.hasOwnProperty('evalMaxValue') &&
          ((field.type !== 'date' && parseFloat(value) > field.evalMaxValue) || (field.type === 'date' && !isBefore(value, field.evalMaxValue)))) {
        errorText = errorMessage(minMaxTemplates[field.type].max, field)
      } else if (field.hasOwnProperty('regex') && !field.regex.test(value)) {
        errorText = errorMessage('pattern', field)
      } else if (field.hasOwnProperty('beforeToday') && !LocalDate.parse(value).isBefore(LocalDate.now())) {
        errorText = errorMessage('beforeToday', field)
      } else if (field.hasOwnProperty('afterToday') && !LocalDate.parse(value).isAfter(LocalDate.now())) {
        errorText = errorMessage('afterToday', field)
      } else if (field.hasOwnProperty('matches') && !field.matches.includes(value)) {
        errorText = errorMessage('noMatch', field)
      } else if (field.hasOwnProperty('matchingExclusions') && field.matchingExclusions.includes(value)) {
        errorText = errorMessage('noMatch', field)
      }
    }

    return errorText ? {
      id: fieldKey,
      href: '#' + buildHref(fieldKey, field, value),
      text: errorText,
      inputs: field.type === 'date' ? getDateInputsInError(fieldKey, field, value) : [ fieldKey ]
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
        list.njk[next] = { text: error.text }
        list.hasErrors = true
      }
      return list
    }, {summary: [], inline: {}, text: {}, njk: {}, hasErrors: false})



  module.exports = {
    addCommas,
    stripCommas,
    currencyDisplay,
    capitalise,
    slugify,
    zeroPad,
    dateErrorLink,
    errorTemplates,
    getPageErrors,
    isValidPageWrapper,
    isValidPage,
    isValidField,
    errorMessage
  }
