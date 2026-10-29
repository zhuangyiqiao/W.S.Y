import { dayKey, createTimer, secondsLeft, toggleTimer, settleTimer, completeFocus, MUSIC_PROVIDERS, parseMusicLink, MODES } from './domain.js';
import { loadData, saveData, STORAGE_KEY } from './storage.js';
import { SoundMixer, SOUND_TRACKS } from './audio.js';
import { SCENES, CATS, sceneSvg } from './scenes.js';
import { SCENE_SOUND_PLANS, SOUND_SOURCES } from './sound-catalog.js';


const $ = id => document.getElementById(id);
const data = loadData();
const mixer = new SoundMixer();
let activePanel = null, panelTrigger = null, toastTimeout, today = dayKey();
let user = null, apiReady = false;
let lastInteraction=Date.now(), settingsTimeout;
let room = null, socket = null, reconnectTimer = null, roomGeneration = 0;
const soundStates = new Map();

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const persist = () => { if (!user && !saveData(data)) toast('浏览器存储已满或不可用，本次修改仅在当前页面保留。'); };
function toast(message) { $('toast').textContent = message; $('toast').hidden = false; clearTimeout(toastTimeout); toastTimeout = setTimeout(() => $('toast').hidden = true, 5000); }
function closePanel(restoreFocus = true) {
  if (!activePanel) return;
  $(`panel-${activePanel}`).hidden = true;
  panelTrigger?.setAttribute('aria-expanded', 'false'); activePanel = null;
  if (restoreFocus) panelTrigger?.focus();
}
function openPanel(name, trigger = document.querySelector(`[data-panel="${name}"]`)) {
  if (activePanel === name) { closePanel(); return; }
  closePanel(false); activePanel = name; panelTrigger = trigger;
  $(`panel-${name}`).hidden = false; trigger?.setAttribute('aria-expanded','true');
  if (name === 'account') renderAccount();
  $(`panel-${name}`).focus({ preventScroll: true });
}
document.querySelectorAll('[data-panel]').forEach(b => b.addEventListener('click', () => openPanel(b.dataset.panel, b)));
document.querySelectorAll('.close-panel').forEach(b => b.addEventListener('click', () => closePanel()));
document.addEventListener('pointerdown', event => { if (activePanel && !event.target.closest('.popover') && !event.target.closest('[data-panel]')) closePanel(false); });
document.addEventListener('keydown', event => { if (event.key === 'Escape') closePanel(); });

