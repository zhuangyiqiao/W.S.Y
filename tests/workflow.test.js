import {test} from 'node:test';
import assert from 'node:assert/strict';
import {MobilePanels} from '../assets/js/mobile-panels.js';
import {SoundController} from '../assets/js/sound-controller.js';
import {loadData,saveData} from '../assets/js/storage.js';
import {createTimer,toggleTimer,secondsLeft,settleTimer,completeFocus,parseMusicLink,dayKey} from '../assets/js/domain.js';

test('手机切换只隐藏面板，回桌面恢复两区，焦点不会留在隐藏内容',()=>{
  const media={matches:true,addEventListener(type,fn){this.changed=fn;}};
  const buttons=['music','sounds'].map(id=>({dataset:{mobilePanel:id},setAttribute(key,value){this[key]=value;},focus(){document.activeElement=this;}}));
  const nav={querySelectorAll:()=>buttons,addEventListener(){}};
  const focused={};globalThis.document={activeElement:focused};
  const panels={music:{contains:e=>e===focused},sounds:{contains:()=>false,focus(){document.activeElement=this;}}};
  const ui=new MobilePanels(nav,panels,media);
  assert.equal(panels.music.hidden,false);assert.equal(panels.sounds.hidden,true);
  ui.select('sounds');assert.equal(document.activeElement,buttons[1]);
  assert.equal(panels.music.hidden,true);assert.equal(buttons[1]['aria-pressed'],'true');
  media.matches=false;media.changed();
  assert.equal(document.activeElement,panels.sounds);
  assert.equal(nav.hidden,true);assert.equal(panels.music.hidden,false);assert.equal(panels.sounds.hidden,false);
  media.matches=true;media.changed();assert.equal(panels.sounds.hidden,false);
});

test('任务关联专注、跨场景混音、后台完成和刷新恢复保留数据且不自动播放',async()=>{
  const map=new Map([['rainy-cafe-tasks',JSON.stringify([{title:'历史任务',date:'2026-01-01',completed:true}])]]);
  const storage={getItem:key=>map.get(key)||null,setItem:(key,value)=>map.set(key,value)};
  let data=loadData(storage);const date=dayKey();
  data.tasks.push({id:'today',title:'读完一章',date,completed:false,pomodoro_count:0});
  data.music.push({id:'song',title:'我的歌单',...parseMusicLink('https://y.qq.com/n/ryqq/playlist/123')});data.selectedMusic='song';
  data.timer={...toggleTimer(createTimer('focus',1,1000),1000),taskId:'today'};
  const playing=new Set();const mixer={pause:id=>playing.delete(id),volume(){},async play(id,value,valid){if(valid())playing.add(id);return valid();}};
  const sounds=new SoundController(mixer,data.settings,()=>{},()=>saveData(data,storage));
  await sounds.selectScene('cafe',{restore:false});await Promise.all([sounds.start('rain'),sounds.start('cups'),sounds.start('machine')]);
  sounds.keepMix=true;data.settings.keepMix=true;data.settings.scene='sunny-beach';await sounds.selectScene('sunny-beach');
  assert.equal(playing.size,3);assert.equal(secondsLeft(data.timer,11000),50);assert.equal(data.timer.taskId,'today');assert.equal(data.selectedMusic,'song');
  data.timer=settleTimer(data.timer,61000);data=completeFocus(data,data.timer,date);data=completeFocus(data,data.timer,date);
  saveData(data,storage);const restored=loadData(storage);
  assert.equal(restored.stats[date].pomodoros,1);assert.equal(restored.tasks.find(t=>t.id==='today').pomodoro_count,1);
  assert.equal(restored.tasks.find(t=>t.title==='历史任务').completed,true);assert.ok(map.has('rainy-cafe-tasks'));
  assert.equal(restored.settings.scene,'sunny-beach');assert.equal(restored.selectedMusic,'song');
  let played=0;const reloaded=new SoundController({...mixer,async play(){played++;return true;}},restored.settings);
  await reloaded.selectScene('sunny-beach',{restore:false});assert.equal(played,0);
  await reloaded.restore();assert.equal(played,3);
});
