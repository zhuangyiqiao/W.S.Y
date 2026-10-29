import { deleteCheckinRequest, updateCheckinRequest } from './api.js';
import { getCheckinById, loadCheckinsData } from './data.js';
import {
  fillHistoryEditor,
  renderApp,
  renderLoadError,
  resetHistoryEditor,
  showPage,
  showToast,
  toggleHistoryEditor,
  updateChartTheme
} from './render.js';
import { handleEvidenceFileChange, selectType, submitCheckin, validatePayload } from './checkin.js';

let activeEditingRecordId = '';
let cafeTimerId = null;
let cafeRemainingSeconds = 25 * 60;
let cafeIsRunning = false;
let cafeStatusMessage = '';

function toggleTheme() {
  document.body.classList.toggle('light-theme');
  const theme = document.body.classList.contains('light-theme') ? 'light' : 'dark';
  localStorage.setItem('ironpact-theme', theme);
  updateChartTheme();
}

function initTheme() {
  const saved = localStorage.getItem('ironpact-theme');
  if (saved === 'light') {
    document.body.classList.add('light-theme');
  }
}

function initToday() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const input = document.getElementById('date-input');
  if (input) input.value = `${yyyy}-${mm}-${dd}`;
}

function renderCafeClock() {
  const element = document.getElementById('cafe-clock');
  if (!element) return;
  element.textContent = new Date().toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

function renderCafeTimer() {
  const element = document.getElementById('pomodoro-time');
  const status = document.getElementById('pomodoro-status');
  const toggle = document.getElementById('pomodoro-toggle');
  if (!element || !status || !toggle) return;

  const minutes = Math.floor(cafeRemainingSeconds / 60);
  const seconds = cafeRemainingSeconds % 60;
  element.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  toggle.textContent = cafeIsRunning ? '暂停专注' : '开始专注';
  status.textContent = cafeStatusMessage || (
    cafeIsRunning ? '专注中' : cafeRemainingSeconds < 25 * 60 ? '已暂停' : '准备好了'
  );
}

function getCafeTasks() {
  try {
    const tasks = JSON.parse(localStorage.getItem('rainy-cafe-tasks') || '[]');
    return Array.isArray(tasks) ? tasks : [];
  } catch (error) {
    console.error(error);
    return [];
  }
}

function saveCafeTasks(tasks) {
  localStorage.setItem('rainy-cafe-tasks', JSON.stringify(tasks));
}

function renderCafeTasks() {
  const list = document.getElementById('cafe-task-list');
  const count = document.getElementById('task-count');
  if (!list || !count) return;

  const tasks = getCafeTasks();
  const completed = tasks.filter(task => task.completed).length;
  count.textContent = `${completed}/${tasks.length}`;
  list.innerHTML = tasks.length
    ? tasks.map(task => `
        <label class="cafe-task${task.completed ? ' done' : ''}">
          <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleCafeTask('${task.id}')">
          <span>${escapeCafeText(task.title)}</span>
        </label>
      `).join('')
    : '<div class="cafe-note">还没有任务，写下一件今晚想完成的事吧。</div>';
}

function escapeCafeText(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[character]));
}

function addCafeTask(event) {
  event.preventDefault();
  const input = document.getElementById('cafe-task-input');
  const title = input?.value.trim();
  if (!title) return;

  const tasks = getCafeTasks();
  tasks.push({ id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, title, completed: false });
  saveCafeTasks(tasks);
  input.value = '';
  renderCafeTasks();
}

function toggleCafeTask(taskId) {
  const tasks = getCafeTasks().map(task => (
    task.id === taskId ? { ...task, completed: !task.completed } : task
  ));
  saveCafeTasks(tasks);
  renderCafeTasks();
}

function togglePomodoro() {
  cafeStatusMessage = '';
  cafeIsRunning = !cafeIsRunning;
  if (cafeIsRunning) {
    cafeTimerId = window.setInterval(() => {
      cafeRemainingSeconds -= 1;
      if (cafeRemainingSeconds <= 0) {
        window.clearInterval(cafeTimerId);
        cafeTimerId = null;
        cafeRemainingSeconds = 25 * 60;
        cafeIsRunning = false;
        cafeStatusMessage = '完成啦，喵！';
        document.getElementById('cafe-cat')?.classList.add('celebrate');
        window.setTimeout(() => document.getElementById('cafe-cat')?.classList.remove('celebrate'), 1800);
      }
      renderCafeTimer();
    }, 1000);
  } else if (cafeTimerId) {
    window.clearInterval(cafeTimerId);
    cafeTimerId = null;
  }
  renderCafeTimer();
}

function resetPomodoro() {
  if (cafeTimerId) window.clearInterval(cafeTimerId);
  cafeTimerId = null;
  cafeRemainingSeconds = 25 * 60;
  cafeIsRunning = false;
  cafeStatusMessage = '';
  renderCafeTimer();
}

