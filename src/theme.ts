function applyTheme(value: string | null) {
  const theme = value === 'light' ? 'light' : 'dark';
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#f5f5f5' : '#141414');
}

let saved: string | null = null;
try { saved = localStorage.getItem('brain-theme'); } catch { /* Storage can be unavailable in private or file-based previews. */ }
applyTheme(saved);

document.addEventListener('click', event => {
  if (!(event.target instanceof Element) || !event.target.closest('[data-theme-toggle]')) return;
  const theme = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  applyTheme(theme);
  try { localStorage.setItem('brain-theme', theme); } catch { /* The current page still switches when storage is unavailable. */ }
});
window.addEventListener('storage', event => {
  if (event.key === 'brain-theme' || event.key === null) applyTheme(event.newValue);
});
