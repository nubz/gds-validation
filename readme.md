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

It is possible to build up schemas of models and layer validation to establish the validity of many pages together.