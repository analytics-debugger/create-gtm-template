#!/usr/bin/env node
// create-gtm: scaffold a Google Tag Manager custom template project.
//
//   npm create gtm            (interactive)
//   npm create gtm -- --context web --type tag --name "My Tag" -y
//
// Works like create-vite / create-vue: copies templates/_base plus the chosen
// templates/<type>-<context> folder and fills in {{PLACEHOLDERS}}.

import * as p from '@clack/prompts';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const TEMPLATES_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'templates');
const CONFIG_FILE = path.join(os.homedir(), '.config', 'create-gtm.json');

const TYPES = { variable: 'MACRO', tag: 'TAG', client: 'CLIENT' };
const CONTEXTS = { server: 'SERVER', web: 'WEB' };
const CATEGORIES = [
  'ADVERTISING', 'AFFILIATE_MARKETING', 'ANALYTICS', 'ATTRIBUTION', 'CHAT',
  'CONVERSIONS', 'DATA_WAREHOUSING', 'EMAIL_MARKETING', 'EXPERIMENTATION',
  'HEAT_MAP', 'LEAD_GENERATION', 'MARKETING', 'PERSONALIZATION',
  'REMARKETING', 'SALES', 'SESSION_RECORDING', 'SOCIAL', 'SURVEY',
  'TAG_MANAGEMENT', 'UTILITY',
];

// Personal defaults live in ~/.config/create-gtm.json so the package
// itself stays generic. Any key here can be overridden there.
const DEFAULTS = {
  author: '',
  developer: '',
  homepage: '',
  docsBase: '',
  outDir: process.cwd(),
};

const HELP = `Usage: npm create gtm [template] [variant] [name] [-- options]
       create-gtm [template] [variant] [name] [options]

  variant                web-variable | web-tag | server-variable | server-tag | server-client
                         (same as --context + --type; skips those questions)
  name                   template name, e.g. "Meta CAPI" (same as --name)

Commands (run inside a template project; generated projects wire these to npm scripts):
  create-gtm validate    check template.tpl and metadata.yaml
  create-gtm release     publish a new version (see: create-gtm release --help)

Examples:
  npm create gtm template
  npm create gtm template server-tag "Meta CAPI"
  npm create gtm server-tag "Meta CAPI"
  npm create gtm web-variable
  npm create gtm "Meta CAPI"

Options:
  --context <context>    web (client-side) | server
  --type <type>          variable | tag | client (client: server only)
  --name <name>          template display name
  --dir <folder>         project folder name (default: gtm-template[-server-side]-<slug>)
  --description <text>   one-line description
  --categories <list>    comma separated, e.g. ANALYTICS,UTILITY
  --docs <url>           documentation URL
  --author <name>        author / company (brand shown in GTM)
  --developer <name>     developer name for credits
  --homepage <url>       homepage URL for metadata.yaml
  --out <path>           parent directory (default: current directory)
  --git / --no-git       git init + commit, then write the commit sha into metadata.yaml
  -y, --yes              no prompts; use defaults for anything missing
  -h, --help

Personal defaults (author, developer, homepage, docsBase, outDir):
  ${CONFIG_FILE}
`;

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const expandHome = (s) => s.replace(/^~(?=$|\/)/, os.homedir());
const titleCase = (s) => s.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

function loadConfig() {
  try {
    return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) };
  } catch (e) {
    if (e.code !== 'ENOENT') console.warn(`warning: could not read ${CONFIG_FILE}: ${e.message}`);
    return DEFAULTS;
  }
}

function fail(msg) {
  p.cancel(msg);
  process.exit(1);
}

// Flag normalisers: return the clean value or call fail().
function normContext(v) {
  v = v.toLowerCase();
  if (['client', 'client-side', 'clientside'].includes(v)) v = 'web';
  if (['server-side', 'serverside', 'sgtm'].includes(v)) v = 'server';
  if (!(v in CONTEXTS)) fail(`--context must be web or server`);
  return v;
}
function normType(v, context) {
  v = v.toLowerCase();
  if (!(v in TYPES)) fail(`--type must be variable, tag or client`);
  if (v === 'client' && context !== 'server') fail('client templates only exist in server containers');
  return v;
}
function normCategories(text) {
  const cats = text.split(',').map((c) => c.trim().toUpperCase()).filter(Boolean);
  const bad = cats.filter((c) => !CATEGORIES.includes(c));
  if (bad.length) fail(`unknown categories: ${bad.join(', ')}\nvalid: ${CATEGORIES.join(', ')}`);
  if (!cats.length) fail('at least one category is required');
  return cats;
}

