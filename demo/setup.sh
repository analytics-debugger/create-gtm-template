# Hidden setup for demo.tape: a clean, isolated shell for recording.
# Sourced by VHS before the visible part starts. Not part of the npm package.

DEMO="${TMPDIR:-/tmp}/create-gtm-demo"
rm -rf "$DEMO" && mkdir -p "$DEMO/home/.config" "$DEMO/work"

# Isolated HOME: demo author details, projects created in the current folder.
export HOME="$DEMO/home"
cat > "$HOME/.config/create-gtm.json" <<'JSON'
{
  "author": "Analytics Debugger S.L.U.",
  "developer": "David Vallejo",
  "homepage": "https://www.analytics-debugger.com",
  "docsBase": "https://thyngster.com/",
  "outDir": "."
}
JSON
git config --global user.name "Analytics Debugger"
git config --global user.email "demo@example.com"
git config --global init.defaultBranch main
git config --global advice.detachedHead false

# Off-screen "edit in GTM": adds a send_http permission + code, commits it, and
# creates a local remote to push to.
demo_edit() {
  python3 - <<'PY'
s = open('template.tpl').read()
s = s.replace("// TODO: implement\n", "sendHttpRequest('https://graph.facebook.com/v21.0/events', { method: 'POST' }, JSON.stringify(eventData));\n")
s = s.replace("const logToConsole = require('logToConsole');\n",
              "const JSON = require('JSON');\nconst logToConsole = require('logToConsole');\nconst sendHttpRequest = require('sendHttpRequest');\n")
perm = '''  {
    "instance": {
      "key": {
        "publicId": "send_http",
        "versionId": "1"
      },
      "param": [
        {
          "key": "allowedUrls",
          "value": {
            "type": 1,
            "string": "specific"
          }
        },
        {
          "key": "urls",
          "value": {
            "type": 2,
            "listItem": [
              {
                "type": 1,
                "string": "https://graph.facebook.com/"
              }
            ]
          }
        }
      ]
    },
    "clientAnnotations": {
      "isEditedByUser": true
    },
    "isRequired": true
  },
'''
s = s.replace("___SERVER_PERMISSIONS___\n\n[\n", "___SERVER_PERMISSIONS___\n\n[\n" + perm, 1)
open('template.tpl', 'w').write(s)
PY
  git commit -qam "Send events to the Meta Conversions API"
  git init -q --bare "$DEMO/remote.git"
  git remote add origin "$DEMO/remote.git"
  git push -q -u origin main 2>/dev/null
}

cd "$DEMO/work"
export PS1='\[\e[38;5;245m\]~/projects \[\e[38;5;141m\]$\[\e[0m\] '
