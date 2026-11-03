export async function joinWaitlist(email: string): Promise<void> {
  const failure = 'Could not join the waitlist. Please try again.';
  let response: Response;
  try { response = await fetch('/api/interest', { method: 'POST', credentials: 'omit', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event: 'waitlist', email }) }); }
  catch { throw new Error(failure); }
  if (!response.ok) throw new Error(response.status === 429 ? 'Too many requests. Try again in a minute.' : failure);
}
