import './landing.css';
import { frameAt, beats, captions, duration } from './landing-timeline.ts';

const demo = document.querySelector<HTMLElement>('.demo-frame')!;
const play = document.querySelector<HTMLButtonElement>('#play-demo')!;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const agent = document.querySelector('#agent-name')!;
const agentLogo = document.querySelector('#agent-logo')!;
const prompt = document.querySelector('#chat-prompt')!;
const response = document.querySelector<HTMLElement>('#chat-response')!;
const draft = document.querySelector('#draft-text')!;
const call = document.querySelector<HTMLElement>('#mcp-call')!;
const callName = document.querySelector('#call-name')!;
const callState = document.querySelector('#call-state')!;
const callDetail = document.querySelector('#call-detail')!;
const note = document.querySelector<HTMLElement>('.note-preview')!;
const schedule = document.querySelector('#note-schedule')!;
const oldSchedule = document.querySelector<HTMLElement>('#old-schedule')!;
const source = document.querySelector('#note-source-text')!;
const context = document.querySelector('#note-context')!;
const caption = document.querySelector('#scene-caption')!;
const status = document.querySelector('#demo-status')!;
const toggles = document.querySelectorAll<HTMLButtonElement>('.scene-toggle');
let elapsed = reduced.matches ? 9000 : 0;
let playing = false;
let started = false;
let request = 0;
let previousTime = 0;
let previousPhase = -1;
let rendered = '';

// Scripted target-state preview. No MCP requests, private data, or note writes.
function render() {
  const f = frameAt(elapsed);
  const key = [f.phase, f.draft, f.answer, playing, reduced.matches].join('|');
  if (key === rendered) return;
  rendered = key;
  demo.dataset.playing = String(playing);
  demo.dataset.phase = String(f.phase);
  agent.textContent = f.recall ? 'ChatGPT' : 'Claude';
  agentLogo.setAttribute('src', `/agents/${f.recall ? 'openai' : 'claude'}.svg`);
  prompt.textContent = f.prompt;
  prompt.closest<HTMLElement>('.user-message')!.dataset.visible = String(f.messageVisible);
  response.textContent = f.answer;
  response.dataset.visible = String(f.answerVisible);
  draft.textContent = f.draft || `Message ${f.recall ? 'ChatGPT' : 'Claude'}…`;
  draft.classList.toggle('typing', !!f.draft);
  call.dataset.visible = String(f.toolVisible);
  call.dataset.busy = String(f.busy);
  callName.textContent = f.recall ? 'recall' : 'remember';
  callState.textContent = f.busy ? (f.recall ? 'Finding evidence…' : 'Saving…') : (f.recall ? 'Evidence found' : 'Saved');
  callDetail.textContent = f.recall ? 'Keyword search → Jev evidence review' : 'Update schedule → Monday, 10:00 AM';
  schedule.textContent = f.saved ? 'Monday, 10:00 AM' : 'Friday, 10:00 AM';
  oldSchedule.hidden = !f.saved || f.recall;
  source.textContent = f.saved ? 'Your conversation with Claude.' : 'The original planning note.';
  context.textContent = f.saved ? (f.recall ? 'Same Brain · same note' : 'Saved to your Brain') : 'Your shared Brain';
  note.dataset.updated = String(f.phase === 3 || f.phase === 4);
  for (const toggle of toggles) toggle.setAttribute('aria-pressed', String((toggle.dataset.scene === 'recall') === f.recall));
  caption.textContent = captions[f.phase]!;
  play.textContent = reduced.matches ? 'Next scene' : playing ? 'Pause demo' : elapsed >= duration ? 'Replay demo' : started ? 'Resume demo' : 'Play demo';
  play.setAttribute('aria-label', reduced.matches ? `Next scene: ${f.recall ? 'save in Claude' : 'recall in ChatGPT'}` : play.textContent!);
  if (previousPhase !== f.phase) {
    status.textContent = captions[f.phase]!;
    previousPhase = f.phase;
  }
}
function pause() {
  playing = false;
  cancelAnimationFrame(request);
  render();
}
function tick(now: number) {
  if (!playing) return;
  elapsed = Math.min(duration, elapsed + now - previousTime);
  previousTime = now;
  if (elapsed === duration) playing = false;
  render();
  if (playing) request = requestAnimationFrame(tick);
}
function start(from = elapsed) {
  cancelAnimationFrame(request);
  elapsed = from;
  started = true;
  playing = !reduced.matches;
  previousTime = performance.now();
  render();
  if (playing) request = requestAnimationFrame(tick);
}
play.addEventListener('click', () => {
  if (reduced.matches) start(frameAt(elapsed).recall ? 9000 : duration);
  else if (playing) pause();
  else start(elapsed >= duration ? 0 : elapsed);
});
for (const toggle of toggles) toggle.addEventListener('click', () => {
  const recall = toggle.dataset.scene === 'recall';
  start(reduced.matches ? (recall ? duration : 9000) : (recall ? beats[5]! : 0));
});
reduced.addEventListener('change', () => {
  pause();
  if (reduced.matches) start(frameAt(elapsed).recall ? duration : 9000);
});
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
new IntersectionObserver(([entry]) => {
  if (!entry) return;
  if (!entry.isIntersecting) pause();
  else if (entry.intersectionRatio >= .35 && !started && !reduced.matches && !document.hidden) start();
}, { threshold: .35 }).observe(demo);
render();
