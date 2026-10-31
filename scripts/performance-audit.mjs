import {chromium} from '../.release-check/node_modules/playwright/index.mjs';
import {spawn} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const server=spawn(process.execPath,['scripts/dev-server.js'],{env:{...process.env,PORT:'4181'},stdio:'pipe',windowsHide:true});
await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
const results=[];
try{
for(const [name,executablePath] of [['Chrome','C:/Program Files/Google/Chrome/Application/chrome.exe'],['Edge','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe']]){
  const browser=await chromium.launch({executablePath,headless:true});
  try{
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    const page=await context.newPage();const errors=[],audioRequests=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().endsWith('.mp3'))audioRequests.push(r.url());});
    await page.goto('http://127.0.0.1:4181');await page.waitForSelector('.scene-svg');
    assert.equal(audioRequests.length,0);
    const navigation=await page.evaluate(()=>{const p=performance.getEntriesByType('navigation')[0];return {domContentLoadedMs:Math.round(p.domContentLoadedEventEnd),resources:performance.getEntriesByType('resource').length};});
    await page.click('[data-panel="settings"]');
    // Every scene/cat combination in the touch viewport.
    for(const scene of ['cafe','rainy-room','sunny-beach','campfire']){
      await page.click(`[data-scene="${scene}"]`);
      for(const cat of ['black','coal','cream','orange'])await page.click(`[data-cat="${cat}"]`);
    }
    await page.waitForTimeout(400);assert.equal(await page.locator('.scene-layer').count(),1);
    const cdp=await context.newCDPSession(page);
    await cdp.send('HeapProfiler.collectGarbage');const before=await cdp.send('Memory.getDOMCounters');
    await page.evaluate(()=>{for(let n=0;n<80;n++){const id=['cafe','rainy-room','sunny-beach','campfire'][n%4];document.querySelector(`[data-scene="${id}"]`).click();}});
    await page.waitForTimeout(400);await cdp.send('HeapProfiler.collectGarbage');const after=await cdp.send('Memory.getDOMCounters');
    assert.equal(await page.locator('.scene-layer').count(),1);assert.ok(after.nodes-before.nodes<300);
    await page.keyboard.press('Escape');await page.click('#mobile-sounds');
    const cache=await page.evaluate(async()=>{
      const {SoundMixer,SOUND_TRACKS}=await import('/assets/js/audio.js');
      const mixer=new SoundMixer();await mixer.unlock();
      await Promise.all(SOUND_TRACKS.map(t=>mixer.play(t.id,t.volume)));
      const playing=mixer.tracks.size,activeBytes=mixer.cacheBytes;
      for(const t of SOUND_TRACKS)mixer.pause(t.id);
      await new Promise(resolve=>setTimeout(resolve,250));mixer.pruneCache();
      const result={playing,activeBytes,idleBytes:mixer.cacheBytes,budget:mixer.maxCacheBytes,remainingTracks:mixer.tracks.size};
      await mixer.context.close();return result;
    });
    assert.equal(cache.playing,6);assert.equal(cache.remainingTracks,0);assert.ok(cache.idleBytes<=cache.budget);
    await page.emulateMedia({reducedMotion:'reduce'});
    assert.equal(await page.locator('#scene-art').evaluate(el=>el.getAnimations({subtree:true}).length),0);
    await page.setViewportSize({width:844,height:390});await page.click('[data-panel="timer"]');
    const panel=await page.locator('#panel-timer').boundingBox();assert.ok(panel.y>=0&&panel.y+panel.height<=390);
    await page.screenshot({path:`.release-check/day6-${name.toLowerCase()}.png`,fullPage:true});
    assert.deepEqual(errors,[]);
    results.push({browser:name,version:browser.version(),navigation,initialAudioRequests:0,combinations:16,rapidSceneChanges:80,domNodesBefore:before.nodes,domNodesAfter:after.nodes,cache,pageErrors:errors});
  }finally{await browser.close();}
}
await writeFile('docs/day6-browser-results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
}finally{server.kill();}
