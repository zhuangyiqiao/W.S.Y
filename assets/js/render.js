import { getCssVar } from './utils.js';
import { formatMetaDate, formatMoney } from './data.js';
import { getTrendChartInstance, setTrendChartInstance } from './state.js';

let latestViewModel = null;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  }
}

function renderEmptyRow(columns, message) {
  const cells = [
    `<span style="font-family:var(--c-mono);color:var(--c-muted)">--</span>`,
    `<span class="score-name" style="color:var(--c-muted)">${escapeHtml(message)}</span>`
  ];

  while (cells.length < columns) {
    const className = cells.length === columns - 1 ? 'score-streak' : 'score-pts';
    cells.push(`<span class="${className}" style="color:var(--c-muted)">--</span>`);
  }

  return `<div class="score-row">${cells.join('')}</div>`;
}

function isLightTheme() {
  return document.body.classList.contains('light-theme');
}

function getMemberUiColor(member) {
  return isLightTheme() ? member.lightTextColor : member.chartColor;
}

function getHeatmapColor(member, level) {
  if (level === 0) return `rgba(${member.heatColorRgb}, ${isLightTheme() ? '0.14' : '0.08'})`;
  if (level === 1) return `rgba(${member.heatColorRgb}, ${isLightTheme() ? '0.32' : '0.22'})`;
  if (level === 2) return `rgba(${member.heatColorRgb}, 0.5)`;
  if (level === 3) return `rgba(${member.heatColorRgb}, 0.78)`;
  return `rgba(${member.heatColorRgb}, 1)`;
}

function getHeatmapBorderColor(member, level) {
  if (level === 0) return `rgba(${member.heatColorRgb}, ${isLightTheme() ? '0.38' : '0.16'})`;
  if (level === 1) return `rgba(${member.heatColorRgb}, ${isLightTheme() ? '0.58' : '0.34'})`;
  return 'transparent';
}

function getBadgeStyle(member) {
  const uiColor = getMemberUiColor(member);
  const background = isLightTheme()
    ? `rgba(${member.heatColorRgb}, 0.16)`
    : `rgba(${member.heatColorRgb}, 0.08)`;

  return `border-color:${uiColor};color:${uiColor};background:${background}`;
}

function renderRankingRows(ranking) {
  return ranking.map((member, index) => {
    const rankClass = `rank-${Math.min(index + 1, 3)}`;

    return `
      <div class="score-row">
        <span class="rank-num ${rankClass}">${String(index + 1).padStart(2, '0')}</span>
        <span class="score-name">${escapeHtml(member.name)} <span class="badge ${member.badgeClass}">${escapeHtml(member.badge)}</span></span>
        <span class="score-pts ${member.accentClass}">${member.weekScore}</span>
        <span class="score-streak">${member.currentStreak} 天连击</span>
      </div>
    `;
  }).join('');
}

function renderPoolRows(poolEvents) {
  if (!poolEvents.length) {
    return renderEmptyRow(4, '暂无记录');
  }

  return poolEvents.slice(0, 12).map((event, index) => `
    <div class="score-row">
      <span style="font-family:var(--c-mono);color:var(--c-muted)">${String(index + 1).padStart(2, '0')}</span>
      <span class="score-name">${escapeHtml(event.label)}</span>
      <span class="score-pts">${formatMoney(event.amount)}</span>
      <span class="score-streak">${escapeHtml(event.date)}</span>
    </div>
  `).join('');
}

function renderHistoryCards(members) {
  return members.map(member => `
    <section class="history-card">
      <div class="history-head">
        <div>
          <div class="title-name">${escapeHtml(member.name)}</div>
          <div class="title-sub">共 ${member.totalCheckins} 次打卡 · 最近 ${escapeHtml(formatMetaDate(member.lastDate))}</div>
        </div>
        <div class="title-badge" style="${getBadgeStyle(member)}">${member.currentStreak} 天连续</div>
      </div>
      <div class="history-list">
        ${member.history.length ? member.history.map(item => `
          <article class="history-item">
            <div class="history-item-top">
              <div>
                <div class="history-date">${escapeHtml(item.date)}</div>
                <div class="history-type">${escapeHtml(item.type)}</div>
              </div>
              <div class="history-item-actions">
                <button class="history-inline-btn" type="button" onclick="startHistoryEdit('${escapeHtml(item.id)}')">编辑</button>
                <button class="history-inline-btn danger" type="button" onclick="deleteHistoryRecord('${escapeHtml(item.id)}')">删除</button>
              </div>
            </div>
            ${item.details ? `<div class="history-meta">${escapeHtml(item.details)}</div>` : ''}
            ${item.note ? `<div class="history-note">${escapeHtml(item.note)}</div>` : ''}
          </article>
        `).join('') : '<div class="history-empty">还没有历史记录</div>'}
      </div>
    </section>
  `).join('');
}

