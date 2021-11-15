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
  const capitalise = word => word.charAt(0).toUpperCase() + word.slice(1)
  const slugify = str => str.toLowerCase().replace(/\W+/g, '-').replace(/-$/, '')
  const errorTemplates = {
    required: fieldDescription => `Enter ${fieldDescription}`,
    betweenMinAndMax: (fieldDescription, min, max) => `${capitalise(fieldDescription)} must be between ${min} and ${max} characters`,
    tooShort: (fieldDescription, min) => `${capitalise(fieldDescription)} must must be ${min} characters or more`,
    tooLong: (fieldDescription, max) => `${capitalise(fieldDescription)} must be ${max} characters or fewer`,
    exactLength: (fieldDescription, len, type) => `${capitalise(fieldDescription)} must be ${len} ${type}`,
    number: fieldDescription => `${capitalise(fieldDescription)} must be a number`,
    currency: fieldDescription => `${capitalise(fieldDescription)} must be an amount of money`,
    numberMin: (fieldDescription, min) => `${capitalise(fieldDescription)} must be ${min} or more`,
    currencyMin: (fieldDescription, min) => `${capitalise(fieldDescription)} must be ${currencyDisplay(min)} or more`,
    numberMax: (fieldDescription, max) => `${capitalise(fieldDescription)} must be ${max} or less`,
    currencyMax: (fieldDescription, max) => `${capitalise(fieldDescription)} must be ${currencyDisplay(max)} or less`,
    currencyMaxField: (fieldDescription, maxField, maxValue) => `${capitalise(fieldDescription)} must not be more than the value of ${maxField} which is ${currencyDisplay(maxValue)}`,
    pattern: (fieldDescription, patternText) => `${patternText || fieldDescription + ` is not valid`}`,
    enum: fieldDescription => `Select ${fieldDescription}`,
    missingFile: fieldDescription => `Upload ${fieldDescription}`,
    date: fieldDescription => `${capitalise(fieldDescription)} must be a real date`,
    beforeDate: (fieldDescription, dateField, dateValue) => `${capitalise(fieldDescription)} must be before ${dateField}, ${LocalDate.parse(dateValue).format(govDateFormat)}`,
    afterDate: (fieldDescription, dateField, dateValue) => `${capitalise(fieldDescription)} must be after ${dateField}, ${LocalDate.parse(dateValue).format(govDateFormat)}`,
    beforeToday: fieldDescription => `${capitalise(fieldDescription)} must be before today`,
    afterFixedDate: (fieldDescription, dateValue) => `${capitalise(fieldDescription)} must be after ${LocalDate.parse(dateValue).format(govDateFormat)}`,
    beforeFixedDate: (fieldDescription, dateValue) => `${capitalise(fieldDescription)} must be before ${LocalDate.parse(dateValue).format(govDateFormat)}`,
    noMatch: (fieldDescription, noMatchText) => `Your ${fieldDescription} does not match ${noMatchText || `our records`}`
  }

  const evalValuesFromData = (fieldObj, data) => {
    if (typeof fieldObj.getMaxCurrencyFromField === 'function') {
      fieldObj.evalNumberMaxValue = fieldObj.getMaxCurrencyFromField(data)
    }

    if (typeof fieldObj.afterDateField === 'function') {
      fieldObj.evalAfterDateValue = fieldObj.afterDateField(data)
    }

    if (typeof fieldObj.beforeDateField === 'function') {
      fieldObj.evalBeforeDateValue = fieldObj.beforeDateField(data)
    }
  }

  const isValidField = (payLoad, fieldObj, fieldKey) => {

    if (typeof fieldObj.includeIf === 'function' && !fieldObj.includeIf(payLoad)) {
      return true
    }

    evalValuesFromData(fieldObj, payLoad)

    if (payLoad[fieldKey] && fieldObj.type === 'currency') {
      payLoad[fieldKey] = stripCommas(payLoad[fieldKey].toString().replace(/£/, ''))
    }

    if (payLoad[fieldKey]) {
      return !validationError(fieldObj, payLoad[fieldKey], fieldKey)
    }

    return false
  }

  const buildHref = (fieldKey, fieldObj) =>
    fieldObj.type === 'enum' && fieldObj.validValues.length > 0 ?
      fieldKey + '-' + slugify(fieldObj.validValues[0]) : fieldKey

  const isValidDate = date => {
    try {
      return LocalDate.parse(date)
    } catch (e) {
      return false
    }
  }

  const validationError = (fieldObj, value, fieldKey) => {
    let errorText
    switch (fieldObj.type) {
      case 'date':
        if (!value) {
          errorText = errorTemplates.required(fieldObj.name)
        } else if (!isValidDate(value)) {
          errorText = errorTemplates.date(fieldObj.name)
        }
        break
      case 'optionalString':
        break
      case 'nonEmptyString':
      default:
        if (!value || !value.length) {
          errorText = errorTemplates.required(fieldObj.name)
        }
        break
      case 'enum':
        if (!value || !fieldObj.validValues.includes(value)) {
          errorText = errorTemplates.enum(fieldObj.name)
        }
        break
      case 'array':
        if ((fieldObj.minLength && (!value || value.length < fieldObj.minLength)) ||
          (fieldObj.validValues && Array.isArray(value) && !value.every(v => fieldObj.validValues.includes(v)))) {
          errorText = errorTemplates.enum(fieldObj.name)
        }
        break
      case 'number':
        if (!value) {
          errorText = errorTemplates.required(fieldObj.name)
        } else if (isNaN(+value)) {
          errorText = errorTemplates.number(fieldObj.name)
        }
        break
      case 'currency':
        if (!value || typeof value === 'undefined') {
          errorText = errorTemplates.required(fieldObj.name)
        } else if (!/^[0-9,]+(\.[0-9]{1,2})?$/.test(value.toString())) {
          errorText = errorTemplates.currency(fieldObj.name)
        }
        break
      case 'file':
        if (!value || !value.length) {
          errorText = errorTemplates.missingFile(fieldObj.name)
        }
        break
    }

    // check generic field rules
    if (!errorText) {
      if (fieldObj.hasOwnProperty('exactLength') && value.toString().replace(/ /g, '').length !== fieldObj.exactLength) {
        errorText = errorTemplates.exactLength(fieldObj.name, fieldObj.exactLength, fieldObj.inputType || 'characters')
      } else if (fieldObj.hasOwnProperty('minLength') && fieldObj.hasOwnProperty('maxLength') &&
        (value.length < fieldObj.minLength || value.length > fieldObj.maxLength)) {
        errorText = errorTemplates.betweenMinAndMax(fieldObj.name, fieldObj.minLength, fieldObj.maxLength)
      } else if (fieldObj.hasOwnProperty('minLength') && value.length < fieldObj.minLength) {
        errorText = errorTemplates.tooShort(fieldObj.name, fieldObj.minLength)
      } else if (fieldObj.hasOwnProperty('currencyMin') && parseFloat(value) < fieldObj.currencyMin) {
        errorText = errorTemplates.currencyMin(fieldObj.name, fieldObj.currencyMin)
      } else if (fieldObj.hasOwnProperty('numberMin') && value < fieldObj.numberMin) {
        errorText = errorTemplates.numberMin(fieldObj.name, fieldObj.numberMin)
      } else if (fieldObj.hasOwnProperty('evalNumberMaxValue') && value > fieldObj.evalNumberMaxValue) {
        errorText = errorTemplates.currencyMaxField(fieldObj.name, fieldObj.currencyMaxField, fieldObj.evalNumberMaxValue)
      } else if (fieldObj.hasOwnProperty('currencyMax') && parseFloat(value) > fieldObj.currencyMax) {
        errorText = errorTemplates.currencyMax(fieldObj.name, fieldObj.currencyMax)
      } else if (fieldObj.hasOwnProperty('numberMax') && value > fieldObj.numberMax) {
        errorText = errorTemplates.numberMax(fieldObj.name, fieldObj.numberMax)
      } else if (fieldObj.hasOwnProperty('maxLength') && value.length > fieldObj.maxLength) {
        errorText = errorTemplates.tooLong(fieldObj.name, fieldObj.maxLength)
      } else if (fieldObj.hasOwnProperty('regex') && !fieldObj.regex.test(value)) {
        errorText = errorTemplates.pattern(fieldObj.name, fieldObj.patternText)
      } else if (fieldObj.hasOwnProperty('evalBeforeDateValue') && !LocalDate.parse(value).isBefore(LocalDate.parse(fieldObj.evalBeforeDateValue))) {
        errorText = errorTemplates.beforeDate(fieldObj.name, fieldObj.beforeField, fieldObj.evalBeforeDateValue)
      } else if (fieldObj.hasOwnProperty('beforeToday') && !LocalDate.parse(value).isBefore(LocalDate.now())) {
        errorText = errorTemplates.beforeToday(fieldObj.name)
      } else if (fieldObj.hasOwnProperty('evalAfterDateValue') && !LocalDate.parse(value).isAfter(LocalDate.parse(fieldObj.evalAfterDateValue))) {
        errorText = errorTemplates.afterDate(fieldObj.name, fieldObj.afterField, fieldObj.evalAfterDateValue)
      } else if (fieldObj.hasOwnProperty('afterFixedDate') && !LocalDate.parse(value).isAfter(LocalDate.parse(fieldObj.afterFixedDate))) {
        errorText = errorTemplates.afterFixedDate(fieldObj.name, fieldObj.afterFixedDate)
      } else if (fieldObj.hasOwnProperty('beforeFixedDate') && !LocalDate.parse(value).isBefore(LocalDate.parse(fieldObj.beforeFixedDate))) {
        errorText = errorTemplates.beforeFixedDate(fieldObj.name, fieldObj.beforeFixedDate)
      } else if (fieldObj.hasOwnProperty('matches') && !fieldObj.matches.includes(value)) {
        errorText = errorTemplates.noMatch(fieldObj.name, fieldObj.noMatchText)
      } else if (fieldObj.hasOwnProperty('matchingExclusions') && fieldObj.matchingExclusions.includes(value)) {
        errorText = errorTemplates.noMatch(fieldObj.name, fieldObj.noMatchText)
      }
    }

    return errorText ? {
      id: fieldKey,
      href: '#' + buildHref(fieldKey, fieldObj),
      text: errorText
    } : null
  }

  const isValidFieldWrapper = (payLoad, pageObj) => fieldKey =>
    isValidField(payLoad, pageObj.fields[fieldKey], fieldKey)

  const isValidPage = (payLoad, pageObj) =>
    Object.keys(pageObj.fields).every(isValidFieldWrapper(payLoad, pageObj))

  const isValidPageWrapper = data => pageObj =>
    Object.keys(pageObj.fields).every(isValidFieldWrapper(data, pageObj))

  const getPageErrors = (data, pageObj) =>
    Object.keys(pageObj.fields)
    .reduce((list, next) => {
      const error = !isValidField(data, pageObj.fields[next], next) &&
        validationError(pageObj.fields[next], data[next], next)
      if (error) {
        list.summary = [...list.summary, error]
        list.inline[next] = error
        list.text[next] = error.text
      }
      return list
    }, {summary: [], inline: {}, text: {}})


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
    isValidField
  }
