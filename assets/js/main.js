let timerId = null;
let remainingSeconds = 25 * 60;
let timerRunning = false;
let statusMessage = '';
let ambientOn = false;

const taskStorageKey = 'rainy-cafe-tasks';
const catStorageKey = 'rainy-cafe-cat';

function getTasks() {
  try {
    const stored = JSON.parse(localStorage.getItem(taskStorageKey) || '[]');
    return Array.isArray(stored) ? stored : [];
  } catch (error) {
    console.error('读取任务失败', error);
    return [];
  }
}

function saveTasks(tasks) {
  localStorage.setItem(taskStorageKey, JSON.stringify(tasks));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[character]));
}

function renderClock() {
  const clock = document.getElementById('cafe-clock');
  if (!clock) return;
  clock.textContent = new Date().toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

function renderTimer() {
  const timer = document.getElementById('pomodoro-time');
  const status = document.getElementById('pomodoro-status');
  const toggle = document.getElementById('pomodoro-toggle');
  if (!timer || !status || !toggle) return;

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  timer.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  status.textContent = statusMessage || (timerRunning ? 'FOCUSING' : remainingSeconds < 25 * 60 ? 'PAUSED' : 'READY');
  toggle.textContent = timerRunning ? '暂停专注' : '开始专注';
}

function renderTasks() {
  const list = document.getElementById('cafe-task-list');
  const count = document.getElementById('task-count');
  if (!list || !count) return;

  const tasks = getTasks();
  const completed = tasks.filter(task => task.completed).length;
  count.textContent = `${completed} / ${tasks.length}`;

  list.innerHTML = tasks.length
    ? tasks.map(task => `
        <label class="task-row${task.completed ? ' completed' : ''}">
          <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleCafeTask('${task.id}')">
          <span>${escapeHtml(task.title)}</span>
          <button type="button" aria-label="删除任务" onclick="removeCafeTask(event, '${task.id}')">×</button>
        </label>
      `).join('')
    : '<p class="empty-tasks">桌面还是空的，写下一件今晚想完成的事吧。</p>';
}

function addCafeTask(event) {
  event.preventDefault();
  const input = document.getElementById('cafe-task-input');
  const title = input?.value.trim();
  if (!title) return;

  const tasks = getTasks();
  tasks.push({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title,
    completed: false
  });
  saveTasks(tasks);
  input.value = '';
  renderTasks();
}

function toggleCafeTask(taskId) {
  const tasks = getTasks().map(task => (
    task.id === taskId ? { ...task, completed: !task.completed } : task
  ));
  saveTasks(tasks);
  renderTasks();
}

function removeCafeTask(event, taskId) {
  event.preventDefault();
  event.stopPropagation();
  saveTasks(getTasks().filter(task => task.id !== taskId));
  renderTasks();
}

function clearCafeTasks() {
  if (!getTasks().length) return;
  localStorage.removeItem(taskStorageKey);
  renderTasks();
  toggleSettings();
}

function finishPomodoro() {
  window.clearInterval(timerId);
  timerId = null;
  timerRunning = false;
  remainingSeconds = 25 * 60;
  statusMessage = 'MEOW! DONE';
  document.getElementById('footer-message').textContent = '这一轮完成了，起来走走吧。';
  const cat = document.getElementById('cafe-cat');
  cat?.classList.add('celebrate');
  window.setTimeout(() => cat?.classList.remove('celebrate'), 1800);
  renderTimer();
}

function togglePomodoro() {
  statusMessage = '';
  timerRunning = !timerRunning;
  if (timerRunning) {
    timerId = window.setInterval(() => {
      remainingSeconds -= 1;
      if (remainingSeconds <= 0) finishPomodoro();
      renderTimer();
    }, 1000);
  } else {
    window.clearInterval(timerId);
    timerId = null;
  }
  renderTimer();
}

function resetPomodoro() {
  window.clearInterval(timerId);
  timerId = null;
  remainingSeconds = 25 * 60;
  timerRunning = false;
  statusMessage = '';
  document.getElementById('footer-message').textContent = '猫猫会陪你到这一轮结束。';
  renderTimer();
}

function selectCafeCat(button) {
  document.querySelectorAll('.cat-option').forEach(option => option.classList.remove('selected'));
  button.classList.add('selected');
  document.getElementById('cafe-cat').textContent = button.dataset.cat;
  localStorage.setItem(catStorageKey, button.dataset.cat);
}

function toggleAmbient() {
  ambientOn = !ambientOn;
  const button = document.getElementById('sound-toggle');
  const note = document.getElementById('ambient-note');
  document.querySelector('.cafe-app')?.classList.toggle('ambient-on', ambientOn);
  if (button) button.textContent = ambientOn ? '已开启' : '开启';
  if (note) note.textContent = ambientOn ? '雨声正在窗外播放，祝你今晚顺利。' : '让窗外的雨替你挡住一点喧嚣。';
}

function toggleSettings() {
  const drawer = document.getElementById('settings-drawer');
  if (!drawer) return;
  const isOpen = drawer.classList.toggle('open');
  drawer.setAttribute('aria-hidden', String(!isOpen));
}

function init() {
  renderClock();
  renderTimer();
  renderTasks();
  window.setInterval(renderClock, 1000);

  const savedCat = localStorage.getItem(catStorageKey);
  const savedButton = [...document.querySelectorAll('.cat-option')].find(button => button.dataset.cat === savedCat);
  if (savedButton) selectCafeCat(savedButton);
}

window.addCafeTask = addCafeTask;
window.toggleCafeTask = toggleCafeTask;
window.removeCafeTask = removeCafeTask;
window.clearCafeTasks = clearCafeTasks;
window.togglePomodoro = togglePomodoro;
window.resetPomodoro = resetPomodoro;
window.selectCafeCat = selectCafeCat;
window.toggleAmbient = toggleAmbient;
window.toggleSettings = toggleSettings;

init();
