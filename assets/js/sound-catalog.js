// Audited recordings. Full provenance and hashes: assets/audio/manifest.json.
const cc0='https://creativecommons.org/publicdomain/zero/1.0/';
export const SOUND_SOURCES={
  coffee:{title:'coffee cooking',author:'christoph',url:'https://opengameart.org/content/coffee-cooking',license:'CC-BY-3.0',licenseUrl:'https://creativecommons.org/licenses/by/3.0/',changes:'选用 CC BY 3.0；转码 MP3、响度调整。'},
  cup:{title:'cutlery sounds — cup_on_table_01',author:'TinyWorlds',url:'https://opengameart.org/content/cutlery-sounds',license:'CC0-1.0',licenseUrl:cc0,changes:'转码 MP3、响度调整；间歇播放。'},
  rain:{title:'Rainy (NOT loopable)',author:'OveMelaa / Ove Melaa',url:'https://opengameart.org/content/rain-ambient-not-loopable-2-versions-available',license:'CC0-1.0',licenseUrl:cc0,changes:'截取中段 60 秒、转码 MP3、响度调整；播放时交叠淡化。'},
  waves:{title:'Beach Ocean Waves — wave_01',author:'jasinski（qubodup 整理）',url:'https://opengameart.org/content/beach-ocean-waves',license:'CC0-1.0',licenseUrl:cc0,changes:'转码 MP3、响度调整；播放时交叠淡化。'},
  fire:{title:'Fire Crackling',author:'AntumDeluge',url:'https://opengameart.org/content/fire-crackling',license:'CC0-1.0',licenseUrl:cc0,changes:'转码 MP3、响度调整；播放时交叠淡化。'},
  crickets:{title:'Crickets Ambient Noise — loopable',author:'Wolfgang_ / Ted Kerr',url:'https://opengameart.org/content/crickets-ambient-noise-loopable',license:'CC0-1.0',licenseUrl:cc0,changes:'转码 MP3、响度调整；播放时交叠淡化。'}
};
const recording=(id,name,english,source,volume,event=false)=>({id,name,english,source,volume,event,src:new URL(`../audio/${source}.mp3`,import.meta.url).href});
export const SOUND_TRACKS=[
  recording('machine','咖啡冲煮','Coffee brewing','coffee',32),
  recording('cups','杯子放桌','Cup on a table','cup',18,true),
  recording('rain','细雨','Rain','rain',40),
  recording('waves','海浪拍岸','Ocean waves','waves',40),
  recording('fire','炉火噼啪','Fire crackling','fire',32),
  recording('crickets','夜间虫鸣','Night crickets','crickets',18)
];
export const SOUND_IDS=SOUND_TRACKS.map(t=>t.id);
export const SCENE_SOUND_PLANS={
  cafe:{label:'窗边沙发咖啡馆',tracks:['machine','cups','rain'],primary:['machine','rain'],note:'咖啡慢慢冲煮，杯子偶尔落在桌上，窗外下着细雨。'},
  'rainy-room':{label:'雨夜工作台',tracks:['rain'],primary:['rain'],note:'让连续雨声陪伴安静的阅读与工作。'},
  'sunny-beach':{label:'晴天海边',tracks:['waves'],primary:['waves'],note:'一阵阵海浪拍岸，留一点空白给海边。'},
  campfire:{label:'篝火旁',tracks:['fire','crickets'],primary:['fire','crickets'],note:'木柴噼啪与夜间虫鸣，组成安静的营地。'}
};
