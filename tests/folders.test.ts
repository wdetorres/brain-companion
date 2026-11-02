import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFolders, isInFolder, parentFolders } from '../src/folders.ts';
import type { Note } from '../src/shared.ts';

const note = (path: string, title = path.slice(path.lastIndexOf('/') + 1)): Note => ({ path, title, links: [], folder: 'projects', markdown: '', body: '', revision: 'test', unresolved: [], tags: [], sources: [], modifiedAt: '2026-11-02T00:00:00Z' });

test('folder browsing preserves nested paths, root notes, and repeated names without changing notes', () => {
  const notes = [note('Projects/Other/Plan.md', 'Plan'), note('BRAIN.md', 'Brain'), note('Projects/Build/Design/Plan.md', 'Plan'), note('Projects/Build/Overview.md', 'Overview'), note('Archives/Build/Plan.md', 'Plan')];
  const before = structuredClone(notes);
  const tree = buildFolders(notes);
  assert.equal(tree.count, 5);
  assert.deepEqual(tree.notes.map(n => n.path), ['BRAIN.md']);
  assert.deepEqual(tree.folders.map(f => [f.name, f.count]), [['Archives', 1], ['Projects', 3]]);
  const build = tree.folders[1].folders[0];
  assert.equal(build.path, 'Projects/Build');
  assert.equal(build.count, 2);
  assert.equal(build.folders[0].notes[0].path, 'Projects/Build/Design/Plan.md');
  assert.equal(build.notes[0].path, 'Projects/Build/Overview.md');
  assert.deepEqual(notes, before);
});

test('folders preserve numbered names and sort naturally; empty and filtered inputs stay empty', () => {
  const tree = buildFolders([note('10 Archives/Z.md'), note('01 Projects/B.md', 'Beta'), note('01 Projects/A.md', 'Alpha'), note('02 Areas/A.md')]);
  assert.deepEqual(tree.folders.map(f => f.name), ['01 Projects', '02 Areas', '10 Archives']);
  assert.deepEqual(tree.folders[0].notes.map(n => n.title), ['Alpha', 'Beta']);
  assert.equal(buildFolders([]).count, 0);
  assert.deepEqual(buildFolders([]).folders, []);
});

test('folder scope includes descendants without matching neighboring prefixes', () => {
  assert.deepEqual(parentFolders('01 Projects/Build/Design/Plan.md'), ['01 Projects', '01 Projects/Build', '01 Projects/Build/Design']);
  assert.deepEqual(parentFolders('BRAIN.md'), []);
  assert.equal(isInFolder('Projects/Build/Design/Plan.md', 'Projects/Build'), true);
  assert.equal(isInFolder('Projects/Builder/Plan.md', 'Projects/Build'), false);
  assert.equal(isInFolder('Projects/Build.md', 'Projects/Build'), false);
  assert.equal(isInFolder('BRAIN.md', ''), true);
});
