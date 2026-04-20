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

window.addEventListener('checkin:submitted', () => {
  window.setTimeout(() => {
    refreshAppData();
  }, 600);
});

initApp();