function selectCafeCat(button) {
  document.querySelectorAll('.cat-option').forEach(option => option.classList.remove('selected'));
  button.classList.add('selected');
  const cat = document.getElementById('cafe-cat');
  if (cat) cat.textContent = button.dataset.cat;
  localStorage.setItem('rainy-cafe-cat', button.dataset.cat);
}

function initCafeWorkspace() {
  renderCafeClock();
  renderCafeTimer();
  renderCafeTasks();
  window.setInterval(renderCafeClock, 1000);

  const savedCat = localStorage.getItem('rainy-cafe-cat');
  const savedButton = [...document.querySelectorAll('.cat-option')].find(button => button.dataset.cat === savedCat);
  if (savedButton) selectCafeCat(savedButton);
}

function toggleCafeSound() {
  const button = document.getElementById('sound-toggle');
  if (!button) return;
  const enabled = button.dataset.enabled !== 'true';
  button.dataset.enabled = String(enabled);
  button.textContent = enabled ? '已开启' : '开启';
}

async function refreshAppData() {
  try {
    const viewModel = await loadCheckinsData();
    renderApp(viewModel);

    if (activeEditingRecordId && !getCheckinById(activeEditingRecordId)) {
      activeEditingRecordId = '';
      resetHistoryEditor();
    }
  } catch (error) {
    console.error(error);
    renderLoadError(error.message || '初始化失败');
    showToast('[ 数据加载失败 ]', 3000);
  }
}

function getHistoryEditorPayload() {
  return {
    user: document.getElementById('history-user-select')?.value || '',
    date: document.getElementById('history-date-input')?.value || '',
    type: document.getElementById('history-type-select')?.value || '',
    duration: document.getElementById('history-duration-input')?.value
      ? Number(document.getElementById('history-duration-input').value)
      : null,
    steps: document.getElementById('history-steps-input')?.value
      ? Number(document.getElementById('history-steps-input').value)
      : null,
    weight: document.getElementById('history-weight-input')?.value
      ? Number(document.getElementById('history-weight-input').value)
      : null,
    note: document.getElementById('history-note-input')?.value?.trim() || ''
  };
}

function cancelHistoryEdit() {
  activeEditingRecordId = '';
  resetHistoryEditor();
}

function startHistoryEdit(recordId) {
  const record = getCheckinById(recordId);
  if (!record) {
    showToast('[ 没有找到这条记录 ]', 2400);
    return;
  }

  activeEditingRecordId = recordId;
  fillHistoryEditor(record);
}

async function saveHistoryEdit() {
  if (!activeEditingRecordId) {
    showToast('[ 请先选择一条记录 ]', 2400);
    return;
  }

  const payload = getHistoryEditorPayload();
  const error = validatePayload(payload);
  if (error) {
    showToast(`[ ${error} ]`, 2600);
    return;
  }

  try {
    await updateCheckinRequest(activeEditingRecordId, payload);
    await refreshAppData();
    showToast('[ 历史记录已更新 ]');
    cancelHistoryEdit();
  } catch (err) {
    console.error(err);
    showToast(`[ ${err.message || '更新失败'} ]`, 2800);
  }
}

async function deleteHistoryRecord(recordId) {
  const record = getCheckinById(recordId);
  if (!record) {
    showToast('[ 没有找到这条记录 ]', 2400);
    return;
  }

  const confirmed = window.confirm(`删除 ${record.user} 在 ${record.date} 的这条记录？`);
  if (!confirmed) return;

  try {
    await deleteCheckinRequest(recordId);
    await refreshAppData();

    if (activeEditingRecordId === recordId) {
      cancelHistoryEdit();
    }

    showToast('[ 历史记录已删除 ]');
  } catch (err) {
    console.error(err);
    showToast(`[ ${err.message || '删除失败'} ]`, 2800);
  }
}

async function initApp() {
  initTheme();
  initToday();
  toggleHistoryEditor(false);
  await refreshAppData();
}

window.showPage = showPage;
window.toggleTheme = toggleTheme;
window.selectType = selectType;
window.handleEvidenceFileChange = handleEvidenceFileChange;
window.submitCheckin = submitCheckin;
window.startHistoryEdit = startHistoryEdit;
window.saveHistoryEdit = saveHistoryEdit;
window.cancelHistoryEdit = cancelHistoryEdit;
window.deleteHistoryRecord = deleteHistoryRecord;
window.addCafeTask = addCafeTask;
window.toggleCafeTask = toggleCafeTask;
window.togglePomodoro = togglePomodoro;
window.resetPomodoro = resetPomodoro;
window.selectCafeCat = selectCafeCat;
window.toggleCafeSound = toggleCafeSound;

window.addEventListener('checkin:submitted', () => {
  window.setTimeout(() => {
    refreshAppData();
  }, 600);
});

initCafeWorkspace();
initApp();