function currentScene() { return SCENES.find(s => s.id === data.settings.scene) || SCENES[0]; }
function renderScene() {
  const scene = currentScene(), cat = CATS.find(c=>c.id===data.settings.cat) || CATS[0];
  data.settings.scene = scene.id; data.settings.cat = cat.id;
  $('scene-art').innerHTML = sceneSvg(scene.id, cat.id);
  $('scene-name').textContent = scene.name; $('cat-caption').textContent = `${cat.name}在陪你`;
  document.body.classList.toggle('no-animation', !data.settings.animation);
  document.body.classList.toggle('night', !!data.settings.night);
  $('meow-enabled').checked = !!data.settings.meow; $('animation-enabled').checked = !!data.settings.animation; $('night-enabled').checked = !!data.settings.night;
  $('scene-picker').innerHTML = SCENES.map(s=>`<button data-scene="${s.id}" aria-pressed="${s.id===scene.id}">${s.name}</button>`).join('');
  $('cat-picker').innerHTML = CATS.map(c=>`<button data-cat="${c.id}" aria-pressed="${c.id===cat.id}">${c.name}</button>`).join('');
}
function soundConfig() { return data.settings.sounds[currentScene().id] || {}; }
function writeSounds() {
  if (!data.settings.saveSounds) return;
  data.settings.sounds[currentScene().id] = Object.fromEntries([...soundStates].map(([id,s]) => [id, { volume:s.volume, enabled:s.enabled }])); persist(); clearTimeout(settingsTimeout);settingsTimeout=setTimeout(syncSettings,700);
}
function renderSounds() {
  $('save-sounds').checked = !!data.settings.saveSounds;
  const plan=SCENE_SOUND_PLANS[currentScene().id];
  $('scene-sound-note').textContent=`${plan.note} 点击播放后加载本地录音，可独立混合。`;
  $('scene-source-plan').innerHTML=`<h3>${esc(plan.label)}的录音来源</h3><ul class="source-list">${[...new Set(plan.tracks.map(id=>SOUND_TRACKS.find(t=>t.id===id).source))].map(id=>{const source=SOUND_SOURCES[id];return `<li><a href="${source.url}" target="_blank" rel="noopener noreferrer">${esc(source.title)}</a><br>${esc(source.author)} · <a href="${source.licenseUrl}" target="_blank" rel="noopener noreferrer">${source.license}</a><br>${esc(source.changes)}</li>`;}).join('')}</ul>`;
  $('sound-list').innerHTML = currentScene().tracks.map(id => {
    const track = SOUND_TRACKS.find(t=>t.id===id), saved = soundConfig()[id];
    let state = soundStates.get(id);
    if (!state) { state = { volume: Number.isFinite(saved?.volume) ? Math.max(0, Math.min(100, saved.volume)) : track.volume, enabled:false, preferred:!!saved?.enabled, pending:false }; soundStates.set(id,state); }
    return `<div class="sound-row"><div class="sound-title"><label for="volume-${id}" title="${track.english}">${track.name}</label><button class="sound-play" data-sound="${id}" type="button" aria-label="${state.enabled?'暂停':'播放'}${track.name}" aria-pressed="${state.enabled}" ${state.pending?'disabled':''}>${state.enabled?'Ⅱ':'▶'}</button></div><div class="sound-controls"><span aria-hidden="true">◖))</span><input id="volume-${id}" type="range" min="0" max="100" value="${state.volume}" data-volume="${id}" aria-label="${track.name}音量"><output for="volume-${id}">${state.volume}</output></div></div>`;
  }).join('');
}
async function playSound(id) {
  const state = soundStates.get(id); if (!state || state.pending) return;
  if (state.enabled) { mixer.pause(id); state.enabled = false; writeSounds(); renderSounds(); return; }
  const scene = currentScene().id;
  state.pending = true; renderSounds();
  try {
    await mixer.play(id, state.volume);
    if (scene !== currentScene().id) { mixer.pause(id); return; }
    state.enabled = true; writeSounds();
  } catch (e) { toast(e.message || '声音加载失败，请重试'); }
  finally { state.pending = false; if (scene === currentScene().id) renderSounds(); }
}
$('sound-list').addEventListener('click', e => { const b=e.target.closest('[data-sound]'); if(b) playSound(b.dataset.sound); });
$('sound-list').addEventListener('input', e => { const id=e.target.dataset.volume; if(!id) return; const s=soundStates.get(id); s.volume=Number(e.target.value); mixer.volume(id,s.volume); e.target.nextElementSibling.value=s.volume; writeSounds(); });
$('mute-sounds').addEventListener('click', () => { mixer.mute(!mixer.muted); $('mute-sounds').textContent=mixer.muted?'取消静音':'静音'; $('mute-sounds').setAttribute('aria-pressed',String(mixer.muted)); });
$('save-sounds').addEventListener('change', e=>{ data.settings.saveSounds=e.target.checked; if(!e.target.checked) data.settings.sounds={}; persist(); if(e.target.checked) writeSounds(); });
async function changeScene(id, fromRoom = false) {
  if (!SCENES.some(s=>s.id===id) || id===currentScene().id) return;
  if (room && !fromRoom) { sendRoom({type:'scene',scene:id}); return; }
  const wasPlaying = [...soundStates.values()].some(s=>s.enabled);
  writeSounds(); for(const id of soundStates.keys()) mixer.pause(id);
  soundStates.clear(); data.settings.scene=id; persist(); renderScene(); renderSounds();if(!fromRoom)syncSettings();
  if (wasPlaying) {
    const preferred = [...soundStates].filter(([,s])=>s.preferred).map(([key])=>key);
    for(const key of preferred.length?preferred:SCENE_SOUND_PLANS[currentScene().id].primary) await playSound(key);
  }
}
$('scene-picker').addEventListener('click', e=>{ const b=e.target.closest('[data-scene]'); if(b) changeScene(b.dataset.scene); });
$('cat-picker').addEventListener('click', e=>{ const b=e.target.closest('[data-cat]'); if(b){data.settings.cat=b.dataset.cat;persist();renderScene();broadcastStatus();syncSettings();} });
for(const [id,key] of [['meow-enabled','meow'],['animation-enabled','animation'],['night-enabled','night']]) $(id).addEventListener('change', e=>{data.settings[key]=e.target.checked;persist();renderScene();syncSettings();});

