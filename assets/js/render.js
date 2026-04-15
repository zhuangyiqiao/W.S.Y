import { getCssVar } from './utils.js';
import { getTrendChartInstance, setTrendChartInstance } from './state.js';

export function showPage(id, btn) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  if (btn) btn.classList.add('active');
}

export function showToast(message, duration = 2500) {
  const t = document.getElementById('toast');
  t.textContent = message;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), duration);
}

export function setSubmitLoading(isLoading) {
  const btn = document.getElementById('submit-btn');
  if (!btn) return;
  btn.disabled = isLoading;
  btn.style.opacity = isLoading ? '0.7' : '1';
  btn.textContent = isLoading ? '[ 提交中... ]' : '[ 提交打卡 ]';
}

export function generateEmptyHeatmap(containerId) {
  const grid = document.getElementById(containerId);
  if (!grid) return;
  grid.innerHTML = '';
  for (let i = 0; i < 30; i++) {
    const cell = document.createElement('div');
    cell.className = 'heatmap-cell';
    grid.appendChild(cell);
  }
}

export function buildChart() {
  const canvas = document.getElementById('trendChart');
  if (!canvas) return;

  const current = getTrendChartInstance();
  if (current) {
    current.destroy();
  }

  const textColor = getCssVar('--c-muted');
  const gridColor = getCssVar('--c-border');
  const line1 = getCssVar('--c-accent');
  const line2 = getCssVar('--c-accent2');
  const line3 = getCssVar('--c-danger');

  const nextChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: ['W01', 'W02', 'W03', 'W04'],
      datasets: [
        {
          label: '漾',
          data: [0, 0, 0, 0],
          borderColor: line1,
          backgroundColor: 'transparent',
          tension: 0.3,
          pointBackgroundColor: line1,
          pointRadius: 4,
          borderDash: []
        },
        {
          label: '闪',
          data: [0, 0, 0, 0],
          borderColor: line2,
          backgroundColor: 'transparent',
          tension: 0.3,
          pointBackgroundColor: line2,
          pointRadius: 4,
          borderDash: [4, 3]
        },
        {
          label: '源',
          data: [0, 0, 0, 0],
          borderColor: line3,
          backgroundColor: 'transparent',
          tension: 0.3,
          pointBackgroundColor: line3,
          pointRadius: 4,
          borderDash: [2, 4]
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: textColor,
            font: { family: 'Space Mono', size: 10 }
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: textColor,
            font: { family: 'Space Mono', size: 10 }
          },
          grid: { color: gridColor }
        },
        y: {
          min: 0,
          max: 100,
          ticks: {
            color: textColor,
            font: { family: 'Space Mono', size: 10 },
            callback: v => v + '%'
          },
          grid: { color: gridColor }
        }
      }
    }
  });

  setTrendChartInstance(nextChart);
}

export function updateChartTheme() {
  buildChart();
}

export function initBars() {
  setTimeout(() => {
    document.getElementById('bar-yang').style.width = '0%';
    document.getElementById('bar-shan').style.width = '0%';
    document.getElementById('bar-yuan').style.width = '0%';
  }, 150);
}
