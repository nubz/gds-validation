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
      type: 'nonEmptyString',
      name: 'Your full name'
    },
    'date-of-birth': {
      type: 'date',
      name: 'Your date of birth',
      beforeToday: true
    }
  }
}

// using TypeScript interfaces as documentation

interface PageModel {
  fields: FieldsMap
  includeIf?: (data: Payload) => Boolean
}

interface FieldsMap {
  [key: string]: FieldObject
}

interface FieldObject {
  type: 'date' | 'currency' | 'enum' | 'optionalString' | 'nonEmptyString' | 'number' | 'file' | 'array'
  name: String
  validValues?: Array<String> // for use if type === 'enum' or `array`, value of enum will be compared to values listed here
  matches?: Array<String> // value of input (can be any string type) must be in this list
  matchingExclusions?: Array<String> // value of input (can be any string type) must not be in this list
  noMatchText?: String // for use in error message to describe what the input is matched against - defaults to `our records` if missing
  includeIf?: (data: Payload) => Boolean
  regex?: RegExp
  exactLength?: Number
  minLength?: Number
  maxLength?: Number
  inputType?: 'characters' | 'digits' | 'numbers' | 'letters and numbers' | 'letters' // any description of permitted keys
  numberMin?: Number
  numberMax?: Number
  currencyMin?: Number
  currencyMax?: Number
  getMaxCurrencyFromField?: (data: Payload) => Number
  afterFixedDate?: Date // iso format string e.g. 2021-04-01
  beforeFixedDate?: Date
  afterDateField?: (data: Payload) => Date // define function to grab value of field e.g. data => data.afterField
  beforeDateField?: (data: Payload) => Date
  afterField?: String // description of the date being compared to e.g. 'Date of birth'
  beforeField?: String // description of the date being compared to e.g. 'Date of death'
  beforeToday?: Boolean
  patternText?: String // description of regex for error messages - defaults to `${fieldDescription} is not valid`
  errors?: CustomErrors
  transform?: (data: Payload) => any // is used to assign a new value to validate for the field object e.g. stripping out hyphens and spaces from sort-code value means we can return a new value with this method: data => data['sort-code'].replace(/-/g, '').replace(/\s+/g, '')
}

interface CustomErrors {
    [key: ErrorTemplateName]: String | Function<(field: FieldObject) => String>
}

type ErrorTemplateName = 'required' | 'betweenMinAndMax' | 'betweenMinAndMaxNumbers' | 'tooShort' | 'tooLong' | 'exactLength' | 'number' | 'currency' | 'numberMin' | 'currencyMin' | 'numberMax' | 'currencyMax' | 'currencyMaxField' | 'pattern' | 'enum' | 'missingFile' | 'date'| 'beforeDate' | 'afterDate' | 'beforeToday' | 'afterFixedDate' | 'beforeFixedDate' | 'noMatch';

```

### Responses
The `isValidPage()` function will return `true` or `false`, this method is useful when iterating a group of pages 
together. The `getPageErrors()` function will return an errors object for use in templates, even when there are no 
errors within, so to assert there are no errors we could test the value of `hasErrors` which is a boolean.
```typescript
interface Errors {
  summary: Array<Error>
  inline: InlineErrors
  text: ErrorMessages
  hasErrors: Boolean
}
interface Error {
  id: String
  text: String
  href: String
}
interface InlineErrors {
  [key: String]: Error
}
interface ErrorMessages {
  [key: String]: String
}
```

## Example usage of the errors object
In an Express route handler for a post you could pass the posted data alongside a page model to the `getPageErrors` method
and this would return an error object that either contains errors or not. In this example we are writing the page model 
directly into the call as second parameter which can often be a quick way to get error handling on a page.

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
    res.render('/test-page', {
      errors: errors
    })
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
