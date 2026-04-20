export const API_BASE_URL = 'https://wsyy.cynthiazyq24.workers.dev';
export const MAX_EVIDENCE_FILE_SIZE = 2 * 1024 * 1024;
export const CHECKINS_DATA_URL = './data/checkins.json';
export const PENALTY_PER_MISS = 5;
export const HEATMAP_DAYS = 30;

export const MEMBERS = [
  {
    id: 'yang',
    name: '\u6f3e',
    barId: 'bar-yang',
    statusId: 'status-yang',
    heatmapId: 'heat-yang',
    accentClass: 'accent',
    badgeClass: 'badge-gold',
    chartColor: '#ff9ecb',
    heatColorRgb: '255, 158, 203',
    lightTextColor: '#c9578b'
  },
  {
    id: 'shan',
    name: '\u95ea',
    barId: 'bar-shan',
    statusId: 'status-shan',
    heatmapId: 'heat-shan',
    accentClass: 'accent2',
    badgeClass: 'badge-silver',
    chartColor: '#b7f5c5',
    heatColorRgb: '183, 245, 197',
    lightTextColor: '#3e9361'
  },
  {
    id: 'yuan',
    name: '\u6e90',
    barId: 'bar-yuan',
    statusId: 'status-yuan',
    heatmapId: 'heat-yuan',
    accentClass: 'warn',
    badgeClass: 'badge-bronze',
    chartColor: '#a7d8ff',
    heatColorRgb: '167, 216, 255',
    lightTextColor: '#4b8fcb'
  }
];

export const CHECKIN_TYPES = [
  '\u5065\u8eab\u623f',
  '\u5c45\u5bb6\u8fd0\u52a8',
  '\u996e\u98df\u7a33\u5b9a',
  '\u8865\u5361',
  '\u7ecf\u671f\u65e0\u66b4\u98df'
];
