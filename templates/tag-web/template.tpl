___TERMS_OF_SERVICE___

By creating or modifying this file you agree to Google Tag Manager's Community
Template Gallery Developer Terms of Service available at
https://developers.google.com/tag-manager/gallery-tos (or such other URL as
Google may provide), as modified from time to time.


___INFO___

{
  "type": "TAG",
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
    "WEB"
  ]
}


___TEMPLATE_PARAMETERS___

[
  {
    "type": "TEXT",
    "name": "endpoint",
    "displayName": "Endpoint",
    "simpleValueType": true,
    "valueValidators": [
      {
        "type": "NON_EMPTY"
      }
    ]
  }
]


___SANDBOXED_JS_FOR_WEB_TEMPLATE___

// {{NAME}}
// {{AUTHOR}} {{YEAR}} - {{DEVELOPER}}

const logToConsole = require('logToConsole');

logToConsole('endpoint', data.endpoint);

// TODO: implement
data.gtmOnSuccess();


___WEB_PERMISSIONS___

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
- name: Calls gtmOnSuccess
  code: |-
    runCode({ endpoint: 'https://example.com' });

    assertApi('gtmOnSuccess').wasCalled();


___NOTES___

Created on {{CREATED}}
