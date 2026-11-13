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
    "SERVER"
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


___SANDBOXED_JS_FOR_SERVER___

// {{NAME}}
// {{AUTHOR}} {{YEAR}} - {{DEVELOPER}}

const getAllEventData = require('getAllEventData');
const logToConsole = require('logToConsole');

const eventData = getAllEventData();
logToConsole('endpoint', data.endpoint, 'event', eventData);

// TODO: implement
data.gtmOnSuccess();


___SERVER_PERMISSIONS___

[
  {
    "instance": {
      "key": {
        "publicId": "read_event_data",
        "versionId": "1"
      },
      "param": [
        {
          "key": "eventDataAccess",
          "value": {
            "type": 1,
            "string": "any"
          }
        }
      ]
    },
    "clientAnnotations": {
      "isEditedByUser": true
    },
    "isRequired": true
  },
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
    mock('getAllEventData', { event_name: 'page_view' });

    runCode({ endpoint: 'https://example.com' });

    assertApi('gtmOnSuccess').wasCalled();


___NOTES___

Created on {{CREATED}}
