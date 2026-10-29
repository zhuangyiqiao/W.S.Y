export const MODES = { focus: 25, short: 5, long: 15 };
export function dayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function createTimer(mode = 'focus', minutes = MODES[mode], now = Date.now()) {
  if (!Object.hasOwn(MODES, mode) || !Number.isInteger(minutes) || minutes < 1 || minutes > 180) throw new Error('时长应为 1—180 的整数分钟');
  return { id: crypto.randomUUID(), mode, duration: minutes * 60, remaining: minutes * 60, state: 'idle', deadline: null, updatedAt: now, taskId: null };
}
export function secondsLeft(timer, now = Date.now()) {
  return timer.state === 'running' ? Math.max(0, Math.ceil((timer.deadline - now) / 1000)) : timer.remaining;
}
export function toggleTimer(timer, now = Date.now()) {
  if (timer.state === 'running') return { ...timer, state: 'paused', remaining: secondsLeft(timer, now), deadline: null, updatedAt: now };
  if (timer.state === 'completed') timer = { ...createTimer(timer.mode, timer.duration / 60, now), taskId: timer.taskId };
  return { ...timer, state: 'running', deadline: now + timer.remaining * 1000, updatedAt: now };
}
export function settleTimer(timer, now = Date.now()) {
  return timer.state === 'running' && secondsLeft(timer, now) === 0 ? { ...timer, state: 'completed', remaining: 0, deadline: null, updatedAt: now } : timer;
}
export function normalizeTasks(value, today = dayKey()) {
  if (!Array.isArray(value)) return [];
  const ids = new Set();
  return value.filter(t => t && typeof t.title === 'string' && t.title.trim()).map(t => {
    const id = typeof t.id === 'string' && t.id.length < 100 && !ids.has(t.id) ? t.id : crypto.randomUUID();
    ids.add(id);
    return { id, title: t.title.trim().slice(0, 120), completed: !!t.completed, date: /^\d{4}-\d{2}-\d{2}$/.test(t.date) ? t.date : today, created_at: typeof t.created_at === 'string' ? t.created_at : new Date().toISOString(), completed_at: typeof t.completed_at === 'string' ? t.completed_at : null, pomodoro_count: Math.max(0, Math.floor(Number(t.pomodoro_count) || 0)) };
  });
}
export function validTimer(t) {
  return t && Object.hasOwn(MODES, t.mode) && typeof t.id === 'string' && ['idle','running','paused','completed'].includes(t.state) && Number.isFinite(t.duration) && t.duration >= 60 && t.duration <= 10800 && Number.isFinite(t.remaining) && t.remaining >= 0 && t.remaining <= t.duration && (t.state !== 'running' || Number.isFinite(t.deadline));
}
export function completeFocus(data, timer, date = dayKey()) {
  if (timer.mode !== 'focus' || timer.state !== 'completed' || data.completed.includes(timer.id)) return data;
  const stats = { ...data.stats, [date]: { ...data.stats[date], pomodoros: (data.stats[date]?.pomodoros || 0) + 1 } };
  return { ...data, completed: [...data.completed, timer.id], stats, tasks: data.tasks.map(t => t.id === timer.taskId ? { ...t, pomodoro_count: t.pomodoro_count + 1 } : t) };
}

export const MUSIC_PROVIDERS = {
  qq: { name: 'QQ 音乐', home: 'https://y.qq.com/', login: 'https://y.qq.com/n/ryqq/profile', hosts: ['y.qq.com','i.y.qq.com','c.y.qq.com','c6.y.qq.com','c7.y.qq.com','c8.y.qq.com','c9.y.qq.com'], enabled: true },
  spotify: { name: 'Spotify', home: 'https://open.spotify.com/', login: 'https://accounts.spotify.com/', hosts: ['open.spotify.com'], enabled: false },
  netease: { name: '网易云音乐', home: 'https://music.163.com/', login: 'https://music.163.com/', hosts: ['music.163.com','y.music.163.com'], enabled: false }
};
export function parseMusicLink(raw, provider = 'qq') {
  const p = MUSIC_PROVIDERS[provider];
  if (!p || typeof raw !== 'string' || raw.length > 2048) throw new Error('请输入有效的音乐链接');
  let url;
  try { url = new URL(raw.trim()); } catch { throw new Error('请粘贴完整的 https:// 音乐链接'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !p.hosts.includes(url.hostname)) throw new Error(`请使用 ${p.name} 的官方 HTTPS 链接`);
  // Keep song identifiers and fragments; never accept iframe HTML or a third-party stream URL.
  return { platform: provider, url: url.href };
}