function renderTasks() {
  const tasks=data.tasks.filter(t=>t.date===dayKey()), count=tasks.filter(t=>t.completed).length;
  $('task-count').textContent=`${count} / ${tasks.length}`; $('task-badge').hidden=!tasks.some(t=>!t.completed);
  $('task-list').innerHTML=tasks.length?tasks.map(t=>`<div class="task-row ${t.completed?'completed':''}"><label><input type="checkbox" data-check="${esc(t.id)}" ${t.completed?'checked':''}><span>${esc(t.title)}</span></label><button data-focus="${esc(t.id)}" class="${data.timer.taskId===t.id?'selected-task':''}" aria-label="专注于：${esc(t.title)}" title="设为专注任务">◷</button><button data-delete="${esc(t.id)}" aria-label="删除：${esc(t.title)}">×</button></div>`).join(''):'<p>桌面还是空的，写下一件想完成的小事吧。</p>';
  renderTimer();
}
$('task-form').addEventListener('submit',async e=>{
  e.preventDefault();const title=$('task-input').value.trim();if(!title)return;
  const task={id:crypto.randomUUID(),title:title.slice(0,120),completed:false,date:dayKey(),created_at:new Date().toISOString(),completed_at:null,pomodoro_count:0};
  if(user){try{await api('/tasks',{method:'POST',body:task});}catch(e){toast(e.message);return;}}
  data.tasks.push(task);persist();renderTasks();$('task-input').value='';$('task-input').focus();
});
$('task-list').addEventListener('change',async e=>{
  const id=e.target.dataset.check, task=data.tasks.find(t=>t.id===id);if(!task)return;
  const completed=e.target.checked;
  if(user){try{await api(`/tasks/${encodeURIComponent(id)}`,{method:'PATCH',body:{completed}});}catch(error){toast(error.message);renderTasks();return;}}
  task.completed=completed;task.completed_at=completed?new Date().toISOString():null;persist();renderTasks();
});
$('task-list').addEventListener('click',async e=>{
  const del=e.target.closest('[data-delete]'), focus=e.target.closest('[data-focus]');
  if(del){const id=del.dataset.delete;if(user){try{await api(`/tasks/${encodeURIComponent(id)}`,{method:'DELETE'});}catch(error){toast(error.message);return;}}data.tasks=data.tasks.filter(t=>t.id!==id);if(data.timer.taskId===id)data.timer.taskId=null;persist();renderTasks();}
  if(focus){data.timer.taskId=focus.dataset.focus;persist();renderTasks();openPanel('timer');}
});
function formatTime(seconds){return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;}
function renderTimer(){
  const t=data.timer, left=secondsLeft(t), labels={focus:'专注',short:'短休息',long:'长休息'};
  $('timer-display').textContent=formatTime(left);$('mini-timer').textContent=formatTime(left);$('mini-timer').hidden=t.state==='idle'||t.state==='completed';
  $('timer-state').textContent={idle:'准备好了就开始',running:`${labels[t.mode]}中，慢慢来。`,paused:'暂停一下，也没关系。',completed:t.mode==='focus'?'这一轮完成了，伸个懒腰吧。':'休息好了，准备下一件事。'}[t.state];
  $('timer-toggle').textContent=t.state==='running'?'暂停':t.state==='paused'?'继续':t.state==='completed'?(t.mode==='focus'?'开始休息':'开始专注'):`开始${labels[t.mode]}`;
  $('focus-task').textContent=data.tasks.find(task=>task.id===t.taskId)?.title||'只做一件事，也很好。';
  $('focus-stats').textContent=`今天完成 ${data.stats[dayKey()]?.pomodoros||0} 轮专注`;
  document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===t.mode)));
  if(document.activeElement!==$('timer-duration'))$('timer-duration').value=t.duration/60;
  document.title=t.state==='running'?`${formatTime(left)} · 雨声咖啡馆`:'雨声咖啡馆 · Rainy Cafe';
}
function finishTimer(){
  const old=data.timer;data.timer=settleTimer(old);
  if(old.state==='running'&&data.timer.state==='completed'){
    if(data.timer.mode==='focus'){
      const next=completeFocus(data,data.timer);Object.assign(data,next);persist();
      if(data.settings.animation){$('scene-art').classList.add('celebrating');setTimeout(()=>$('scene-art').classList.remove('celebrating'),2200);}
      if(data.settings.meow)mixer.meow().catch(()=>toast('本轮已完成；点击页面后可启用声音提醒。'));
      toast('这一轮完成了。猫猫提醒你起来走走。');$('footer-status').textContent='做得很好，休息一下吧。';
      if(user)api('/me/focus',{method:'POST',body:{id:data.timer.id,taskId:data.timer.taskId,date:dayKey()}}).catch(e=>toast(`本轮已保存在本机，云端统计未同步：${e.message}`));
    }else{persist();toast('休息结束，准备好再开始。');}
    broadcastStatus();
  }
}
$('timer-toggle').addEventListener('click',()=>{
  mixer.unlock().catch(()=>{});
  if(data.timer.state==='completed')data.timer={...createTimer(data.timer.mode==='focus'?'short':'focus'),taskId:data.timer.taskId};
  data.timer=toggleTimer(data.timer);persist();renderTimer();broadcastStatus();
});
$('timer-reset').addEventListener('click',()=>{data.timer={...createTimer(data.timer.mode,data.timer.duration/60),taskId:data.timer.taskId};persist();renderTimer();broadcastStatus();});
$('timer-modes').addEventListener('click',e=>{const b=e.target.closest('[data-mode]');if(!b)return;if(data.timer.state==='running'){toast('请先暂停当前计时，再切换模式。');return;}data.timer={...createTimer(b.dataset.mode),taskId:data.timer.taskId};persist();renderTimer();broadcastStatus();});
$('timer-duration').addEventListener('change',()=>{const n=Number($('timer-duration').value);if(!Number.isInteger(n)||n<1||n>180){toast('请输入 1—180 的整数分钟。');renderTimer();return;}if(data.timer.state==='running'){toast('请先暂停，再修改时长。');$('timer-duration').value=data.timer.duration/60;return;}data.timer={...createTimer(data.timer.mode,n),taskId:data.timer.taskId};persist();renderTimer();broadcastStatus();});