function renderLeaderboardTitles(ranking) {
  const container = document.getElementById('leaderboard-title-list');
  if (!container) return;

  container.innerHTML = ranking.map(member => `
    <div class="title-row">
      <div>
        <div class="title-name">${escapeHtml(member.name)}</div>
        <div class="title-sub">当前积分 ${member.weekScore} · 当前连续 ${member.currentStreak} 天 · 最长连续 ${member.longestStreak} 天</div>
      </div>
      <div style="text-align:right">
        <div class="title-badge" style="${getBadgeStyle(member)}">${escapeHtml(member.badge)}</div>
      </div>
    </div>
  `).join('');
}

function renderDashboard(viewModel) {
  const leader = viewModel.ranking[0];

  viewModel.members.forEach(member => {
    const bar = document.getElementById(member.barId);
    const status = document.getElementById(member.statusId);

    if (bar) {
      bar.style.width = `${member.weekRate || 0}%`;
      bar.style.background = member.chartColor;
    }

    if (status) {
      const done = Boolean(member.todayDone);
      status.textContent = done ? 'DONE' : `W${member.weekRate || 0}%`;
      status.style.color = done ? getMemberUiColor(member) : getCssVar('--c-muted');
      status.classList.toggle('done', done);
      status.classList.toggle('miss', !done);
    }
  });

  setText('dashboard-week-leader', leader ? leader.name : '--');
  setText('dashboard-week-leader-meta', leader ? `${leader.weekScore} pts · ${leader.badge}` : '0 pts');
  setText('dashboard-pool-balance', formatMoney(viewModel.totals.poolBalance));
  setText('dashboard-pool-meta', `${viewModel.poolEvents.length} 次未打卡累计`);
  setText('dashboard-week-rate', `${viewModel.totals.weekCompletionRate}%`);
  setText('dashboard-week-rate-meta', `${viewModel.todayKey} 更新`);
  setText('dashboard-longest-streak', `${viewModel.totals.longestStreak}天`);
  setText('dashboard-longest-streak-meta', leader ? `${leader.name} 当前领跑` : '待开始');

  const rankingTable = document.getElementById('dashboard-ranking-table');
  if (!rankingTable) return;

  rankingTable.innerHTML = `
    <div class="score-row header">
      <span style="font-family:var(--c-mono);font-size:10px;color:var(--c-muted)">#</span>
      <span style="font-family:var(--c-mono);font-size:10px;color:var(--c-muted)">成员</span>
      <span style="font-family:var(--c-mono);font-size:10px;color:var(--c-muted);text-align:right">积分</span>
      <span style="font-family:var(--c-mono);font-size:10px;color:var(--c-muted);text-align:right">状态</span>
    </div>
    ${viewModel.ranking.length ? renderRankingRows(viewModel.ranking) : renderEmptyRow(4, '还没有打卡数据')}
  `;
}

function renderLeaderboard(viewModel) {
  renderLeaderboardTitles(viewModel.ranking);

  const poolTable = document.getElementById('leaderboard-pool-table');
  if (!poolTable) return;

  poolTable.innerHTML = `
    <div class="score-row header">
      <span style="font-family:var(--c-mono);font-size:10px;color:var(--c-muted)">#</span>
      <span style="font-family:var(--c-mono);font-size:10px;color:var(--c-muted)">事件</span>
      <span style="font-family:var(--c-mono);font-size:10px;color:var(--c-muted);text-align:right">金额</span>
      <span style="font-family:var(--c-mono);font-size:10px;color:var(--c-muted);text-align:right">日期</span>
    </div>
    ${renderPoolRows(viewModel.poolEvents)}
  `;
}

