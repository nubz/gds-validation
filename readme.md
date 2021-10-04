GDS Validation

Require this package in your node prototype and use the methods to validate forms and fields. 

In an Express route handler for a post you could pass the posted data alongside a page model to the getPageErrors method 
and this would return an error object that either contains errors or not.

All error messages are templated to meet GDS specifications

Page models are constructed by you to describe what fields are on a page and should be in the format:
```
{
  fields: Array<FieldObject>
  includeIf?: Function<boolean>
}

// FieldObject
{
  type: 'date' | 'currency' | 'enum' | 'optionalString' | 'nonEmptyString' | 'number' | 'dynamicEnum' | 'file' | 'array',
  name: string // description of whatever-it-is, to be interpolated with error messages
  validValues?: Array<string> // required if type === 'enum', all values of an enum
  includeIf?: Function<data => boolean>
  regex?: RegEx
  exactLength?: number
  minLength?: number
  maxLength?: number
  inputType?: 'digits' | 'numbers' | 'letters and numbers' | 'letters' // any description of permitted keys
  numberMin?: number
  numberMax?: number
  currencyMin?: number
  currencyMax?: number
  getMaxCurrencyFromField?: Function<number>
  afterFixedDate?: date
  beforeFixedDate?: date
  getAfterDate?: Function<date>
  getBeforeDate?: Function<date>
  afterDateField?: string // description for error messages of the date being compared to
  beforeDateField?: string // description for error messages of the date being compared to
  beforeToday?: boolean
  patternText?: string // description of regex for error messages
}
```
For example, if I had a page with 2 fields, name and date of birth then my model might look like
```
const pageModel = {
  fields: {
    'name': {
      type: 'nonEmptyString',
      name: 'Your name'
    },
    'date-of-birth': {
      type: 'date',
      name: 'Your date of birth'
      beforeToday: true
    }
  }
}
```
And using this in an Express route handler:
```
const validation = require('gds-validation')

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

The errors object returned contains summary, inline and text objects for use in templates.

If we have some Nunjucks macros to pass errors into:
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
Then we can use these macros in a standard Prototype kit template with our errors object, if there are no errors the template just skips over the macros.
```
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

It is possible to build up schemas of models and layer validation to establish the validity of many pages together.