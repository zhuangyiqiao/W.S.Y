import { CHECKINS_DATA_URL, HEATMAP_DAYS, MEMBERS, PENALTY_PER_MISS } from './config.js';
import { fetchCheckinsRequest } from './api.js';

const DAY_MS = 24 * 60 * 60 * 1000;

let currentRecords = [];

function parseDateString(value) {
  const [year, month, day] = String(value).split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatShortDate(value) {
  return value ? value.slice(5) : '--';
}

function startOfWeek(date) {
  const next = new Date(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfWeek(date) {
  const next = startOfWeek(date);
  next.setDate(next.getDate() + 6);
  return next;
}

function daysBetween(start, end) {
  return Math.floor((parseDateString(formatDate(end)) - parseDateString(formatDate(start))) / DAY_MS);
}

function enumerateDates(start, end) {
  const result = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    result.push(formatDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function dedupeDates(records) {
  return [...new Set(records.map(record => record.date))].sort();
}

function countDatesInRange(dates, start, end) {
  return dates.filter(date => date >= start && date <= end).length;
}

function computeCurrentStreak(dates) {
  if (!dates.length) return 0;

  let streak = 1;
  for (let index = dates.length - 1; index > 0; index -= 1) {
    const current = parseDateString(dates[index]);
    const previous = parseDateString(dates[index - 1]);
    if (daysBetween(previous, current) === 1) {
      streak += 1;
      continue;
    }
    break;
  }

  return streak;
}

function computeLongestStreak(dates) {
  if (!dates.length) return 0;

  let longest = 1;
  let current = 1;

  for (let index = 1; index < dates.length; index += 1) {
    const previous = parseDateString(dates[index - 1]);
    const next = parseDateString(dates[index]);
    if (daysBetween(previous, next) === 1) {
      current += 1;
      longest = Math.max(longest, current);
      continue;
    }
    current = 1;
  }

  return longest;
}

function buildWeeklyTrend(memberDays, today) {
  const currentWeekStart = startOfWeek(today);

  return Array.from({ length: 6 }, (_, offset) => {
    const weekStart = new Date(currentWeekStart);
    weekStart.setDate(weekStart.getDate() - (5 - offset) * 7);
    const weekEnd = endOfWeek(weekStart);
    const start = formatDate(weekStart);
    const end = formatDate(weekEnd);
    const isCurrentWeek = offset === 5;
    const denominator = isCurrentWeek ? Math.max(daysBetween(weekStart, today) + 1, 1) : 7;
    const completedDays = countDatesInRange(memberDays, start, end);

    return {
      label: `${String(weekStart.getMonth() + 1).padStart(2, '0')}/${String(weekStart.getDate()).padStart(2, '0')}`,
      value: Math.round((completedDays / denominator) * 100)
    };
  });
}

function buildHeatmap(recordsByDate, today) {
  const cells = [];

  for (let index = HEATMAP_DAYS - 1; index >= 0; index -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - index);
    const key = formatDate(date);
    const count = recordsByDate.get(key) || 0;

    cells.push({
      date: key,
      count,
      level: clamp(count, 0, 4)
    });
  }

  return cells;
}

function buildPoolEvents(dateRange, completionByDate) {
  const events = [];

  for (const date of dateRange) {
    const completedMembers = completionByDate.get(date) || new Set();
    for (const member of MEMBERS) {
      if (!completedMembers.has(member.name)) {
        events.push({
          date,
          amount: PENALTY_PER_MISS,
          label: `${member.name} 未打卡`
        });
      }
    }
  }

  return events.sort((left, right) => right.date.localeCompare(left.date));
}

function getRankingBadge(rank, stats) {
  if (!stats.totalCheckins) return '待开始';
  if (rank === 0) return '本周领先';
  if (stats.todayDone) return '今日完成';
  return '追赶中';
}

function buildHistoryItem(record) {
  const details = [];

  if (typeof record.duration === 'number') details.push(`${record.duration} 分钟`);
  if (typeof record.steps === 'number') details.push(`${record.steps} 步`);
  if (typeof record.weight === 'number') details.push(`${record.weight} kg`);

  return {
    id: record.id,
    user: record.user,
    date: record.date,
    type: record.type,
    duration: record.duration,
    steps: record.steps,
    weight: record.weight,
    note: record.note || '',
    details: details.join(' · ')
  };
}

function toNumberOrNull(value) {
  if (value === '' || value === null || value === undefined) return null;
  const next = Number(value);
  return Number.isNaN(next) ? null : next;
}

function createBaseId(record, fallbackIndex) {
  const createdAt = record.created_at ? String(record.created_at).replace(/[^\w-]/g, '-') : '';
  if (createdAt) return `record-${createdAt}`;

  const parts = [record.user, record.date, record.type, fallbackIndex]
    .map(value => String(value || '').replace(/[^\w\u4e00-\u9fff-]/g, '-'));

  return `legacy-${parts.join('-')}`;
}

function normalizeRecords(rawRecords) {
  const seenIds = new Map();

  return rawRecords
    .filter(item => item && item.user && item.date)
    .map((item, index) => {
      const normalized = {
        ...item,
        date: String(item.date),
        user: String(item.user),
        type: String(item.type || ''),
        note: item.note ? String(item.note) : '',
        duration: toNumberOrNull(item.duration),
        steps: toNumberOrNull(item.steps),
        weight: toNumberOrNull(item.weight),
        evidence: item.evidence ?? '',
        created_at: item.created_at ? String(item.created_at) : ''
      };

      const baseId = normalized.id ? String(normalized.id) : createBaseId(normalized, index);
      const duplicateCount = (seenIds.get(baseId) || 0) + 1;
      seenIds.set(baseId, duplicateCount);

      return {
        ...normalized,
        id: duplicateCount === 1 ? baseId : `${baseId}-${duplicateCount}`
      };
    })
    .sort((left, right) => {
      return (
        left.date.localeCompare(right.date) ||
        left.created_at.localeCompare(right.created_at) ||
        left.user.localeCompare(right.user, 'zh-CN')
      );
    });
}

async function loadRawCheckins() {
  try {
    const apiData = await fetchCheckinsRequest();
    if (Array.isArray(apiData)) return apiData;
    if (Array.isArray(apiData?.records)) return apiData.records;
    if (Array.isArray(apiData?.data)) return apiData.data;
    throw new Error('后端返回的数据格式不正确');
  } catch (apiError) {
    console.warn('Worker /checkins 不可用，回退到本地 data/checkins.json', apiError);

    const response = await fetch(CHECKINS_DATA_URL, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`读取打卡数据失败 (${response.status})`);
    }

    return response.json();
  }
}

function sortRecordsForMember(records) {
  return [...records].sort((left, right) => {
    return (
      right.date.localeCompare(left.date) ||
      right.created_at.localeCompare(left.created_at) ||
      right.id.localeCompare(left.id)
    );
  });
}

function buildViewModel(records) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayKey = formatDate(today);
  const weekStart = startOfWeek(today);
  const weekStartKey = formatDate(weekStart);
  const weekEndKey = formatDate(endOfWeek(today));
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthStartKey = formatDate(monthStart);
  const earliestDate = records.length ? parseDateString(records[0].date) : today;
  const dateRange = enumerateDates(earliestDate, today);

  const recordsByMember = new Map(MEMBERS.map(member => [member.name, []]));
  const completionByDate = new Map();

  records.forEach(record => {
    if (!recordsByMember.has(record.user)) return;

    recordsByMember.get(record.user).push(record);

    if (!completionByDate.has(record.date)) {
      completionByDate.set(record.date, new Set());
    }

    completionByDate.get(record.date).add(record.user);
  });

  const members = MEMBERS.map(member => {
    const memberRecords = sortRecordsForMember(recordsByMember.get(member.name) || []);
    const memberDays = dedupeDates(memberRecords);
    const recordsByDate = new Map();

    memberRecords.forEach(record => {
      recordsByDate.set(record.date, (recordsByDate.get(record.date) || 0) + 1);
    });

    const weekCompletedDays = countDatesInRange(memberDays, weekStartKey, weekEndKey);
    const elapsedWeekDays = Math.max(daysBetween(weekStart, today) + 1, 1);
    const elapsedMonthDays = Math.max(today.getDate(), 1);
    const monthCompletedDays = countDatesInRange(memberDays, monthStartKey, todayKey);

    return {
      ...member,
      records: memberRecords,
      history: memberRecords.map(buildHistoryItem),
      totalCheckins: memberRecords.length,
      totalDays: memberDays.length,
      todayDone: memberDays.includes(todayKey),
      lastDate: memberDays[memberDays.length - 1] || '',
      weekScore: memberRecords.filter(record => record.date >= weekStartKey && record.date <= weekEndKey).length,
      weekCompletedDays,
      weekRate: Math.round((weekCompletedDays / elapsedWeekDays) * 100),
      monthRate: Math.round((monthCompletedDays / elapsedMonthDays) * 100),
      currentStreak: computeCurrentStreak(memberDays),
      longestStreak: computeLongestStreak(memberDays),
      heatmap: buildHeatmap(recordsByDate, today),
      trend: buildWeeklyTrend(memberDays, today)
    };
  });

  const ranking = [...members]
    .sort((left, right) => (
      right.weekScore - left.weekScore ||
      right.currentStreak - left.currentStreak ||
      right.totalCheckins - left.totalCheckins ||
      left.name.localeCompare(right.name, 'zh-CN')
    ))
    .map((stats, index) => ({
      ...stats,
      rank: index + 1,
      badge: getRankingBadge(index, stats)
    }));

  const badgeByName = new Map(ranking.map(item => [item.name, item.badge]));
  const rankByName = new Map(ranking.map(item => [item.name, item.rank]));

  const membersWithRanking = members.map(member => ({
    ...member,
    rank: rankByName.get(member.name) || members.length,
    badge: badgeByName.get(member.name) || '待开始'
  }));

  const poolEvents = buildPoolEvents(dateRange, completionByDate);
  const allDoneDays = dateRange.filter(date => (completionByDate.get(date) || new Set()).size === MEMBERS.length).length;

  return {
    todayKey,
    totals: {
      totalCheckins: records.length,
      poolBalance: poolEvents.reduce((sum, event) => sum + event.amount, 0),
      weekCompletionRate: Math.round(membersWithRanking.reduce((sum, member) => sum + member.weekRate, 0) / MEMBERS.length),
      monthCompletionRate: Math.round(membersWithRanking.reduce((sum, member) => sum + member.monthRate, 0) / MEMBERS.length),
      longestStreak: Math.max(0, ...membersWithRanking.map(member => member.longestStreak)),
      allDoneDays
    },
    members: membersWithRanking,
    ranking,
    poolEvents,
    trendLabels: membersWithRanking[0]?.trend.map(item => item.label) || [],
    updatedAt: records[records.length - 1]?.created_at || '',
    hasData: records.length > 0
  };
}

export async function loadCheckinsData() {
  const raw = await loadRawCheckins();
  const normalizedRecords = normalizeRecords(Array.isArray(raw) ? raw : []);
  currentRecords = normalizedRecords;
  return buildViewModel(normalizedRecords);
}

export function getCheckinById(recordId) {
  return currentRecords.find(record => record.id === recordId) || null;
}

export function formatMoney(value) {
  return `¥ ${value}`;
}

export function formatMetaDate(value) {
  return formatShortDate(value);
}