function selectedMusic(){return data.music.find(m=>m.id===data.selectedMusic&&m.platform==='qq');}
function safeMusic(item){try{return parseMusicLink(item.url,item.platform);}catch{return null;}}
function renderMusic(){
  const item=selectedMusic();$('music-title').textContent=item?.title||'给今天选一点音乐';$('music-caption').textContent=item?'QQ 音乐 · 已保存的链接':'你喜欢的歌，窗外的雨。';
  $('saved-music').innerHTML=data.music.filter(m=>m.platform==='qq'&&safeMusic(m)).map(m=>`<div class="saved-song"><button data-song="${esc(m.id)}" title="选择此链接">${m.id===data.selectedMusic?'♪ ':''}${esc(m.title||'QQ 音乐链接')}</button><button data-remove-song="${esc(m.id)}" aria-label="删除音乐链接">×</button></div>`).join('');
}
function openOfficial(url){const win=window.open(url,'_blank','noopener,noreferrer');return win;}
$('open-music').addEventListener('click',()=>{const item=selectedMusic();openOfficial((item&&safeMusic(item)?.url)||MUSIC_PROVIDERS.qq.home);});
$('change-music').addEventListener('click',()=>{$('music-editor').hidden=!$('music-editor').hidden;$('change-music').setAttribute('aria-expanded',String(!$('music-editor').hidden));if(!$('music-editor').hidden)$('music-url').focus();});
$('music-editor').addEventListener('submit',e=>{e.preventDefault();try{const parsed=parseMusicLink($('music-url').value,'qq');let item=data.music.find(m=>m.url===parsed.url);if(!item){if(data.music.length>=100)throw new Error('最多保存 100 个链接，请先删除不需要的链接');item={id:crypto.randomUUID(),...parsed,title:$('music-name').value.trim().slice(0,120)||'我的 QQ 音乐',created_at:new Date().toISOString()};data.music.push(item);}data.selectedMusic=item.id;persist();renderMusic();$('music-editor').hidden=true;$('change-music').setAttribute('aria-expanded','false');$('music-error').textContent='';toast('链接已保存，点击“在 QQ 音乐打开”即可前往原平台。');}catch(error){$('music-error').textContent=error.message;}});
$('saved-music').addEventListener('click',e=>{const pick=e.target.closest('[data-song]'),del=e.target.closest('[data-remove-song]');if(pick)data.selectedMusic=pick.dataset.song;if(del){data.music=data.music.filter(m=>m.id!==del.dataset.removeSong);if(data.selectedMusic===del.dataset.removeSong)data.selectedMusic=null;}persist();renderMusic();});

