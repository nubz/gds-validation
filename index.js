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
    required: field => `Enter ${field}`,
    betweenMinAndMax: (field, min, max) => `${capitalise(field)} must be between ${min} and ${max} characters`,
    tooShort: (field, min) => `${capitalise(field)} must must be ${min} characters or more`,
    tooLong: (field, max) => `${capitalise(field)} must be ${max} characters or fewer`,
    exactLength: (field, len, type) => `${capitalise(field)} must be ${len} ${type}`,
    number: field => `${capitalise(field)} must be a number`,
    currency: field => `${capitalise(field)} must be an amount of money`,
    numberMin: (field, min) => `${capitalise(field)} must be ${min} or more`,
    currencyMin: (field, min) => `${capitalise(field)} must be ${currencyDisplay(min)} or more`,
    numberMax: (field, max) => `${capitalise(field)} must be ${max} or less`,
    currencyMax: (field, max) => `${capitalise(field)} must be ${currencyDisplay(max)} or less`,
    currencyMaxField: (field, maxField, maxValue) => `${capitalise(field)} must not be more than the value of ${maxField} which is ${currencyDisplay(maxValue)}`,
    pattern: (field, patternText) => `${patternText}`,
    enum: field => `Select ${field}`,
    missingFile: field => `Upload ${field}`,
    date: field => `${capitalise(field)} must be a real date`,
    beforeDate: (field, dateField, dateValue) => `${capitalise(field)} must be before ${dateField}, ${LocalDate.parse(dateValue).format(govDateFormat)}`,
    afterDate: (field, dateField, dateValue) => `${capitalise(field)} must be after ${dateField}, ${LocalDate.parse(dateValue).format(govDateFormat)}`,
    beforeToday: field => `${capitalise(field)} must be before today`,
    afterFixedDate: (field, dateValue) => `${capitalise(field)} must be after ${LocalDate.parse(dateValue).format(govDateFormat)}`,
    beforeFixedDate: (field, dateValue) => `${capitalise(field)} must be before ${LocalDate.parse(dateValue).format(govDateFormat)}`
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

  const isValidField = (payLoad, fieldObj, field) => {

    if (typeof fieldObj.includeIf === 'function' && !fieldObj.includeIf(payLoad)) {
      return true
    }

    evalValuesFromData(fieldObj, payLoad)

    if (payLoad[field] && fieldObj.type === 'currency') {
      payLoad[field] = payLoad[field].toString().replace(/£/, '')
    }

    if (payLoad[field]) {
      return !validationError(fieldObj, payLoad[field], field)
    }

    return false
  }

  const buildHref = (field, fieldObj) =>
    fieldObj.type === 'enum' && fieldObj.validValues.length > 0 ?
      field + '-' + slugify(fieldObj.validValues[0]) : field

  const isValidDate = date => {
    try {
      return LocalDate.parse(date)
    } catch (e) {
      return false
    }
  }

  const validationError = (fieldObj, value, field) => {
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
        } else if (isNaN(+value)) {
          errorText = errorTemplates.currency(fieldObj.name)
        }
        break
      case 'dynamicEnum':
        if (!value) {
          errorText = errorTemplates.enum(fieldObj.name)
        }
        break
      case 'array':
        if (!value || value.length < fieldObj.minLength) {
          errorText = errorTemplates.enum(fieldObj.name)
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
      if (fieldObj.hasOwnProperty('exactLength') && value.replace(/ /g, '').length !== fieldObj.exactLength) {
        errorText = errorTemplates.exactLength(fieldObj.name, fieldObj.exactLength, fieldObj.inputType || 'characters')
      } else if (fieldObj.hasOwnProperty('minLength') && fieldObj.hasOwnProperty('maxLength') &&
        (value.length < fieldObj.minLength || value.length > fieldObj.maxLength)) {
        errorText = errorTemplates.betweenMinAndMax(fieldObj.name, fieldObj.minLength, fieldObj.maxLength)
      } else if (fieldObj.hasOwnProperty('minLength') && value.length < fieldObj.minLength) {
        errorText = errorTemplates.tooShort(fieldObj.name, fieldObj.minLength)
      } else if (fieldObj.hasOwnProperty('currencyMin') && value < fieldObj.currencyMin) {
        errorText = errorTemplates.currencyMin(fieldObj.name, fieldObj.currencyMin)
      } else if (fieldObj.hasOwnProperty('numberMin') && value < fieldObj.numberMin) {
        errorText = errorTemplates.numberMin(fieldObj.name, fieldObj.numberMin)
      } else if (fieldObj.hasOwnProperty('evalNumberMaxValue') && value > fieldObj.evalNumberMaxValue) {
        errorText = errorTemplates.currencyMaxField(fieldObj.name, fieldObj.currencyMaxField, fieldObj.evalNumberMaxValue)
      } else if (fieldObj.hasOwnProperty('currencyMax') && value > fieldObj.currencyMax) {
        errorText = errorTemplates.currencyMax(fieldObj.name, fieldObj.currencyMax)
      } else if (fieldObj.hasOwnProperty('numberMax') && value > fieldObj.numberMax) {
        errorText = errorTemplates.numberMax(fieldObj.name, fieldObj.numberMax)
      } else if (fieldObj.hasOwnProperty('maxLength') && value.length > fieldObj.maxLength) {
        errorText = errorTemplates.tooLong(fieldObj.name, fieldObj.maxLength)
      } else if (fieldObj.hasOwnProperty('regex') && !fieldObj.regex.test(value)) {
        errorText = errorTemplates.pattern(fieldObj.name, fieldObj.patternText || 'is not valid')
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
      }
    }

    return errorText ? {
      id: field,
      href: '#' + buildHref(field, fieldObj),
      text: errorText
    } : null
  }

  const isValidFieldWrapper = (payLoad, pageObj) => field =>
    isValidField(payLoad, pageObj.fields[field], field)

  const isValidPage = (payLoad, pageObj) =>
    Object.keys(pageObj.fields).every(isValidFieldWrapper(payLoad, pageObj))

  const isValidPageWrapper = data => pageObj =>
    Object.keys(pageObj.fields).every(isValidFieldWrapper(payLoad, pageObj))

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
    isValidPage
  }
