import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SoundController} from '../assets/js/sound-controller.js';

function fixture(settings={saveSounds:true,sounds:{}}) {
  const playing=new Set(), requests=[];
  const mixer={pause(id){playing.delete(id);},volume(){},
    async play(id,volume,valid){requests.push(id);if(valid())playing.add(id);return valid();}};
  const controller=new SoundController(mixer,settings);
  return {controller,mixer,playing,requests,settings};
}
test('首次恢复只加载配置不播放，三轨混音独立暂停且音量保留',async()=>{
  const {controller:c,requests,playing,settings}=fixture({saveSounds:true,sounds:{cafe:{rain:{enabled:true,volume:23}}}});
  await c.selectScene('cafe',{restore:false});
  assert.equal(requests.length,0);
  await c.restore();assert.deepEqual([...playing],['rain']);
  await Promise.all([c.start('machine'),c.start('cups')]);assert.equal(playing.size,3);
  c.volume('rain',17);c.stop('rain');assert.equal(playing.size,2);
  assert.deepEqual(settings.sounds.cafe.rain,{enabled:false,volume:17});
});
test('已保存的全静音不被场景默认覆盖，保留混音支持跨场景',async()=>{
  const {controller:c,playing}=fixture({saveSounds:true,sounds:{'sunny-beach':{waves:{enabled:false,volume:12}}}});
  await c.selectScene('cafe',{restore:false});await c.start('rain');
  await c.selectScene('sunny-beach');assert.equal(playing.size,0);
  await c.start('waves');c.keepMix=true;await c.selectScene('campfire');
  assert.deepEqual([...playing],['waves']);
});
test('加载取消和快速切场景不会复活旧音轨，失败只影响一轨且可重试',async()=>{
  const {controller:c,mixer,playing}=fixture();
  let finish;
  mixer.play=(id,volume,valid)=>new Promise(resolve=>{finish=()=>{if(valid())playing.add(id);resolve(valid());};});
  await c.selectScene('cafe',{restore:false});const loading=c.start('rain');
  c.stop('rain');finish();await loading;assert.equal(playing.size,0);
  const stale=c.start('rain');c.selectScene('sunny-beach',{restore:false});finish();await stale;
  assert.equal(playing.size,0);assert.equal(c.states.get('rain').enabled,false);
  mixer.play=async(id)=>{if(id==='waves')throw new Error('测试失败');playing.add(id);return true;};
  await Promise.all([c.start('waves'),c.start('rain')]);
  assert.equal(c.states.get('waves').error,'测试失败');assert.ok(playing.has('rain'));
  mixer.play=async(id)=>{playing.add(id);return true;};await c.start('waves');
  assert.equal(c.states.get('waves').error,'');assert.ok(playing.has('waves'));
});
test('关闭保存不读取旧偏好，未播放时切场景不覆盖已保存开启状态',async()=>{
  const {controller:c,settings,requests}=fixture({saveSounds:true,sounds:{cafe:{rain:{enabled:true,volume:25}}}});
  await c.selectScene('cafe',{restore:false});await c.selectScene('campfire');
  assert.equal(settings.sounds.cafe.rain.enabled,true);assert.equal(requests.length,0);
  settings.saveSounds=false;await c.selectScene('cafe');
  assert.equal(c.states.get('rain').volume,40);
});
