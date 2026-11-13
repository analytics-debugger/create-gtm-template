// `create-gtm release`: publish a new version to the GTM Community Template Gallery.
//
//   npm run release
//   npm run release -- -m "Add dedup" --notes "Add event deduplication." --push --yes
//
// The gallery publishes the sha listed first under `versions:` in metadata.yaml.
// This command:
//   1. validates the template
//   2. checks git: branch, behind remote, other uncommitted files
//   3. shows permission changes since the last release
//   4. drafts change notes from the commits since the last release
//   5. commits template.tpl (if changed) and metadata.yaml, rolling back on failure
//   6. pushes

import * as p from '@clack/prompts';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { findRoot, parseTpl, permissionsKey, releasedShas, validate } from './validate.js';

const GENERIC_SUBJECTS = /^(initial template|update template|metadata|wip)$/i;

export async function run(argv) {
  const { values: args } = parseArgs({
    args: argv,
    options: {
      message: { type: 'string', short: 'm' },
      notes: { type: 'string', multiple: true },
      push: { type: 'boolean' },
      'no-push': { type: 'boolean' },
      yes: { type: 'boolean', short: 'y', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
  });
  if (args.help) return console.log(HELP);
  if (args['no-push']) args.push = false;

  const interactive = process.stdin.isTTY && !args.yes;
  const fail = (msg) => {
    p.cancel(msg);
    process.exit(1);
  };
  const bail = (v) => {
    if (p.isCancel(v)) fail('Cancelled.');
    return v;
  };
  // Warnings that need a decision: --yes accepts, non-interactive without --yes stops.
  const confirmOrStop = async (message) => {
    if (args.yes) return;
    if (!interactive) fail(`${message}\nRe-run with --yes to continue anyway.`);
    if (!bail(await p.confirm({ message, initialValue: false }))) fail('Cancelled.');
  };

  const root = findRoot();
  if (!root) fail('no template.tpl found here or in any parent folder');
  const git = (...a) => execFileSync('git', a, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  const tryGit = (...a) => {
    try {
      return git(...a);
    } catch {
      return null;
    }
  };

  p.intro(' create-gtm release ');

  // 1. validate ---------------------------------------------------------------
  if (tryGit('rev-parse', '--git-dir') === null) fail('not a git repository: run `git init` and commit first');
  const { errors, warnings } = validate(root, { allowTodoSha: true });
  for (const w of warnings) p.log.warn(w);
  if (errors.length) fail(`Fix these first:\n${errors.map((e) => `  • ${e}`).join('\n')}`);
  p.log.success('Template is valid');

  // 2. git safety ---------------------------------------------------------------
  const branch = git('rev-parse', '--abbrev-ref', 'HEAD');
  if (branch === 'HEAD') fail('detached HEAD: check out a branch first');
  const remote = tryGit('remote')?.split('\n')[0] || null;

  const defaultBranch =
    tryGit('symbolic-ref', '--short', `refs/remotes/${remote ?? 'origin'}/HEAD`)?.replace(/^[^/]+\//, '') ??
    (tryGit('rev-parse', '--verify', '-q', 'main') !== null ? 'main' : tryGit('rev-parse', '--verify', '-q', 'master') !== null ? 'master' : branch);
  if (branch !== defaultBranch) {
    p.log.warn(`You're on "${branch}", not "${defaultBranch}". The gallery reads the default branch.`);
    await confirmOrStop(`Release from "${branch}" anyway?`);
  }

  if (remote) {
    const s = p.spinner();
    s.start(`Fetching ${remote}`);
    const fetched = tryGit('fetch', '-q', remote) !== null;
    s.stop(fetched ? `Fetched ${remote}` : `Could not fetch ${remote} (offline?)`);
    const upstream = tryGit('rev-parse', '--abbrev-ref', '@{u}');
    if (fetched && upstream) {
      const behind = Number(git('rev-list', '--count', 'HEAD..@{u}'));
      if (behind > 0) fail(`Your branch is ${behind} commit(s) behind ${upstream}: run \`git pull\` first.`);
    }
  }

  // Not trimmed: porcelain lines start with a status column that may be a space (" M file").
  const status = execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' })
    .split('\n')
    .filter(Boolean)
    .map((l) => ({ line: l, file: l.slice(3) }));
  const templateDirty = status.some((s) => s.file === 'template.tpl');
  const others = status.filter((s) => !['template.tpl', 'metadata.yaml'].includes(s.file));
  if (others.length) {
    p.log.warn(`Not part of the release (left uncommitted):\n${others.map((s) => `  ${s.line}`).join('\n')}`);
  }
  if (status.some((s) => s.file === 'metadata.yaml')) {
    await confirmOrStop('metadata.yaml has uncommitted changes. They will be included in the release commit. Continue?');
  }

  // 3. what is being released ---------------------------------------------------
  const metaPath = path.join(root, 'metadata.yaml');
  const metaOrig = fs.readFileSync(metaPath, 'utf8');
  const lastSha = releasedShas(metaOrig)[0] ?? null;

  if (!templateDirty) {
    const sha = tryGit('log', '-1', '--format=%H', '--', 'template.tpl');
    if (!sha) fail('template.tpl has never been committed');
    if (metaOrig.includes(sha)) fail(`${sha.slice(0, 7)} is already released. Change template.tpl first.`);
  }

  // Permission changes since the last release
  const prevTpl = lastSha ? tryGit('show', `${lastSha}:template.tpl`) : null;
  const curTpl = fs.readFileSync(path.join(root, 'template.tpl'), 'utf8');
  const diff = diffPermissions(prevTpl, curTpl);
  if (diff.first) {
    p.log.info(`Permissions in this first release:\n${diff.lines.join('\n')}`);
  } else if (diff.lines.length) {
    p.log.warn(`Permission changes since ${lastSha.slice(0, 7)}:\n${diff.lines.join('\n')}`);
    if (diff.widened) {
      p.log.warn('Users of this template will have to review and accept the new permissions.');
      await confirmOrStop('Release with wider permissions?');
    }
  } else {
    p.log.success('No permission changes');
  }

  // 4. commit message + change notes ------------------------------------------
  let message = args.message;
  if (templateDirty && !message) {
    message = interactive
      ? bail(await p.text({ message: 'Commit message for template.tpl', initialValue: 'Update template' }))
      : 'Update template';
  }

  let draft;
  if (!lastSha) {
    draft = ['Initial release.'];
  } else {
    const subjects = (tryGit('log', '--format=%s', '--reverse', `${lastSha}..HEAD`, '--', 'template.tpl') ?? '')
      .split('\n')
      .concat(templateDirty ? [message] : [])
      .map((s) => s.trim())
      .filter((s) => s && !GENERIC_SUBJECTS.test(s));
    draft = [...new Set(subjects)].map((s) => (/[.!?]$/.test(s) ? s : `${s}.`));
  }

  let notes = args.notes;
  if (!notes?.length) {
    if (interactive) {
      const text = bail(
        await p.multiline({
          message: 'Change notes (one per line, press Enter twice to finish)',
          initialValue: draft.join('\n'),
          validate: (v = '') => (v.trim() ? undefined : 'Change notes are required'),
        }),
      );
      notes = text.split('\n');
    } else {
      notes = draft;
    }
  }
  notes = notes.map((n) => n.trim()).filter(Boolean);
  if (!notes.length) fail('Change notes are required: pass --notes "…"');

  p.note(
    [
      templateDirty ? `commit template.tpl  "${message}"` : `release ${git('log', '-1', '--format=%h %s', '--', 'template.tpl')}`,
      'commit metadata.yaml "metadata"',
      '',
      ...notes.map((n) => `• ${n}`),
    ].join('\n'),
    'Release',
  );
  if (interactive && !bail(await p.confirm({ message: 'Create this release?', initialValue: true }))) fail('Cancelled.');

  // 5. commit, rolling back on failure ---------------------------------------
  const startHead = git('rev-parse', 'HEAD');
  let sha;
  try {
    if (templateDirty) {
      git('add', 'template.tpl');
      git('commit', '-q', '-m', message, '--', 'template.tpl');
    }
    sha = git('log', '-1', '--format=%H', '--', 'template.tpl');
    fs.writeFileSync(metaPath, addVersion(metaOrig, sha, notes));
    git('add', 'metadata.yaml');
    git('commit', '-q', '-m', 'metadata', '--', 'metadata.yaml');
  } catch (e) {
    tryGit('reset', '-q', startHead);
    fs.writeFileSync(metaPath, metaOrig);
    fail(`Release failed and was rolled back: ${e.stderr?.toString().trim() || e.message}`);
  }
  p.log.success(`metadata.yaml → ${sha.slice(0, 7)}`);

  // 6. push -------------------------------------------------------------------
  if (!remote) {
    p.log.warn('No git remote. Add one and push. The gallery only sees the release after that.');
    return p.outro('Released locally');
  }
  let push = args.push;
  if (push === undefined) push = interactive ? bail(await p.confirm({ message: `Push to ${remote}?`, initialValue: true })) : false;
  if (!push) {
    p.log.warn('Not pushed. The gallery only sees the release after `git push`.');
    return p.outro('Released locally');
  }
  const s = p.spinner();
  s.start(`Pushing to ${remote}`);
  try {
    if (tryGit('rev-parse', '--abbrev-ref', '@{u}')) git('push', '-q');
    else git('push', '-q', '-u', remote, branch);
    s.stop(`Pushed to ${remote}`);
  } catch (e) {
    s.stop('Push failed', 1);
    p.log.error(e.stderr?.toString().trim() || e.message);
    p.log.warn('The release commits exist locally. Fix the problem and run `git push`.');
    process.exit(1);
  }
  p.outro('Released! The gallery picks up the new version on its next sync.');
}

// Add `sha` + notes as the newest version, replacing the TODO placeholder on first release.
export function addVersion(meta, sha, notes) {
  const entry =
    `  - sha: ${sha}\n` +
    (notes.length === 1 && !/[:#]/.test(notes[0])
      ? `    changeNotes: ${notes[0]}\n`
      : `    changeNotes: |2\n${notes.map((n) => `      ${n}`).join('\n')}\n`);
  const todo = /^[ \t]*-[ \t]*sha:[ \t]*TODO_COMMIT_SHA[ \t]*\n(?:[ \t]{4,}.*\n?)*/m;
  if (todo.test(meta)) return meta.replace(todo, entry);
  const versions = /^versions:[ \t]*\n([ \t]*#.*\n)?/m;
  if (versions.test(meta)) return meta.replace(versions, (m) => m + entry);
  throw new Error('could not find `versions:` in metadata.yaml');
}

// --- permission diff ------------------------------------------------------------

function permissions(tplText) {
  const map = new Map();
  if (!tplText) return map;
  const sections = parseTpl(tplText);
  let list = [];
  try {
    list = JSON.parse(sections[permissionsKey(sections)] ?? '[]');
  } catch {
    return map;
  }
  for (const perm of list) {
    const id = perm.instance?.key?.publicId;
    if (!id) continue;
    const values = new Set();
    for (const param of perm.instance.param ?? []) collect(param.key, param.value, values);
    map.set(id, values);
  }
  return map;
}

// Flatten a permission param into readable lines such as "urls: https://x.com/*".
function collect(key, value, out) {
  if (!value || typeof value !== 'object') return;
  if (value.type === 1) return out.add(`${key}: ${value.string}`);
  if (value.type === 8) return out.add(`${key}: ${value.boolean}`);
  if (value.type === 3) {
    const strings = (value.mapValue ?? []).map((v) => v.string ?? v.boolean).filter((v) => v !== undefined);
    return out.add(`${key}: ${strings.join(' ')}`);
  }
  for (const item of value.listItem ?? []) collect(key, item, out);
}

export function diffPermissions(prevTpl, curTpl) {
  const cur = permissions(curTpl);
  if (!prevTpl) {
    return { first: true, widened: false, lines: [...cur.keys()].map((id) => `  ${id}`) };
  }
  const prev = permissions(prevTpl);
  const lines = [];
  let widened = false;
  for (const [id, values] of cur) {
    if (!prev.has(id)) {
      widened = true;
      lines.push(`  + ${id}`, ...[...values].map((v) => `      ${v}`));
      continue;
    }
    const old = prev.get(id);
    for (const v of values) {
      if (!old.has(v)) {
        widened = true;
        lines.push(`  + ${id} · ${v}`);
      }
    }
    for (const v of old) if (!values.has(v)) lines.push(`  - ${id} · ${v}`);
  }
  for (const id of prev.keys()) if (!cur.has(id)) lines.push(`  - ${id}`);
  return { first: false, widened, lines };
}

const HELP = `Usage: npm run release [-- options]
       create-gtm release [options]

Publishes a new version: validates, commits template.tpl, adds the sha and
change notes to metadata.yaml, commits it and pushes.

Options:
  -m, --message <text>   commit message for template.tpl (default: "Update template")
  --notes <text>         a change-notes line (repeat for several; default: drafted from commits)
  --push / --no-push     push without asking / don't push
  -y, --yes              no questions: accept warnings, use drafted notes
  -h, --help
`;