// "server-tag", "tag-server", "web-variable", "client-tag" (client-side) …
// Returns { context, type } or null if the value isn't a variant (then it's the name).
function parseVariant(value) {
  const parts = value.toLowerCase().split('-');
  if (parts.length !== 2) return null;
  const CONTEXT_WORDS = { web: 'web', server: 'server', sgtm: 'server' };
  for (const [a, b] of [parts, [...parts].reverse()]) {
    if (a in CONTEXT_WORDS && b in TYPES) return { context: CONTEXT_WORDS[a], type: b };
  }
  // "client" as the container means client-side: client-tag, client-variable
  for (const [a, b] of [parts, [...parts].reverse()]) {
    if (a === 'client' && (b === 'tag' || b === 'variable')) return { context: 'web', type: b };
  }
  return null;
}

const required = (label) => (v) => (v && v.trim() ? undefined : `${label} is required`);

async function main() {
  const { values: args, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      context: { type: 'string' },
      type: { type: 'string' },
      name: { type: 'string' },
      dir: { type: 'string' },
      description: { type: 'string' },
      categories: { type: 'string' },
      docs: { type: 'string' },
      author: { type: 'string' },
      developer: { type: 'string' },
      homepage: { type: 'string' },
      out: { type: 'string' },
      git: { type: 'boolean' },
      'no-git': { type: 'boolean' },
      yes: { type: 'boolean', short: 'y', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
  });
  if (args.help) return console.log(HELP);
  const rest = [...positionals];
  // `npm create gtm template …` reads naturally; the word itself is optional.
  if (['template', 'templates', 'tpl'].includes(rest[0]?.toLowerCase())) rest.shift();
  const picked = rest.length ? parseVariant(rest[0]) : null;
  if (picked) {
    rest.shift();
    args.context ??= picked.context;
    args.type ??= picked.type;
  }
  if (rest.length > 1) fail(`expected [variant] [name], got: ${positionals.join(' ')}\nquote names with spaces: "My Template"`);
  args.name ??= rest[0];
  if (args['no-git']) args.git = false;

  const config = loadConfig();
  const interactive = !args.yes && process.stdin.isTTY;
  const outDir = path.resolve(expandHome(args.out ?? config.outDir));

  // Use the flag if given; otherwise prompt, or fall back to `def` with -y.
  async function ask(flag, def, prompt) {
    if (flag !== undefined) return flag;
    if (!interactive) {
      if (def === undefined || def === '') fail('missing required values: pass them as flags, or drop --yes');
      return def;
    }
    const value = await prompt();
    if (p.isCancel(value)) {
      p.cancel('Cancelled.');
      process.exit(130);
    }
    return value;
  }

  if (interactive) p.intro(' create-gtm ');

  const context = args.context
    ? normContext(args.context)
    : await ask(undefined, 'server', () =>
        p.select({
          message: 'Which container is this template for?',
          initialValue: 'server',
          options: [
            { value: 'web', label: 'Client-side', hint: 'web container' },
            { value: 'server', label: 'Server-side', hint: 'sGTM container' },
          ],
        }));

  const typeOptions = [
    { value: 'variable', label: 'Variable', hint: 'returns a value' },
    { value: 'tag', label: 'Tag', hint: 'fires on triggers' },
  ];
  if (context === 'server') {
    typeOptions.push({ value: 'client', label: 'Client', hint: 'claims incoming requests and runs the container' });
  }
  const type = args.type
    ? normType(args.type, context)
    : await ask(undefined, 'variable', () =>
        p.select({ message: 'Template type', options: typeOptions }));

  const name = await ask(args.name, undefined, () =>
    p.text({ message: 'Template name', placeholder: 'Consent Parser', validate: required('Name') }));

  const prefix = context === 'server' ? 'gtm-template-server-side-' : 'gtm-template-';
  const dir = await ask(args.dir, `${prefix}${slugify(name)}`, () =>
    p.text({
      message: 'Project folder',
      initialValue: `${prefix}${slugify(name)}`,
      validate: (v = '') => {
        if (!v.trim()) return 'Folder is required';
        if (fs.existsSync(path.join(outDir, v))) return `${path.join(outDir, v)} already exists`;
      },
    }));

  const description = await ask(args.description, `${name} template.`, () =>
    p.text({ message: 'Short description', initialValue: `${name} template.`, validate: required('Description') }));

  const categories = args.categories
    ? normCategories(args.categories)
    : await ask(undefined, ['UTILITY'], () =>
        p.multiselect({
          message: 'Gallery categories',
          options: CATEGORIES.map((c) => ({ value: c, label: titleCase(c) })),
          initialValues: ['UTILITY'],
          required: true,
        }));

  const docsDefault = config.docsBase ? `${config.docsBase}${dir}` : '';
  const docs = await ask(args.docs, docsDefault || '-', () =>
    p.text({ message: 'Documentation URL', initialValue: docsDefault, placeholder: 'https://… (optional)' }));

  // Author details: skip the prompt when the config file already has them.
  const author = await ask(args.author ?? (config.author || undefined), undefined, () =>
    p.text({ message: 'Author / company', placeholder: 'Shown as the brand in GTM', validate: required('Author') }));
  const developer = await ask(args.developer ?? (config.developer || undefined), author, () =>
    p.text({ message: 'Developer name', initialValue: author }));
  const homepage = await ask(args.homepage ?? (config.homepage || undefined), undefined, () =>
    p.text({ message: 'Homepage URL', placeholder: 'https://…', validate: required('Homepage') }));

  const useGit = await ask(args.git, false, () =>
    p.confirm({ message: 'Initialize a git repository? (fills the commit sha in metadata.yaml)', initialValue: true }));

  const target = path.join(outDir, dir);
  if (fs.existsSync(target)) fail(`${target} already exists`);

  const now = new Date();
  const vars = {
    NAME: name,
    DIR: slugify(dir),
    DESCRIPTION: description,
    AUTHOR: author,
    DEVELOPER: developer || author,
    HOMEPAGE: homepage,
    DOCS: docs === '-' ? '' : docs,
    YEAR: String(now.getFullYear()),
    CREATED: now.toLocaleString('en-US'),
    TYPE_LABEL: type,
    CONTEXT_LABEL: context === 'server' ? 'Server-side' : 'Web',
    SHA: 'TODO_COMMIT_SHA',
    CATEGORIES: JSON.stringify(categories, null, 2).replace(/\n/g, '\n  '),
  };

  const variant = `${type}-${context}`;
  if (!fs.existsSync(path.join(TEMPLATES_DIR, variant))) fail(`no template for ${variant}`);

  const s = interactive ? p.spinner() : null;
  s?.start('Scaffolding project');
  fs.mkdirSync(target, { recursive: true });
  for (const src of ['_base', variant]) copyDir(path.join(TEMPLATES_DIR, src), target, vars);

  if (useGit) {
    s?.message('Initializing git');
    const git = (...a) => execFileSync('git', a, { cwd: target, encoding: 'utf8' }).trim();
    git('init', '-q', '-b', 'main');
    git('add', '-A');
    git('commit', '-q', '-m', 'Initial template');
    const metaPath = path.join(target, 'metadata.yaml');
    fs.writeFileSync(metaPath, fs.readFileSync(metaPath, 'utf8').replace('TODO_COMMIT_SHA', git('rev-parse', 'HEAD')));
    git('commit', '-q', '-am', 'metadata');
  }
  s?.stop(`Created ${dir}  (${TYPES[type]} / ${CONTEXTS[context]})`);

  const steps = [
    `cd ${path.relative(process.cwd(), target).startsWith('..') ? target : path.relative(process.cwd(), target)}`,
    'GTM → Templates → New → ⋮ → Import → template.tpl',
    'Run the tests in the template editor',
    'npm run validate   check the template before publishing',
    'npm run release    commit, add the version to metadata.yaml, push',
  ];

  if (interactive) {
    p.note(steps.join('\n'), 'Next steps');
    p.outro('Happy tagging!');
  } else {
    console.log(`Created ${target}  (${TYPES[type]} / ${CONTEXTS[context]})`);
  }
}

// Copy a template folder, filling placeholders. Inside .tpl files values are
// JSON escaped (they land inside JSON strings). _gitignore -> .gitignore,
// because npm strips dotfiles on publish.
function copyDir(srcDir, destDir, vars) {
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const src = path.join(srcDir, entry.name);
    const dest = path.join(destDir, entry.name === '_gitignore' ? '.gitignore' : entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(dest, { recursive: true });
      copyDir(src, dest, vars);
      continue;
    }
    const isTpl = entry.name.endsWith('.tpl');
    const content = fs.readFileSync(src, 'utf8').replace(/\{\{([A-Z_]+)\}\}/g, (m, key) => {
      if (!(key in vars)) return m;
      return isTpl && key !== 'CATEGORIES' ? JSON.stringify(vars[key]).slice(1, -1) : vars[key];
    });
    fs.writeFileSync(dest, content);
  }
}

// Subcommands used by generated projects: `npm run validate` / `npm run release`.
const COMMANDS = {
  validate: () => import('./lib/validate.js').then((m) => m.run(process.argv.slice(3))),
  release: () => import('./lib/release.js').then((m) => m.run(process.argv.slice(3))),
};
(COMMANDS[process.argv[2]] ?? main)().catch((e) => fail(e.message));