// Static release: all user data stays in this browser; no API probes.
async function api(){throw new Error('当前为本地静态版本');}
function syncSettings(){}
function broadcastStatus(){}
function sendRoom(){}
function renderAccount(){
  $('account-view').innerHTML='<p>任务、歌曲链接、声音偏好和专注记录保存在当前浏览器。清除网站数据会删除这些记录。</p>';
  renderHeatmap();
}
function renderHeatmap(){
  const host=document.createElement('div');host.innerHTML='<h3>过去一年的专注</h3><div class="heatmap" aria-label="最近 365 天活动"></div>';
  const grid=host.querySelector('.heatmap');for(let i=364;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);const key=dayKey(d),record=data.stats[key],n=record?.pomodoros||0;const cell=document.createElement('span');cell.className='heat-cell';cell.dataset.level=String(user?(record?.activity_level||0):n>=4?4:n>=2?3:n>=1?2:0);cell.title=`${key}：${n} 轮专注${user?`，${record?.online_minutes||0} 分钟在线`:''}`;grid.append(cell);}
  const note=document.createElement('p');note.className='panel-note';note.textContent=user?'云端每日汇总，统计日期按北京时间计算。':'当前图表表示本机完成专注次数。';host.append(note);$('account-view').append(host);
}
// Never persist account data into the guest key.
function tick(){finishTimer();renderTimer();$('clock').textContent=new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit',hour12:false});if(today!==dayKey()){today=dayKey();renderTasks();}}
renderScene();renderSounds();renderTasks();renderMusic();tick();
setInterval(tick,1000);setInterval(broadcastStatus,30000);
for(const name of ['pointerdown','keydown','touchstart'])document.addEventListener(name,()=>lastInteraction=Date.now(),{passive:true});
setInterval(()=>{if(user&&!document.hidden)api('/me/heartbeat',{method:'POST',body:{active:Date.now()-lastInteraction<600000}}).catch(()=>{});},300000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick();});
window.addEventListener('storage',e=>{if(e.key===STORAGE_KEY&&!user){const saved=loadData();if(saved.settings.scene!==data.settings.scene){for(const id of soundStates.keys())mixer.pause(id);soundStates.clear();}Object.assign(data,saved);renderScene();renderSounds();renderTasks();renderMusic();}});
