![example workflow](https://github.com/nubz/gds-validation/actions/workflows/node.js.yml/badge.svg)

# GDS Validation

Require this package in your node apps, including govuk prototypes and use the methods to validate forms and fields to 
return error messages that are templated to GDS recommendations and optimised for use in govuk prototype Nunjucks error summary component

```
npm install --save @nubz/gds-validation
```
## API
### Requests
```typescript
// PayLoad is a flat data map containing user answers
interface Payload {
  [key: string]: string | number | Array<string> | Date
}

type getPageErrors = (data: Payload, pageModel: PageModel) => Errors
type isValidPage = (data: Payload, pageModel: PageModel) => boolean
```

### Responses
```typescript
interface Errors {
  summary: Array<Error>
  inline: InlineErrors
  text: ErrorMessages
}
interface Error {
  id: string
  text: string
  href: string
}
interface InlineErrors {
  [key: string]: Error
}
interface ErrorMessages {
  [key: string]: string
}
```

## Page models

Page models are constructed by you to describe what fields are on a page, page model types are:

```typescript
// using TypeScript interfaces as documentation

interface PageModel {
  fields: FieldsMap
  includeIf?: (data: Payload) => boolean
}

interface FieldsMap {
  [key: string]: FieldObject
}

interface FieldObject {
  type: 'date' | 'currency' | 'enum' | 'optionalString' | 'nonEmptyString' | 'number' | 'file' | 'array'
  name: string
  validValues?: Array<string> // for use if type === 'enum', value of enum will be compared to values listed here
  includeIf?: (data: Payload) => boolean
  regex?: RegExp
  exactLength?: number
  minLength?: number
  maxLength?: number
  inputType?: 'characters' | 'digits' | 'numbers' | 'letters and numbers' | 'letters' // any description of permitted keys
  numberMin?: number
  numberMax?: number
  currencyMin?: number
  currencyMax?: number
  getMaxCurrencyFromField?: (data: Payload) => number
  afterFixedDate?: Date
  beforeFixedDate?: Date
  afterDateField?: (data: Payload) => Date // define function to grab value of field e.g. data => data.afterField
  beforeDateField?: (data: Payload) => Date
  afterField?: string // description of the date being compared to e.g. 'Date of birth'
  beforeField?: string // description of the date being compared to e.g. 'Date of death'
  beforeToday?: boolean
  patternText?: string // description of regex for error messages
}
```

## Example usage
In an Express route handler for a post you could pass the posted data alongside a page model to the getPageErrors method
and this would return an error object that either contains errors or not.

For example, if I had a page with 2 fields, name and date of birth then my model might look like
```ecmascript 6
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
```
And using this in an Express route handler, you are free to either pass in the post body or the entire data set if you 
want to cross-reference other fields, fields use their name as key in page models
```ecmascript 6
const validation = require('@nubz/gds-validation')

router.post('/test-page', (req, res) => {
  const errors = validation.getPageErrors(req.body, pageModel)
  if (errors.summary.length > 0) {
    res.render('/test-page', {
      errors: errors
    }
  } else {
    res.redirect('next-page')
  }
})
```
We can create Nunjucks macros to pass the errors returned into:
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
## Schemas

With this library it is possible to build up schemas of models and layer validation to establish the validity of groups 
of pages/forms together like in a task list pattern. For example:
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
