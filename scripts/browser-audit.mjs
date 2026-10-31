import { chromium } from '../.release-check/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
const server=spawn(process.execPath,['scripts/dev-server.js'],{env:{...process.env,PORT:'4179'},stdio:'pipe',windowsHide:true});
await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const errors=[];const context=await browser.newContext();const page=await context.newPage();
page.on('pageerror',error=>errors.push(error.message));
const url='http://127.0.0.1:4179';
try{
  await page.goto(url);await page.waitForSelector('.scene-svg');
  for(const [width,height] of [[320,700],[390,844],[760,800],[844,390],[1280,800],[1440,900]]){
    await page.setViewportSize({width,height});
    await page.waitForTimeout(100);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow at ${width}`);
    if(width<=760){await page.click('#mobile-sounds');await page.click('#all-sounds');}
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`sounds overflow at ${width}`);
    await page.screenshot({path:`.release-check/audit-${width}.png`,fullPage:true});
  }
  await page.setViewportSize({width:1280,height:800});
  await page.click('[data-panel="tasks"]');await page.fill('#task-input','浏览器验收任务');await page.click('#task-form button');
  await page.click('[data-focus]');await page.click('#timer-toggle');
  const deadline=await page.evaluate(()=>JSON.parse(localStorage.getItem('rainy-cafe-v2')).timer.deadline);
  await page.keyboard.press('Escape');
  await page.click('[data-panel="settings"]');await page.click('[data-scene="sunny-beach"]');await page.click('[data-scene="campfire"]');await page.click('[data-scene="cafe"]');
  await page.waitForTimeout(400);assert.equal(await page.locator('.scene-layer').count(),1);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('rainy-cafe-v2')).timer.deadline),deadline);
  await page.keyboard.press('Escape');
  if(await page.locator('#all-sounds').getAttribute('aria-pressed')==='false')await page.click('#all-sounds');
  for(const id of ['rain','cups','machine'])await page.click(`[data-sound="${id}"]`);
  await page.waitForFunction(()=>['rain','cups','machine'].every(id=>document.querySelector(`[data-sound="${id}"]`)?.getAttribute('aria-pressed')==='true'),{},{timeout:25000});
  await page.click('#keep-mix');await page.click('[data-panel="settings"]');await page.click('[data-scene="sunny-beach"]');await page.keyboard.press('Escape');
  await page.waitForFunction(()=>['rain','cups','machine'].every(id=>document.querySelector(`[data-sound="${id}"]`)?.getAttribute('aria-pressed')==='true'));
  await page.setViewportSize({width:390,height:844});await page.click('#mobile-sounds');await page.click('#mobile-music');
  await page.reload();await page.click('#mobile-sounds');
  assert.equal(await page.locator('.sound-play[aria-pressed="true"]').count(),0);
  await page.click('#restore-sounds');await page.waitForFunction(()=>document.querySelectorAll('.sound-play[aria-pressed="true"]').length===3);
  await page.screenshot({path:'.release-check/audit-final-mobile.png',fullPage:true});
  // A failed real network request must leave the other two tracks usable.
  await page.reload();await page.click('#mobile-sounds');
  await page.route('**/audio/rain.mp3',route=>route.abort());
  await page.click('#restore-sounds');
  await page.waitForFunction(()=>document.querySelector('#sound-status-rain')?.textContent.includes('失败'));
  await page.waitForFunction(()=>document.querySelectorAll('.sound-play[aria-pressed="true"]').length===2);
  await page.unroute('**/audio/rain.mp3');await page.click('[data-sound="rain"]');
  await page.waitForFunction(()=>document.querySelector('[data-sound="rain"]')?.getAttribute('aria-pressed')==='true');
  // Pause during a deliberately delayed download, then let that request finish.
  await page.reload();await page.click('#mobile-sounds');
  let release;
  await page.route('**/audio/rain.mp3',async route=>{await new Promise(resolve=>release=resolve);await route.continue();});
  await page.click('#all-sounds');await page.click('[data-sound="rain"]');
  await page.waitForFunction(()=>document.querySelector('#sound-status-rain')?.textContent.includes('加载'));
  await page.click('[data-sound="rain"]');
  while(!release)await page.waitForTimeout(10);release();await page.waitForTimeout(250);
  assert.equal(await page.locator('[data-sound="rain"]').getAttribute('aria-pressed'),'false');
  await page.unroute('**/audio/rain.mp3');
  // Switch repeatedly in one frame and disable motion mid-transition.
  await page.click('[data-panel="settings"]');
  await page.evaluate(()=>{for(const id of ['campfire','cafe','sunny-beach','rainy-room'])document.querySelector(`[data-scene="${id}"]`).click();});
  await page.uncheck('#animation-enabled');
  assert.equal(await page.locator('.scene-layer').count(),1);
  assert.equal(await page.locator('#scene-art').evaluate(el=>el.getAnimations({subtree:true}).length),0);
  await page.keyboard.press('Escape');
  // Resume an expired timer and ensure subsequent ticks do not count it twice.
  await page.evaluate(()=>{const d=JSON.parse(localStorage.getItem('rainy-cafe-v2'));d.timer.deadline=Date.now()-1;localStorage.setItem('rainy-cafe-v2',JSON.stringify(d));});
  await page.reload();await page.waitForTimeout(1200);
  const completed=await page.evaluate(()=>JSON.parse(localStorage.getItem('rainy-cafe-v2')).completed.length);
  await page.waitForTimeout(1200);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('rainy-cafe-v2')).completed.length),completed);
  assert.equal(completed,1);
  const blocked=await context.newPage();blocked.on('pageerror',error=>errors.push(error.message));
  await blocked.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('blocked','SecurityError');}}));
  await blocked.goto(url);await blocked.waitForSelector('.scene-svg');
  await blocked.click('[data-panel="tasks"]');await blocked.fill('#task-input','无法保存仍可使用');await blocked.click('#task-form button');
  assert.ok(await blocked.locator('#task-list').textContent().then(text=>text.includes('无法保存仍可使用')));
  await blocked.close();
  assert.deepEqual(errors,[]);console.log('PASS: six viewports, real three-track audio, retry/cancel, rapid scenes, motion disabled, expired timer, blocked storage.');
}finally{console.log(JSON.stringify({pageErrors:errors}));await browser.close();server.kill();}
