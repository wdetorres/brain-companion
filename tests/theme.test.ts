import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';
import { buildSync } from 'esbuild';

const script = buildSync({ entryPoints: ['src/theme.ts'], bundle: true, format: 'iife', write: false }).outputFiles[0]!.text;

function page(saved: string | null = null, blocked = false) {
  const root = { dataset: {} as Record<string, string> };
  let themeColor = '';
  const listeners: Record<string, (event: object) => void> = {};
  const listen = (name: string, listener: (event: object) => void) => { listeners[name] = listener; };
  class Element { toggle: boolean; constructor(toggle = true) { this.toggle = toggle; } closest() { return this.toggle ? this : null; } }
  runInNewContext(script, {
    Element,
    document: { documentElement: root, querySelector: () => ({ setAttribute: (_: string, value: string) => { themeColor = value; } }), addEventListener: listen },
    window: { addEventListener: listen },
    localStorage: {
      getItem() { if (blocked) throw Error('Storage unavailable'); return saved; },
      setItem(_: string, value: string) { if (blocked) throw Error('Storage unavailable'); saved = value; },
    },
  });
  return { theme: () => root.dataset.theme, color: () => themeColor, saved: () => saved,
    click(toggle = true) { listeners.click!({ target: new Element(toggle) }); },
    storage(key: string | null, newValue: string | null) { listeners.storage!({ key, newValue }); },
  };
}

test('theme defaults to dark, persists toggles, and restores before rendering', () => {
  const p = page();
  assert.equal(p.theme(), 'dark');
  p.click(false); assert.equal(p.theme(), 'dark');
  p.click(); assert.equal(p.theme(), 'light'); assert.equal(p.color(), '#f5f5f5');
  assert.equal(page(p.saved()).theme(), 'light');
  p.click(); assert.equal(p.saved(), 'dark'); assert.equal(p.color(), '#141414');
});

test('blocked storage still allows switching; invalid preferences and cleared storage use dark', () => {
  const p = page(null, true); p.click(); assert.equal(p.theme(), 'light');
  assert.equal(page('unexpected').theme(), 'dark');
  p.storage('unrelated', 'dark'); assert.equal(p.theme(), 'light');
  p.storage('brain-theme', 'dark'); assert.equal(p.theme(), 'dark');
  p.storage('brain-theme', 'light'); assert.equal(p.theme(), 'light');
  p.storage(null, null); assert.equal(p.theme(), 'dark');
});

test('every page loads the theme before styles', async () => {
  for (const name of ['index', 'landing', 'docs']) {
    const html = await readFile(`public/${name}.html`, 'utf8');
    const controller = html.indexOf('<script src="/assets/theme.js"></script>');
    assert.ok(controller >= 0 && controller < html.indexOf('<link rel="stylesheet"'));
  }
});
