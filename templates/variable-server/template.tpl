___TERMS_OF_SERVICE___

By creating or modifying this file you agree to Google Tag Manager's Community
Template Gallery Developer Terms of Service available at
https://developers.google.com/tag-manager/gallery-tos (or such other URL as
Google may provide), as modified from time to time.


___INFO___

{
  "type": "MACRO",
  "id": "cvt_temp_public_id",
  "version": 1,
  "securityGroups": [],
  "displayName": "{{NAME}}",
  "categories": {{CATEGORIES}},
  "brand": {
    "id": "brand_dummy",
    "displayName": "{{AUTHOR}}"
  },
  "description": "{{DESCRIPTION}}",
  "containerContexts": [
    "SERVER"
  ]
}


___TEMPLATE_PARAMETERS___

[
  {
    "type": "TEXT",
    "name": "inputValue",
    "displayName": "Input Value",
    "simpleValueType": true,
    "help": "Value the variable will process."
  }
]


___SANDBOXED_JS_FOR_SERVER___

// {{NAME}}
// {{AUTHOR}} {{YEAR}} - {{DEVELOPER}}

const logToConsole = require('logToConsole');

const input = data.inputValue;
logToConsole('input', input);

// TODO: implement
return input;


___SERVER_PERMISSIONS___

[
  {
    "instance": {
      "key": {
        "publicId": "logging",
        "versionId": "1"
      },
      "param": [
        {
          "key": "environments",
          "value": {
            "type": 1,
            "string": "debug"
          }
        }
      ]
    },
    "clientAnnotations": {
      "isEditedByUser": true
    },
    "isRequired": true
  }
]


___TESTS___

scenarios:
- name: Returns the input value
  code: |-
    const mockData = { inputValue: 'foo' };

    assertThat(runCode(mockData)).isEqualTo('foo');


___NOTES___

Created on {{CREATED}}
