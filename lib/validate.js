// `create-gtm validate`: check template.tpl and metadata.yaml before publishing
// to the GTM Community Template Gallery.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/** Split a .tpl file into { '___SECTION___': body }. */
export function parseTpl(text) {
  const parts = text.split(/^(___[A-Z_]+___)$/m);
  const sections = {};
  for (let i = 1; i < parts.length; i += 2) sections[parts[i]] = parts[i + 1].trim();
  return sections;
}

/** Permissions section key for a parsed template. */
export function permissionsKey(sections) {
  return '___SANDBOXED_JS_FOR_SERVER___' in sections ? '___SERVER_PERMISSIONS___' : '___WEB_PERMISSIONS___';
}

/** Released shas listed in metadata.yaml, newest first (TODO placeholder excluded). */
export function releasedShas(meta) {
  return [...meta.matchAll(/^\s*-\s*sha:\s*(\S+)/gm)].map((m) => m[1]).filter((s) => s !== 'TODO_COMMIT_SHA');
}

/** Walk up from `dir` to the folder holding template.tpl. */
export function findRoot(dir = process.cwd()) {
  for (let d = path.resolve(dir); ; d = path.dirname(d)) {
    if (fs.existsSync(path.join(d, 'template.tpl'))) return d;
    if (path.dirname(d) === d) return null;
  }
}

export function validate(root, { allowTodoSha = false } = {}) {
  const errors = [];
  const warnings = [];
  const read = (f) => {
    try {
      return fs.readFileSync(path.join(root, f), 'utf8');
    } catch {
      errors.push(`${f} is missing`);
      return '';
    }
  };

  // --- template.tpl -------------------------------------------------------
  const sections = parseTpl(read('template.tpl'));
  const has = (s) => s in sections;
  const context = has('___SANDBOXED_JS_FOR_SERVER___') ? 'SERVER' : 'WEB';
  const codeKey = context === 'SERVER' ? '___SANDBOXED_JS_FOR_SERVER___' : '___SANDBOXED_JS_FOR_WEB_TEMPLATE___';
  const permKey = permissionsKey(sections);

  for (const key of ['___TERMS_OF_SERVICE___', '___INFO___', '___TEMPLATE_PARAMETERS___', codeKey, permKey]) {
    if (!has(key)) errors.push(`template.tpl: missing section ${key}`);
  }
  if (!has('___TESTS___')) warnings.push('template.tpl: no ___TESTS___ section');

  const json = (key) => {
    if (!has(key)) return null;
    try {
      return JSON.parse(sections[key]);
    } catch (e) {
      errors.push(`template.tpl: ${key} is not valid JSON (${e.message})`);
      return null;
    }
  };
  const info = json('___INFO___');
  json('___TEMPLATE_PARAMETERS___');
  json(permKey);

  if (info) {
    if (info.id !== 'cvt_temp_public_id') warnings.push(`___INFO___ id is "${info.id}", the gallery expects "cvt_temp_public_id"`);
    if (!info.displayName) errors.push('___INFO___ displayName is empty');
    if (!info.description) errors.push('___INFO___ description is empty');
    if (!info.categories?.length) errors.push('___INFO___ needs at least one category');
    if (!info.containerContexts?.includes(context)) {
      errors.push(`___INFO___ containerContexts does not match the code section (${context})`);
    }
  }
  if (has(codeKey) && /\bTODO\b/.test(sections[codeKey])) warnings.push('template code still contains TODO comments');

  // --- metadata.yaml ------------------------------------------------------
  const meta = read('metadata.yaml');
  if (meta) {
    if (!/^homepage:\s*"?\S+/m.test(meta)) errors.push('metadata.yaml: homepage is empty');
    if (!/^documentation:\s*"?[^"\s]+/m.test(meta)) errors.push('metadata.yaml: documentation is empty');
    const all = [...meta.matchAll(/^\s*-\s*sha:\s*(\S+)/gm)].map((m) => m[1]);
    if (!all.length) errors.push('metadata.yaml: no versions listed');
    if (all.includes('TODO_COMMIT_SHA') && !allowTodoSha) {
      errors.push('metadata.yaml: TODO_COMMIT_SHA not replaced (npm run release fills it)');
    }
    for (const sha of releasedShas(meta)) {
      try {
        execFileSync('git', ['cat-file', '-e', `${sha}^{commit}`], { cwd: root, stdio: 'ignore' });
      } catch {
        errors.push(`metadata.yaml: sha ${sha} is not a commit in this repository`);
      }
    }
  }

  // --- LICENSE ------------------------------------------------------------
  if (!/Apache License/.test(read('LICENSE'))) errors.push('LICENSE must be the Apache License 2.0');

  return { errors, warnings };
}

export function run() {
  const root = findRoot();
  if (!root) {
    console.error('✖  no template.tpl found here or in any parent folder');
    process.exit(1);
  }
  const { errors, warnings } = validate(root);
  for (const w of warnings) console.log(`⚠  ${w}`);
  for (const e of errors) console.log(`✖  ${e}`);
  if (errors.length) process.exit(1);
  console.log('✔  template is valid');
}
