import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTimer,toggleTimer,settleTimer,secondsLeft,completeFocus,normalizeTasks,parseMusicLink,dayKey } from '../assets/js/domain.js';
import { loadData,saveData,STORAGE_KEY } from '../assets/js/storage.js';
test('后台计时按截止时间恢复，暂停不计时',()=>{
  let t=toggleTimer(createTimer('focus',25,1000),1000);
  assert.equal(secondsLeft(t,601000),900);t=toggleTimer(t,601000);assert.equal(secondsLeft(t,900000),900);
  t=toggleTimer(t,1000000);assert.equal(secondsLeft(t,1001000),899);assert.equal(settleTimer(t,2000000).state,'completed');
});
test('完成事件重入不会重复计数，休息不算专注',()=>{
  const t={...createTimer(),state:'completed',taskId:'one'};
  const d={tasks:[{id:'one',pomodoro_count:0}],completed:[],stats:{}};
  const once=completeFocus(d,t,'2026-10-29'), twice=completeFocus(once,t,'2026-10-29');
  assert.equal(twice.stats['2026-10-29'].pomodoros,1);assert.equal(twice.tasks[0].pomodoro_count,1);
  assert.deepEqual(completeFocus(twice,{...t,id:'rest',mode:'short'},'2026-10-29'),twice);
});
test('旧任务迁移保留完成状态，历史任务不被删除，异常字段被收敛',()=>{
  const tasks=normalizeTasks([{id:'a',title:'旧任务',completed:true},{id:'b',title:'历史',date:'2026-01-01'},null,{title:'x'.repeat(200)}],'2026-10-29');
  assert.equal(tasks.length,3);assert.equal(tasks[0].date,'2026-10-29');assert.equal(tasks[0].completed,true);assert.equal(tasks[1].date,'2026-01-01');assert.equal(tasks[2].title.length,120);
});
test('QQ 音乐只接受官方 HTTPS，不接受危险协议、伪装域名和嵌入代码',()=>{
  assert.equal(parseMusicLink('https://y.qq.com/n/ryqq/songDetail/123').platform,'qq');
  assert.equal(parseMusicLink('https://c6.y.qq.com/base/fcgi-bin/u?__=123').platform,'qq');
  for(const s of ['javascript:alert(1)','http://y.qq.com/','https://y.qq.com.evil.com/','https://y.qq.com@evil.com/','https://evil@y.qq.com/','<iframe>','https://y.qq.com:99/'])assert.throws(()=>parseMusicLink(s));
  assert.throws(()=>parseMusicLink('https://open.spotify.com/track/1','qq'));
});
test('迁移不修改原始键；损坏计时恢复为可用状态',()=>{
  const map=new Map([['rainy-cafe-tasks',JSON.stringify([{title:'旧任务',completed:false}])],['rainy-cafe-cat','🐱']]);
  const storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};
  const d=loadData(storage);assert.equal(d.tasks[0].title,'旧任务');assert.equal(d.settings.cat,'cream');assert.ok(map.has('rainy-cafe-tasks'));
  d.timer.deadline='bad';d.timer.state='running';saveData(d,storage);assert.equal(loadData(storage).timer.state,'idle');assert.ok(map.has(STORAGE_KEY));
});
test('本地日期不会因 UTC 转换偏移',()=>{const date=new Date(2026,9,29,0,1);assert.equal(dayKey(date),'2026-10-29');});
