import assert from 'node:assert/strict';
import { buildSync } from 'esbuild';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';

const compiled = buildSync({ entryPoints: ['src/landing.ts'], external: ['/fonts/*'], bundle: true, format: 'esm', write: false, outdir: 'dist/assets' }).outputFiles.find(file => file.path.endsWith('.js'))!.text;
type PreviewElement = {
  dataset: Record<string, string>; textContent: string; hidden: boolean; disabled: boolean; value: string;
  events: Record<string, (event?: { preventDefault(): void }) => void | Promise<void>>; attributes: Record<string, string>;
  classList: { toggle(): void }; closest(): PreviewElement; querySelector(selector: string): PreviewElement;
  addEventListener(event: string, callback: (event?: { preventDefault(): void }) => void | Promise<void>): void;
  setAttribute(key: string, value: string): void;
};
type Entry = { isIntersecting: boolean; intersectionRatio: number };

// Exercise the shipped controller with a deterministic clock and reduced-motion preference.
function preview(reduced = false, fetch: typeof globalThis.fetch = async () => new Response('{}')) {
  const elements = new Map<string, PreviewElement>();
  function element(selector: string): PreviewElement {
    if (!elements.has(selector)) elements.set(selector, {
      dataset: {}, textContent: '', hidden: false, disabled: false, value: '', events: {}, attributes: {},
      classList: { toggle() {} },
      closest: () => element('.user-message'),
      querySelector: child => element(selector + ' ' + child),
      addEventListener(event, callback) { this.events[event] = callback; },
      setAttribute(key, value) { this.attributes[key] = value; },
    });
    return elements.get(selector)!;
  }
  const toggles = ['save', 'recall'].map(scene => { const e = element(scene); e.dataset.scene = scene; return e; });
  const document = { hidden: false, querySelector: element, querySelectorAll: () => toggles, events: {} as Record<string, () => void>, addEventListener(event: string, fn: () => void) { this.events[event] = fn; } };
  const frames = new Map<number, (now: number) => void>();
  let now = 0, id = 0;
  let observer: (entries: Entry[]) => void;
  runInNewContext(compiled, {
    document, fetch,
    matchMedia: () => ({ matches: reduced, addEventListener() {} }),
    performance: { now: () => now },
    requestAnimationFrame: (fn: (now: number) => void) => { frames.set(++id, fn); return id; },
    cancelAnimationFrame: (key: number) => frames.delete(key),
    IntersectionObserver: class { constructor(fn: (entries: Entry[]) => void) { observer = fn; } observe() {} },
  });
  return { element, frames, document,
    intersect(visible: boolean) { observer([{ isIntersecting: visible, intersectionRatio: visible ? 1 : 0 }]); },
    step(time: number) { now = time; const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(now)); },
    click(selector: string) { element(selector).events.click(); },
  };
}

test('pause cancels playback; resume preserves time; offscreen and hidden pause', () => {
  const p = preview(); p.intersect(true); p.step(2800);
  assert.equal(p.element('#note-schedule').textContent, 'Friday, 10:00 AM');
  p.click('#play-demo'); assert.equal(p.frames.size, 0);
  p.step(10000); assert.equal(p.element('.demo-frame').dataset.phase, '2');
  p.click('#play-demo'); p.step(12500);
  assert.equal(p.element('#note-schedule').textContent, 'Monday, 10:00 AM');
  p.intersect(false); assert.equal(p.frames.size, 0);
  p.click('#play-demo'); p.document.hidden = true; p.document.events.visibilitychange();
  assert.equal(p.frames.size, 0);
});
test('reduced motion has complete manual scenes and no animation callbacks', () => {
  const p = preview(true); p.intersect(true);
  assert.equal(p.frames.size, 0);
  assert.equal(p.element('#agent-name').textContent, 'Claude');
  assert.match(p.element('#chat-response').textContent, /Monday at 10:00 AM\.$/);
  p.click('#play-demo');
  assert.equal(p.element('#agent-name').textContent, 'ChatGPT');
  assert.equal(p.element('#note-schedule').textContent, 'Monday, 10:00 AM');
  assert.match(p.element('#chat-response').textContent, /launch checklist\.$/);
  p.click('#play-demo'); assert.equal(p.element('#agent-name').textContent, 'Claude');
  assert.equal(p.frames.size, 0);
});
test('sequence ends once and replay starts a fresh illustrative timeline', () => {
  const p = preview(); p.intersect(true); p.step(20000);
  assert.equal(p.element('#agent-name').textContent, 'ChatGPT');
  assert.equal(p.element('#play-demo').textContent, 'Replay demo');
  assert.equal(p.frames.size, 0);
  p.click('#play-demo');
  assert.equal(p.element('#agent-name').textContent, 'Claude');
  assert.equal(p.element('#note-schedule').textContent, 'Friday, 10:00 AM');
  assert.equal(p.frames.size, 1);
});

test('agent identity follows the selected conversation', () => {
  const p = preview(true);
  assert.equal(p.element('#agent-logo').attributes.src, '/agents/claude.svg');
  p.click('recall');
  assert.equal(p.element('#agent-name').textContent, 'ChatGPT');
  assert.equal(p.element('#agent-logo').attributes.src, '/agents/openai.svg');
  p.click('save');
  assert.equal(p.element('#agent-logo').attributes.src, '/agents/claude.svg');
});

test('landing waitlist blocks duplicate submits, preserves email on failure and confirms a successful retry', async () => {
  let finish!: (response: Response) => void, calls = 0;
  const p = preview(true, async () => { calls++; return new Promise<Response>(resolve => { finish = resolve; }); });
  const form = p.element('#waitlist-form'), email = p.element('#waitlist-email'), button = p.element('#waitlist-form button');
  email.value = 'visitor@example.com';
  const pending = form.events.submit({ preventDefault() {} });
  assert.equal(button.disabled, true); assert.equal(email.disabled, true);
  await form.events.submit({ preventDefault() {} }); assert.equal(calls, 1);
  finish(new Response('{}', { status: 429 })); await pending;
  assert.equal(email.value, 'visitor@example.com'); assert.equal(button.disabled, false);
  assert.match(p.element('#waitlist-error').textContent, /Try again in a minute/);
  const retry = form.events.submit({ preventDefault() {} });
  finish(new Response('{}')); await retry;
  assert.equal(form.hidden, true); assert.equal(email.value, '');
  assert.equal(p.element('#waitlist-success').hidden, false);
});
