# create-gtm

[![npm](https://img.shields.io/npm/v/create-gtm.svg)](https://www.npmjs.com/package/create-gtm)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)

Scaffold Google Tag Manager custom templates for web and server-side containers, ready to publish to the
[Community Template Gallery](https://tagmanager.google.com/gallery/).

```sh
npm create gtm template
```

`create-gtm` asks a few questions, then gives you a working template project:

- a starter `template.tpl` with fields, code, permissions and passing tests
- a gallery-ready `metadata.yaml` and Apache 2.0 `LICENSE`
- `npm run release`, which publishes new versions without hand-editing `metadata.yaml`

---

## Contents

- [Requirements](#requirements)
- [Quick start](#quick-start)
- [Template types](#template-types)
- [What gets generated](#what-gets-generated)
- [Workflow](#workflow)
- [Publishing to the gallery](#publishing-to-the-gallery)
- [CLI options](#cli-options)
- [Personal defaults](#personal-defaults)
- [Contributing](#contributing)
- [License](#license)

## Requirements

- Node.js 18.3 or newer
- git, for releases

## Quick start

```sh
npm create gtm template
# or
pnpm create gtm
yarn create gtm
bun create gtm
npx create-gtm
```

You'll be asked:

```
┌  create-gtm
◇  Which container is this template for?   Client-side / Server-side
◇  Template type                            Variable / Tag / Client
◇  Template name                            Meta CAPI
◇  Project folder                           gtm-template-server-side-meta-capi
◇  Short description
◇  Gallery categories                       ◼ Advertising  ◼ Conversions  ◻ …
◇  Documentation URL
◇  Author / company                         (skipped if set in your config)
◇  Homepage URL                             (skipped if set in your config)
◇  Initialize a git repository?             Yes
└  Created gtm-template-server-side-meta-capi  (TAG / SERVER)
```

The word `template` is optional: `npm create gtm` does the same.

### Skip questions

Pass the variant (container + type), the name, or both:

```sh
npm create gtm template server-tag "Meta CAPI"   # straight to the description
npm create gtm template web-variable             # asks the name and the rest
npm create gtm template "Meta CAPI"              # asks container and type
```

| Variant | Container | Type |
|---|---|---|
| `web-variable` | Client-side | Variable |
| `web-tag` | Client-side | Tag |
| `server-variable` | Server-side | Variable |
| `server-tag` | Server-side | Tag |
| `server-client` | Server-side | Client |

`client-tag`, `client-variable` and reversed forms such as `tag-server` also work.

To skip the questions, pass everything as flags:

```sh
npm create gtm -- --context server --type tag --name "Meta CAPI" \
  --categories ADVERTISING,CONVERSIONS --author "Acme" --homepage https://acme.com --git -y
```

## Template types

The first question picks the container. The template types on offer depend on it:

| Container | Type | Starter template |
|---|---|---|
| Client-side (web) | **Variable** | Returns a value from a text field. Permission: `logging`. |
| Client-side (web) | **Tag** | Reads an endpoint field and calls `gtmOnSuccess()`. Permission: `logging`. |
| Server-side | **Variable** | Returns a value from a text field. Permission: `logging`. |
| Server-side | **Tag** | Reads the event data and calls `gtmOnSuccess()`. Permissions: `read_event_data`, `logging`. |
| Server-side | **Client** | Claims requests on a path, runs the container and returns the response. Permissions: `read_request`, `return_response`, `access_response`, `run_container`, `logging`. |

Each starter includes tests that pass in the GTM template editor, so you start from a template that works.

## What gets generated

```
gtm-template-server-side-meta-capi/
├── template.tpl        # the template: import it in GTM
├── metadata.yaml       # gallery metadata: homepage, docs, versions
├── README.md
├── LICENSE             # Apache 2.0 (required by the gallery)
├── package.json        # npm run validate / npm run release
└── .gitignore
```

Folder names follow the gallery convention: `gtm-template-<name>` for web templates and
`gtm-template-server-side-<name>` for server-side ones.

There's nothing to `npm install`. `npm run validate` and `npm run release` run the latest `create-gtm` through
npx, so improvements to them reach every template project, including ones created earlier.

## Workflow

1. **Create:** `npm create gtm template`
2. **Build:** in GTM, go to **Templates → New → ⋮ → Import** and select `template.tpl`. Write the code, fields,
   permissions and tests in the template editor, then **⋮ → Export** and replace `template.tpl` in your project.
3. **Check:** `npm run validate`
4. **Release:** `npm run release`

### `npm run validate`

Checks the template before you publish:

- `template.tpl` has every required section, and its JSON sections parse
- the info `id` is `cvt_temp_public_id`, as the gallery expects
- `containerContexts` matches the code section (web or server)
- display name, description and at least one category are set
- `metadata.yaml` has a homepage, documentation URL and versions, and each version's sha is a commit in the repo
- `LICENSE` is Apache 2.0

It also warns about `TODO` comments left in the template code.

### `npm run release`

Publishes a new version in one step:

1. **Validates** the template.
2. **Checks git.** It warns if you're not on the default branch, stops if you're behind the remote, and lists
   other uncommitted files, which are left out of the release.
3. **Shows permission changes** since the last release, for example `+ send_http · urls: https://graph.facebook.com/`.
   If permissions got wider, it asks before continuing, because users of the template will have to accept them.
4. **Drafts change notes** from the commits to `template.tpl` since the last release. You edit them before they're
   saved.
5. **Commits** `template.tpl` (if it changed), then adds its sha and your notes as the latest version in
   `metadata.yaml` and commits that. If anything fails, both commits are rolled back.
6. **Pushes**, after asking. If you skip it, release reminds you that the gallery only sees pushed versions.

```
┌  create-gtm release
◆  Template is valid
◇  Fetched origin
▲  Permission changes since 5852a64:
│    + send_http
│        urls: https://graph.facebook.com/
◇  Release with wider permissions?  Yes
◇  Change notes
│  Add event deduplication.
│  Send events to Meta.
◇  Release ───────────────────────────────────╮
│  commit template.tpl  "Send events to Meta"  │
│  commit metadata.yaml "metadata"             │
├──────────────────────────────────────────────╯
◆  metadata.yaml → 314e6c9
◇  Pushed to origin
└  Released! The gallery picks up the new version on its next sync.
```

```sh
npm run release
npm run release -- -m "Add deduplication" --notes "Add event deduplication." --notes "Fix: empty user data." --push
```

| Option | Description |
|---|---|
| `-m, --message <text>` | Commit message for `template.tpl` (default: `Update template`) |
| `--notes <text>` | A change-notes line. Repeat it for several lines. Without it you're asked. |
| `--push` / `--no-push` | Push without asking, or skip pushing |
| `-y, --yes` | No questions: accept warnings and use the drafted notes (for CI) |

`release` refuses to run if `template.tpl` hasn't changed since the last released version.

## Publishing to the gallery

The gallery reads your template from a public GitHub repository. It publishes the commit listed first under
`versions:` in `metadata.yaml`.

**First release**

1. Create a public GitHub repository and add it as the remote:
   `git remote add origin git@github.com:you/gtm-template-….git`
2. Run `npm run release` and push when asked.
3. Submit the repository through the
   [Community Template Gallery submission process](https://developers.google.com/tag-manager/templates/gallery).

**Updates**

Run `npm run release`. The gallery picks up the new version on its next sync.

## CLI options

```
npm create gtm [template] [variant] [name] [-- options]
```

Anything you don't pass is asked interactively. With `-y`, defaults are used instead, and `--name`,
`--author` and `--homepage` are required unless your config file sets the author and homepage.

| Option | Description | Default |
|---|---|---|
| `--context <web\|server>` | Container type (`client` / `client-side` also mean web) | `server` |
| `--type <variable\|tag\|client>` | Template type (`client` is server only) | `variable` |
| `[variant]` | `web-variable`, `web-tag`, `server-variable`, `server-tag` or `server-client`. Same as `--context` + `--type` | |
| `[name]`, `--name <text>` | Template display name. `npm create gtm "Meta CAPI"` is the same as `--name "Meta CAPI"` | |
| `--dir <folder>` | Project folder name | `gtm-template[-server-side]-<name>` |
| `--description <text>` | Short description shown in GTM | `<name> template.` |
| `--categories <list>` | Comma-separated gallery categories | `UTILITY` |
| `--docs <url>` | Documentation URL | `docsBase` + folder |
| `--author <text>` | Author or company, shown as the brand in GTM | config |
| `--developer <text>` | Developer name for the README credits | author |
| `--homepage <url>` | Homepage URL for `metadata.yaml` | config |
| `--out <path>` | Where to create the project folder | config `outDir`, or the current folder |
| `--git` / `--no-git` | Initialize git and fill the first sha in `metadata.yaml` | asked; off with `-y` |
| `-y, --yes` | Don't ask any questions | |
| `-h, --help` | Show help | |

Categories: `ADVERTISING`, `AFFILIATE_MARKETING`, `ANALYTICS`, `ATTRIBUTION`, `CHAT`, `CONVERSIONS`,
`DATA_WAREHOUSING`, `EMAIL_MARKETING`, `EXPERIMENTATION`, `HEAT_MAP`, `LEAD_GENERATION`, `MARKETING`,
`PERSONALIZATION`, `REMARKETING`, `SALES`, `SESSION_RECORDING`, `SOCIAL`, `SURVEY`, `TAG_MANAGEMENT`, `UTILITY`.

## Personal defaults

Save your details in `~/.config/create-gtm.json`, and they're filled in automatically and no longer asked:

```json
{
  "author": "Acme Analytics",
  "developer": "Jane Doe",
  "homepage": "https://acme.com",
  "docsBase": "https://acme.com/docs/",
  "outDir": "~/projects"
}
```

| Key | Used for |
|---|---|
| `author` | Brand name in GTM, README credits |
| `developer` | README credits |
| `homepage` | `homepage` in `metadata.yaml` |
| `docsBase` | Default documentation URL: `docsBase` + project folder |
| `outDir` | Where new projects are created |

## Contributing

```sh
git clone https://github.com/analytics-debugger/create-gtm-template.git
cd create-gtm-template
npm install
npm link        # makes the `create-gtm` command available globally
create-gtm
```

### How it works

It works the same way as `create-vite`. `index.js` asks the questions, then copies two folders into the new project:

- `templates/_base/`: files every project gets (metadata, license, README, package.json). `_gitignore` is renamed to
  `.gitignore`, because npm drops dotfiles when publishing.
- `templates/<type>-<context>/`: the `template.tpl` for the chosen variant, for example `tag-server`.

`validate` and `release` live in `lib/` and run as `create-gtm validate` / `create-gtm release`. To try local
changes in a template project, run `node /path/to/create-gtm-template/index.js release` there.

### Adding or changing a starter

Edit or add `templates/<type>-<context>/template.tpl`. These placeholders are replaced when a project is
created. Inside `.tpl` files, values are JSON-escaped.

| Placeholder | Value |
|---|---|
| `{{NAME}}` | Template display name |
| `{{DESCRIPTION}}` | Short description |
| `{{CATEGORIES}}` | JSON array of categories |
| `{{AUTHOR}}`, `{{DEVELOPER}}` | Author / company and developer |
| `{{HOMEPAGE}}`, `{{DOCS}}` | Homepage and documentation URLs |
| `{{DIR}}` | Project folder name |
| `{{YEAR}}`, `{{CREATED}}` | Current year and creation timestamp |
| `{{TYPE_LABEL}}`, `{{CONTEXT_LABEL}}` | For example `tag` and `Server-side` |
| `{{SHA}}` | `TODO_COMMIT_SHA`, filled in by `--git` or the first `npm run release` |

Before opening a pull request, generate each variant you changed, import it in GTM and run its tests.

## License

[Apache License 2.0](LICENSE). Projects generated by `create-gtm` are Apache 2.0 too, as the Community Template
Gallery requires.

Created by **Analytics Debugger S.L.U.**