function renderHeatmaps(members) {
  members.forEach(member => {
    const grid = document.getElementById(member.heatmapId);
    if (!grid) return;

    grid.innerHTML = member.heatmap.map(cell => `
      <div
        class="heatmap-cell${cell.level ? ` d${cell.level}` : ''}"
        style="background:${getHeatmapColor(member, cell.level)};border-color:${getHeatmapBorderColor(member, cell.level)};"
        title="${escapeHtml(`${member.name} ${cell.date} · ${cell.count} 次`)}"
      ></div>
    `).join('');
  });
}

function renderAnalytics(viewModel) {
  renderHeatmaps(viewModel.members);
  buildChart(viewModel);

  setText('analytics-month-rate', `${viewModel.totals.monthCompletionRate}%`);
  setText('analytics-pool-balance', formatMoney(viewModel.totals.poolBalance));
  setText('analytics-total-checkins', String(viewModel.totals.totalCheckins));
  setText('analytics-all-done-days', `${viewModel.totals.allDoneDays}天`);
}

function renderHistory(viewModel) {
  const grid = document.getElementById('history-grid');
  if (!grid) return;
  grid.innerHTML = renderHistoryCards(viewModel.members);
}

export function renderApp(viewModel) {
  latestViewModel = viewModel;
  renderDashboard(viewModel);
  renderLeaderboard(viewModel);
  renderAnalytics(viewModel);
  renderHistory(viewModel);
}

export function showPage(id, btn) {
  document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
  document.getElementById(`page-${id}`)?.classList.add('active');
  if (btn) btn.classList.add('active');
}

export function showToast(message, duration = 2500) {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

export function setSubmitLoading(isLoading) {
  const btn = document.getElementById('submit-btn');
  if (!btn) return;

  btn.disabled = isLoading;
  btn.style.opacity = isLoading ? '0.7' : '1';
  btn.textContent = isLoading ? '[ 提交中... ]' : '[ 提交打卡 ]';
}

export function toggleHistoryEditor(isVisible) {
  const editor = document.getElementById('history-editor');
  if (!editor) return;
  editor.classList.toggle('hidden', !isVisible);
}

export function fillHistoryEditor(record) {
  setText('history-editor-subtitle', `${record.user} · ${record.date} · ${record.type}`);
  document.getElementById('history-user-select').value = record.user;
  document.getElementById('history-date-input').value = record.date;
  document.getElementById('history-type-select').value = record.type;
  document.getElementById('history-duration-input').value = record.duration ?? '';
  document.getElementById('history-steps-input').value = record.steps ?? '';
  document.getElementById('history-weight-input').value = record.weight ?? '';
  document.getElementById('history-note-input').value = record.note ?? '';
  toggleHistoryEditor(true);
}

export function resetHistoryEditor() {
  setText('history-editor-subtitle', '修改后会立即同步到首页、热力图和趋势图');
  document.getElementById('history-user-select').value = '漾';
  document.getElementById('history-date-input').value = '';
  document.getElementById('history-type-select').value = '健身房';
  document.getElementById('history-duration-input').value = '';
  document.getElementById('history-steps-input').value = '';
  document.getElementById('history-weight-input').value = '';
  document.getElementById('history-note-input').value = '';
  toggleHistoryEditor(false);
}

export function buildChart(viewModel = latestViewModel) {
  latestViewModel = viewModel || latestViewModel;

  const canvas = document.getElementById('trendChart');
  if (!canvas || !latestViewModel) return;

  const current = getTrendChartInstance();
  if (current) {
    current.destroy();
  }

  const textColor = getCssVar('--c-muted');
  const gridColor = getCssVar('--c-border');

  const datasets = latestViewModel.members.map(member => ({
    label: member.name,
    data: member.trend.map(item => item.value),
    borderColor: member.chartColor,
    backgroundColor: 'transparent',
    tension: 0.28,
    pointBackgroundColor: member.chartColor,
    pointBorderColor: member.chartColor,
    pointRadius: 4,
    pointHoverRadius: 5,
    borderWidth: 2.5
  }));

  const nextChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: latestViewModel.trendLabels,
      datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: textColor,
            font: { family: 'Space Mono', size: 10 },
            usePointStyle: true,
            pointStyle: 'circle'
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
            callback: value => `${value}%`
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

export function renderLoadError(message) {
  setText('dashboard-week-leader', '读取失败');
  setText('dashboard-week-leader-meta', message);
  setText('dashboard-pool-meta', '请检查 data/checkins.json');
  setText('dashboard-week-rate-meta', '未能完成初始化');
  setText('dashboard-longest-streak-meta', '加载异常');
}
