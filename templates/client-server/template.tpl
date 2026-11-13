___TERMS_OF_SERVICE___

By creating or modifying this file you agree to Google Tag Manager's Community
Template Gallery Developer Terms of Service available at
https://developers.google.com/tag-manager/gallery-tos (or such other URL as
Google may provide), as modified from time to time.


___INFO___

{
  "type": "CLIENT",
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
    "name": "requestPath",
    "displayName": "Request Path",
    "simpleValueType": true,
    "defaultValue": "/collect",
    "valueValidators": [
      {
        "type": "NON_EMPTY"
      }
    ],
    "help": "The client claims requests sent to this path."
  }
]


___SANDBOXED_JS_FOR_SERVER___

// {{NAME}}
// {{AUTHOR}} {{YEAR}} - {{DEVELOPER}}

const claimRequest = require('claimRequest');
const getRequestPath = require('getRequestPath');
const logToConsole = require('logToConsole');
const returnResponse = require('returnResponse');
const runContainer = require('runContainer');
const setResponseStatus = require('setResponseStatus');

if (getRequestPath() !== data.requestPath) return;

claimRequest();

// TODO: build the event from the request
const event = { event_name: 'page_view' };
logToConsole('event', event);

runContainer(event, () => {
  setResponseStatus(200);
  returnResponse();
});


___SERVER_PERMISSIONS___

[
  {
    "instance": {
      "key": {
        "publicId": "read_request",
        "versionId": "1"
      },
      "param": [
        {
          "key": "requestAccess",
          "value": {
            "type": 1,
            "string": "any"
          }
        },
        {
          "key": "headerAccess",
          "value": {
            "type": 1,
            "string": "any"
          }
        },
        {
          "key": "queryParameterAccess",
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
        "publicId": "return_response",
        "versionId": "1"
      },
      "param": []
    },
    "isRequired": true
  },
  {
    "instance": {
      "key": {
        "publicId": "access_response",
        "versionId": "1"
      },
      "param": [
        {
          "key": "writeResponseAccess",
          "value": {
            "type": 1,
            "string": "any"
          }
        },
        {
          "key": "writeHeaderAccess",
          "value": {
            "type": 1,
            "string": "specific"
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
        "publicId": "run_container",
        "versionId": "1"
      },
      "param": []
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
- name: Claims requests on the configured path
  code: |-
    mock('getRequestPath', '/collect');

    runCode({ requestPath: '/collect' });

    assertApi('claimRequest').wasCalled();
    assertApi('runContainer').wasCalled();
- name: Ignores other paths
  code: |-
    mock('getRequestPath', '/other');

    runCode({ requestPath: '/collect' });

    assertApi('claimRequest').wasNotCalled();


___NOTES___

Created on {{CREATED}}
