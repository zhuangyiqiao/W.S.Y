import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {SOUND_TRACKS,SOUND_SOURCES,SCENE_SOUND_PLANS} from '../assets/js/sound-catalog.js';
import {loopRecording,SoundMixer} from '../assets/js/audio.js';

test('每个上线音轨均有随站文件、许可、作者和可验证哈希',async()=>{
  const manifest=JSON.parse(await readFile(new URL('../assets/audio/manifest.json',import.meta.url)));
  assert.equal(manifest.length,SOUND_TRACKS.length);
  for(const t of SOUND_TRACKS){
    const source=SOUND_SOURCES[t.source];assert.ok(source.author&&source.licenseUrl);
    const bytes=await readFile(new URL(t.src));
    const entry=manifest.find(m=>m.file===`${t.source}.mp3`);
    assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.sha256);
    assert.equal(source.url,entry.sourcePage);assert.equal(source.license,entry.license);
    assert.ok(bytes.length>1000);
  }
  for(const scene of Object.values(SCENE_SOUND_PLANS)){
    assert.ok(scene.tracks.length);for(const id of [...scene.tracks,...scene.primary])assert.ok(SOUND_TRACKS.some(t=>t.id===id));
  }
});
const context={createBuffer(channels,length,sampleRate){const arrays=Array.from({length:channels},()=>new Float32Array(length));return {length,sampleRate,numberOfChannels:channels,getChannelData:i=>arrays[i]};}};
test('连续录音首尾重叠，短音效追加静默避免密集重复',()=>{
  const input=context.createBuffer(1,100,10);input.getChannelData(0).set(Array.from({length:100},(_,i)=>i));
  const loop=loopRecording(context,input);assert.equal(loop.length,94);assert.equal(loop.getChannelData(0)[0],94);assert.equal(loop.getChannelData(0)[93],93);
  const event=loopRecording(context,input,true);assert.equal(event.length,340);assert.equal(event.getChannelData(0)[99],99);assert.equal(event.getChannelData(0)[100],0);
});
test('录音仍在加载时暂停，不会在解码结束后重新发声',async()=>{
  let finish,started=0;
  const mixer=new SoundMixer();
  mixer.context={currentTime:0,createGain:()=>({gain:{value:0,setTargetAtTime(){}},connect(){},disconnect(){}}),createBufferSource:()=>({connect(){},start(){started++;}})};
  mixer.unlock=async()=>{};mixer.recording=()=>new Promise(resolve=>finish=resolve);
  const playing=mixer.play('rain',30);await Promise.resolve();mixer.pause('rain');finish({});await playing;
  assert.equal(started,0);assert.equal(mixer.tracks.size,0);
});
