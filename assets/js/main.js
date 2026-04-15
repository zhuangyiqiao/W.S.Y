import { showPage, buildChart, updateChartTheme, generateEmptyHeatmap, initBars } from './render.js';
import { selectType, handleEvidenceFileChange, submitCheckin } from './checkin.js';

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

window.showPage = showPage;
window.toggleTheme = toggleTheme;
window.selectType = selectType;
window.handleEvidenceFileChange = handleEvidenceFileChange;
window.submitCheckin = submitCheckin;

initTheme();
initToday();
initBars();
generateEmptyHeatmap('heat-yang');
generateEmptyHeatmap('heat-shan');
generateEmptyHeatmap('heat-yuan');
buildChart();
