export const beats = [0, 1800, 2700, 5000, 6000, 9800, 11600, 12400, 14700, 15500, 18000];
export const duration = beats.at(-1)!;
export const prompts = [
  'Remember: the walkthrough is Monday at 10 AM, not Friday.',
  'What time did we decide on for the walkthrough?',
];
export const answers = [
  'Updated your launch checklist. The walkthrough is now Monday at 10:00 AM.',
  'Monday at 10:00 AM. That’s the schedule in your launch checklist.',
];
export const captions = [
  'Tell Claude what changed.', 'Claude prepares an update to your Brain.',
  'The MCP call saves the updated Markdown.', 'One note changes. Your Brain stays current.',
  'The decision is saved for the next conversation.', 'A fresh chat. A different agent.',
  'Ask ChatGPT about the same decision.', 'Semantic search finds it. Jev checks the evidence.',
  'The same note comes back as evidence.', 'ChatGPT answers from your shared Brain.',
  'Different agents. One consistent Brain.',
];
export function frameAt(time: number) {
  const phase = Math.max(0, beats.findLastIndex(beat => time >= beat));
  const recall = phase >= 5;
  const prompt = prompts[Number(recall)]!;
  const answer = answers[Number(recall)]!;
  const slice = (text: string, start: number) => text.slice(0, Math.max(0, Math.ceil(text.length * Math.min(1, (time - start) / 1500))));
  return { phase, recall, saved: phase >= 3,
    draft: phase === 0 || phase === 5 ? slice(prompt, beats[phase]!) : '',
    prompt, answer: slice(answer, beats[recall ? 9 : 4]!),
    messageVisible: recall ? phase >= 6 : phase >= 1,
    toolVisible: recall ? phase >= 7 : phase >= 2,
    busy: phase === 2 || phase === 7,
    answerVisible: recall ? phase >= 9 : phase >= 4,
  };
}
