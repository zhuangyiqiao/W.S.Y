import { getCssVar } from './utils.js';
import { formatMetaDate, formatMoney, getMemberById } from './data.js';
import { getTrendChartInstance, setTrendChartInstance } from './state.js';
import { MEMBERS } from './config.js';

let latestViewModel = null;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
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

function renderRankingRows(memberStats) {
  return memberStats.map((member, index) => {
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

function renderHistoryCards(memberStats) {
  return memberStats.map(member => `
    <section class="history-card">
      <div class="history-head">
        <div>
          <div class="title-name">${escapeHtml(member.name)}</div>
          <div class="title-sub">共 ${member.totalCheckins} 次打卡 · 最近 ${escapeHtml(formatMetaDate(member.lastDate))}</div>
        </div>
        <div class="title-badge">${member.currentStreak} 天连续</div>
      </div>
      <div class="history-list">
        ${member.history.length ? member.history.map(item => `
          <article class="history-item">
            <div class="history-date">${escapeHtml(item.date)}</div>
            <div class="history-type">${escapeHtml(item.type)}</div>
            ${item.details ? `<div class="history-meta">${escapeHtml(item.details)}</div>` : ''}
            ${item.note ? `<div class="history-note">${escapeHtml(item.note)}</div>` : ''}
          </article>
        `).join('') : '<div class="history-empty">还没有历史记录</div>'}
      </div>
    </section>
  `).join('');
}

function renderLeaderboardTitles(memberStats) {
  const container = document.getElementById('leaderboard-title-list');
  if (!container) return;

  container.innerHTML = memberStats.map(member => `
    <div class="title-row">
      <div>
        <div class="title-name">${escapeHtml(member.name)}</div>
        <div class="title-sub">当前积分 ${member.weekScore} · 当前连续 ${member.currentStreak} 天 · 最长连续 ${member.longestStreak} 天</div>
      </div>
      <div style="text-align:right">
        <div class="title-badge">${escapeHtml(member.badge)}</div>
      </div>
    </div>
  `).join('');
}

function renderDashboard(viewModel) {
  const { memberStats, totals } = viewModel;
  const leader = memberStats[0];

  MEMBERS.forEach(memberConfig => {
    const member = getMemberById(memberStats, memberConfig.id);
    const bar = document.getElementById(memberConfig.barId);
    const status = document.getElementById(memberConfig.statusId);

    if (bar) {
      bar.style.width = `${member?.weekRate || 0}%`;
    }

    if (status) {
      const done = Boolean(member?.todayDone);
      status.textContent = done ? 'DONE' : `W${member?.weekRate || 0}%`;
      status.classList.toggle('done', done);
      status.classList.toggle('miss', !done);
    }
  });

  setText('dashboard-week-leader', leader ? leader.name : '--');
  setText('dashboard-week-leader-meta', leader ? `${leader.weekScore} pts · ${leader.badge}` : '0 pts');
  setText('dashboard-pool-balance', formatMoney(totals.poolBalance));
  setText('dashboard-pool-meta', `${viewModel.poolEvents.length} 次未打卡累计`);
  setText('dashboard-week-rate', `${totals.weekCompletionRate}%`);
  setText('dashboard-week-rate-meta', `${viewModel.todayKey} 更新`);
  setText('dashboard-longest-streak', `${totals.longestStreak}天`);
  setText('dashboard-longest-streak-meta', leader ? `${leader.name} 当前领跑` : '待开始');

  const rankingTable = document.getElementById('dashboard-ranking-table');
  if (rankingTable) {
    rankingTable.innerHTML = `
      <div class="score-row header">
        <span style="font-family:var(--c-mono);font-size:10px;color:var(--c-muted)">#</span>
        <span style="font-family:var(--c-mono);font-size:10px;color:var(--c-muted)">成员</span>
        <span style="font-family:var(--c-mono);font-size:10px;color:var(--c-muted);text-align:right">积分</span>
        <span style="font-family:var(--c-mono);font-size:10px;color:var(--c-muted);text-align:right">状态</span>
      </div>
      ${memberStats.length ? renderRankingRows(memberStats) : renderEmptyRow(4, '还没有打卡数据')}
    `;
  }
}

function renderLeaderboard(viewModel) {
  renderLeaderboardTitles(viewModel.memberStats);

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

function renderHeatmaps(memberStats) {
  memberStats.forEach(member => {
    const grid = document.getElementById(member.heatmapId);
    if (!grid) return;

    grid.innerHTML = member.heatmap.map(cell => `
      <div
        class="heatmap-cell${cell.level ? ` d${cell.level}` : ''}"
        title="${escapeHtml(`${member.name} ${cell.date} · ${cell.count} 次`)}"
      ></div>
    `).join('');
  });
}

function renderAnalytics(viewModel) {
  renderHeatmaps(viewModel.memberStats);
  buildChart(viewModel);

  setText('analytics-month-rate', `${viewModel.totals.monthCompletionRate}%`);
  setText('analytics-pool-balance', formatMoney(viewModel.totals.poolBalance));
  setText('analytics-total-checkins', String(viewModel.totals.totalCheckins));
  setText('analytics-all-done-days', `${viewModel.totals.allDoneDays}天`);
}

function renderHistory(viewModel) {
  const grid = document.getElementById('history-grid');
  if (!grid) return;
  grid.innerHTML = renderHistoryCards(viewModel.memberStats);
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
  const lineColors = [
    getCssVar('--c-accent'),
    getCssVar('--c-accent2'),
    getCssVar('--c-danger')
  ];

  const datasets = latestViewModel.memberStats.map((member, index) => ({
    label: member.name,
    data: member.trend.map(item => item.value),
    borderColor: lineColors[index] || lineColors[lineColors.length - 1],
    backgroundColor: 'transparent',
    tension: 0.28,
    pointBackgroundColor: lineColors[index] || lineColors[lineColors.length - 1],
    pointRadius: 4,
    borderDash: index === 1 ? [4, 3] : index === 2 ? [2, 4] : []
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
