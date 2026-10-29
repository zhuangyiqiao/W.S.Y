import { createTimer, normalizeTasks, validTimer } from './domain.js';
export const STORAGE_KEY = 'rainy-cafe-v2';
const fallback = () => ({ version: 2, tasks: [], timer: createTimer(), completed: [], stats: {}, music: [], selectedMusic: null, settings: { scene: 'cafe', cat: 'black', meow: true, animation: true, night: false, saveSounds: true, sounds: {} } });
export function loadData(storage = localStorage) {
  const defaults = fallback();
  let saved;
  try { saved = JSON.parse(storage.getItem(STORAGE_KEY) || 'null'); } catch { /* recover from invalid local JSON */ }
  if (saved?.version === 2) {
    return { ...defaults, ...saved, version: 2, tasks: normalizeTasks(saved.tasks), timer: validTimer(saved.timer) ? saved.timer : defaults.timer, settings: { ...defaults.settings, ...saved.settings }, completed: Array.isArray(saved.completed) ? saved.completed.filter(id => typeof id === 'string') : [], stats: saved.stats && typeof saved.stats === 'object' && !Array.isArray(saved.stats) ? saved.stats : {}, music: Array.isArray(saved.music) ? saved.music.filter(m => m && typeof m.id === 'string' && typeof m.url === 'string') : [] };
  }
  try {
    const legacy = JSON.parse(storage.getItem('rainy-cafe-tasks') || '[]');
    defaults.tasks = normalizeTasks(legacy);
    const cats = { '🐈': 'black', '🐈‍⬛': 'coal', '🐱': 'cream', '😺': 'orange' };
    defaults.settings.cat = cats[storage.getItem('rainy-cafe-cat')] || 'black';
    // Original keys remain untouched as a migration backup.
  } catch { /* local mode remains usable */ }
  return defaults;
}
export function saveData(data, storage = localStorage) {
  try { storage.setItem(STORAGE_KEY, JSON.stringify(data)); return true; } catch { return false; }
}
