![example workflow](https://github.com/nubz/gds-validation/actions/workflows/node.js.yml/badge.svg)
[![Coverage Status](https://coveralls.io/repos/github/nubz/gds-validation/badge.svg?branch=main)](https://coveralls.io/github/nubz/gds-validation?branch=main)
# GDS Validation

Require this package in your node server apps, including govuk prototypes and use the methods to validate forms and fields on the server to 
return error messages that are templated to GDS recommendations. Response formats are optimised for use in govuk prototype 
Nunjucks error summary components, however there is no dependency on any govuk libraries so other apps can also use this package and 
consume error responses as they see fit or even overwrite the GDS error templating with custom error messages in the field model.

```
npm install --save @nubz/gds-validation
```
### Examples

Examples of simple and complex use cases can be seen on [https://prototype-strategies.herokuapp.com/errors/](https://prototype-strategies.herokuapp.com/errors/)

## API
### Requests

The main functions that are exposed are `getPageErrors()` which returns an errors object and `isValidPage()` which 
returns a boolean value. Both functions require you to pass in the dataset/payload to be analysed and the model to 
validate against.

The dataset to be analysed should be a flat map of answers to all fields in order to work with this package. For simple, 
single page validations where the request body contains all fields required, then passing in the body is enough. In 
other, more integrated validations, then the entire dataset may be required to cross-reference the values of other named 
fields. For example, in govuk prototypes the entire data set is contained within the session data attached to the 
request `request.session.data` so if we had a page model with a field that references another field from another page or 
system value then we would need this entire dataset to be passed in.
```typescript
interface Payload {
  [key: String]: String | Number | Array<String> | Date
}

type getPageErrors = (data: Payload, pageModel: PageModel) => Errors
type isValidPage = (data: Payload, pageModel: PageModel) => boolean
```

### Page models

Page models are constructed by you to describe what fields are on a page. A valid page model will use field names as 
keys to field objects. If the field relates to a form control in a template you need to ensure the HTML field name 
matches the key used in your page model, dates can be composed of separate day, month and year inputs - so in this case 
the fields on the page are expected to use the date field name those inputs are composed into.

```typescript
// example model
const pageModel = {
  fields: {
    'full-name': {
      type: 'nonEmptyString', // if left blank we will see "Enter your full name"
      name: 'your full name'
    },
    'date-of-birth': {
      type: 'date',
      name: 'your date of birth',
      beforeToday: true // if a future date is entered we will see "Your date of birth must be in the past"
    },
    'number-of-days-available': {
      type: 'number', 
      name: 'how many days you are available',
      min: 5 // if a number less than 5 is submitted we will see "How many days you are available must be 5 or more", field names are capitalised if they begin an error message
    }
  }
}

// using TypeScript interfaces as documentation

interface PageModel {
  fields: FieldsMap
  includeIf?: (data: Payload) => Boolean
}

interface FieldsMap {
  [key: FieldKey]: FieldObject
}

type FieldKey = String // the id of a field, this should match any HTML input name in templates
type IsoDateString = `${number}${number}${number}${number}-${number}${number}-${number}${number}`
interface FieldObject {
  type: 'date' | 'currency' | 'enum' | 'optionalString' | 'nonEmptyString' | 'number' | 'file' | 'array'
  name: String // the description of the field for use in messages, in GDS templates this represents [whatever it is] placeholders
  validValues?: Array<String> // for use if type === 'enum' or `array`, value of enum will be compared to values listed here
  matches?: Array<String> // value of input must be in this list
  matchingExclusions?: Array<String> // value of input must not be in this list
  noMatchText?: String // for use in error message to describe what the input is matched against - defaults to `our records` if missing
  includeIf?: (data: Payload) => Boolean // field will not be validate if returns false e.g. data => data.otherField === 'Yes'
  regex?: RegExp
  exactLength?: Number // number of characters long
  minLength?: Number // number of characters long
  maxLength?: Number // number of characters long
  inputType?: 'characters' | 'digits' | 'numbers' | 'letters and numbers' | 'letters' // any description of permitted keys
  min?: FieldKey | IsoDateString | Number | Function<(data: Payload) => Number | IsoDateString> // supported by date, number and currency field types, if a FieldKey is used then the value stored in that field will be used, if a number is used then that is the amount, if a function is used it must return a date or a number to match teh field type e.g. data => parseFloat(data.otherField) / 2
  max?: FieldKey | IsoDateString | Number | Function<(data: Payload) => Number | IsoDateString> // supported by date, number and currency field types
  minDescription?: String // optional description of the minimum amount or date e.g. 'half the amount of the other field' or 'the date you joined'
  maxDescription?: String // optional description of the maximum amount or date e.g. 'the amount you have in the bank' or 'the date you left'
  beforeToday?: Boolean
  afterToday?: Boolean
  patternText?: String // description of regex for error messages - defaults to `${fieldDescription} is not valid`
  errors?: CustomErrors // instead of using templated errors it's possible to include an error object with keys as the error case name (see ErrorTemplateName values) to overwrite the template with a custom string (or function that has access to data for interpolation)
  transform?: (data: Payload) => any // is used to assign a new value to validate for the field object e.g. stripping out hyphens and spaces from sort-code value means we can return a new value with this method: data => data['sort-code'].replace(/-/g, '').replace(/\s+/g, '')
}

interface CustomErrors {
    [key: ErrorTemplateName]: String | Function<(field: FieldObject) => String>
}

type ErrorTemplateName = 'required' | 'betweenMinAndMax' | 'betweenMinAndMaxNumbers' | 'tooShort' | 'tooLong' | 'exactLength' | 'number' | 'currency' | 'numberMin' | 'currencyMin' | 'numberMax' | 'currencyMax' | 'pattern' | 'enum' | 'missingFile' | 'date' | 'beforeToday' | 'afterFixedDate' | 'beforeFixedDate' | 'noMatch';

```

### Responses
The `isValidPage()` function will return `true` or `false`, this method is useful when iterating a group of pages 
together. The `getPageErrors()` function will return an errors object for use in templates, even when there are no 
errors within, so to assert there are no errors we could test the value of `hasErrors` which is a boolean.
```typescript
type FieldKey = String // the key of a field which should match the HTML name of the field
type DateInput = 'day' | 'month' | 'year'

interface Errors {
  summary: Array<Error>
  inline: InlineErrors
  text: ErrorMessages
  inputs: Array<FieldKey | DateInput> // an array of all inputs in error - date errors can cover multiple inputs such as dayAndYearRequired for dates
  hasErrors: Boolean
}
interface Error {
  id: FieldKey
  text: String
  href: String
}
interface InlineErrors {
  [key: FieldKey]: Error
}
interface ErrorMessages {
  [key: FieldKey]: String
}
```

## Example usage of the errors object
In an Express route handler for a post you could pass the posted data alongside a page model to the `getPageErrors` method
and this would return an error object that either contains errors or not. In this example we are writing the page model 
directly into the call as second parameter which can often be a quick way to get error handling on a page, we could, 
alternatively, create a models.js file and export all of our models from there into our routes file.

```ecmascript 6
const validation = require('@nubz/gds-validation')

router.post('/test-page', (req, res) => {
  const errors = validation.getPageErrors(req.body, {
    fields: {
      'full-name': {
        type: 'nonEmptyString',
        name: 'Your full name'
      },
      'date-of-birth': {
        type: 'date',
        name: 'Your date of birth',
        beforeToday: true
      }
    }
  })
  
  if (errors.hasErrors) {
    res.render('/test-page', { errors })
  } else {
    res.redirect('next-page')
  }
})
```
We can create Nunjucks macros to pass the errors returned into, these macros work with govuk prototypes:
```
{% from "govuk/components/error-summary/macro.njk" import govukErrorSummary %}

{% macro summary(data = {}) %}
    {% if data.errors %}
        {{ govukErrorSummary({
            titleText: "There is a problem",
            errorList: data.errors
        })    }}
    {% endif %}
{% endmacro %}

{% macro inline(data = {}) %}
    {% if data.errors[data.key] %}
      <span id="{{ data.key }}-error-inline" class="govuk-error-message">
        <span class="govuk-visually-hidden">Error: </span>
        {{ data.errors[data.key].text }}
      </span>
    {% endif %}
{% endmacro %}
```
Then we can use these macros in a Gov Prototype kit template with our errors object, if there are no errors the template just skips over the macros.
```html
{% block content %}
<div class="govuk-grid-row">
  <div class="govuk-grid-column-two-thirds">
    {{ errorMacros.summary({errors: errors.summary}) }}
    <form action="?" method="post">
      <div class="govuk-form-group{% if errors.inline['full-name'] %} govuk-form-group--error{% endif %}">
        <fieldset class="govuk-fieldset">
          <legend class="govuk-fieldset__legend govuk-fieldset__legend--xl">
            <h1 class="govuk-fieldset__heading">
              What is your full name?
            </h1>
          </legend>
          {{ errorMacros.inline({errors: errors.inline, key: 'full-name'}) }}
          <div class="govuk-radios">
            <div class="govuk-radios__item"> ...
```

## Example custom errors
Instead of using the templates to produce errors it's possible to use custom ones instead

```ecmascript 6
const validation = require('@nubz/gds-validation')

router.post('/test-page', (req, res) => {
  const errors = validation.getPageErrors(req.body, {
    fields: {
      'full-name': {
        type: 'nonEmptyString',
        name: 'Your full name',
        errors: {
          required: 'You must give us your full name'
        }
      },
      'date-of-birth': {
        type: 'date',
        name: 'Your date of birth',
        beforeToday: true,
        errors: {
          date: 'Only valid dates can be used as date of birth',
          beforeToday: 'You must be born before today!'
        }
      }
    }
  })
  
  if (errors.hasErrors) {
    res.render('/test-page', { errors })
  } else {
    res.redirect('next-page')
  }
})
```

## Schemas and task lists

With this library it is possible to build up schemas of models and layer validation to establish the validity of groups 
of pages/forms together like in a task list pattern using the `isValidPage` method. For example:
```ecmascript 6
const schema = {
  firstPage: firstPageModel,
  secondPage: secondPageModel,
  thirdPage: thirdPageModel
}

const allPagesValid = Object.entries(schema).every(([key, value]) => validation.isValidPage(data, value))
```

If we had a way to map a page to a route, e.g. if we added a `path` property to our page models, we could use this to 
return the route to the first page that needs to be answered, using this
pattern below allows you to provide the starting point for a task in a task list 
pattern, incomplete tasks will return the first invalid page, complete tasks will 
return the end page of the task e.g. Check Your Answers

```ecmascript 6
// in this example method, `schema` would be a collection of page models either to 
// match a task or entire service
const routeToNextQuestion = (data, schema) => {
  const pages = Object.keys(schema).reduce((list, next) => {
    const page = schema[next]
    if (typeof page.includeIf === 'undefined' || page.includeIf(data)) {
      page.title = next
      list.push(page)
    }
    return list
  }, [])
  
  const invalidPages = pages.filter(next => !validation.isValidPage(data, next))
  if (!invalidPages.length) {
    // all pages are valid so route to CYA
    return 'check-your-answers'
  }

  return invalidPages[0].path
}
```

## To do list

* document api properly
* add support for custom validators being added to models
* add dynamicEnum to enable valid values to be evaluated during validation
