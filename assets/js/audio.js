import { SOUND_TRACKS } from './sound-catalog.js';
export { SOUND_TRACKS } from './sound-catalog.js';
// Prepare a continuous loop by overlapping the tail and head in memory.
// Native AudioBuffer looping continues even when background timers are throttled.
export function loopRecording(ctx, buffer, event=false) {
  const overlap=event?0:Math.min(Math.floor(buffer.sampleRate*.65),Math.floor(buffer.length/4));
  const length=event?buffer.length+24*buffer.sampleRate:buffer.length-overlap;
  const result=ctx.createBuffer(buffer.numberOfChannels,length,buffer.sampleRate);
  for(let ch=0;ch<buffer.numberOfChannels;ch++){
    const input=buffer.getChannelData(ch),out=result.getChannelData(ch);
    out.set(input.subarray(0,Math.min(input.length,length)));
    for(let i=0;i<overlap;i++)out[i]=input[buffer.length-overlap+i]*(1-i/overlap)+input[i]*(i/overlap);
  }
  return result;
}
export class SoundMixer {
  constructor({maxCacheBytes=24*1024*1024}={}){this.context=null;this.tracks=new Map();this.buffers=new Map();this.bufferSizes=new Map();this.maxCacheBytes=maxCacheBytes;this.muted=false;}
  get cacheBytes(){return [...this.bufferSizes.values()].reduce((sum,size)=>sum+size,0);}
  pruneCache(){
    for(const id of this.buffers.keys()){
      if(this.cacheBytes<=this.maxCacheBytes)break;
      if(this.tracks.has(id)||!this.bufferSizes.has(id))continue;
      this.buffers.delete(id);this.bufferSizes.delete(id);
    }
  }
  async unlock(){
    if(!this.context){
      const Context=globalThis.AudioContext||globalThis.webkitAudioContext;
      if(!Context)throw new Error('当前浏览器不支持环境音播放');
      this.context=new Context();this.master=this.context.createGain();
      this.master.gain.value=this.muted?0:.55;this.master.connect(this.context.destination);
    }
    if(this.context.state==='suspended')await this.context.resume();
    if(this.context.state!=='running')throw new Error('声音被浏览器暂停，请再次点击播放');
  }
  async recording(track){
    if(!this.buffers.has(track.id)){
      const pending=(async()=>{
        let response;
        try{response=await fetch(track.src,{signal:AbortSignal.timeout(20000)});}
        catch(error){throw new Error(error.name==='TimeoutError'?'加载超时，请重试':'录音加载失败，请检查网络后重试');}
        if(!response.ok)throw new Error('录音加载失败，请检查网络后重试');
        const decoded=await this.context.decodeAudioData(await response.arrayBuffer());
        const loop=loopRecording(this.context,decoded,track.event);
        this.bufferSizes.set(track.id,loop.length*loop.numberOfChannels*4);
        this.pruneCache();
        return loop;
      })();
      this.buffers.set(track.id,pending);
      pending.catch(()=>{if(this.buffers.get(track.id)===pending){this.buffers.delete(track.id);this.bufferSizes.delete(track.id);}});
    }
    const cached=this.buffers.get(track.id);
    if(cached){this.buffers.delete(track.id);this.buffers.set(track.id,cached);}
    return cached;
  }
  async play(id,volume,valid=()=>true){
    await this.unlock();
    if(!valid())return false;
    const track=SOUND_TRACKS.find(t=>t.id===id);
    if(!track)throw new Error('未知音轨');
    if(this.tracks.has(id)){this.volume(id,volume);return true;}
    const ctx=this.context,gain=ctx.createGain(),node={gain,source:null};
    gain.gain.value=0;gain.connect(this.master);this.tracks.set(id,node);
    try{
      const buffer=await this.recording(track);
      if(this.tracks.get(id)!==node||!valid()){if(this.tracks.get(id)===node)this.pause(id);return false;}
      const source=ctx.createBufferSource();node.source=source;
      source.buffer=buffer;source.loop=true;source.connect(gain);source.start();this.volume(id,volume);return true;
    }catch(error){if(this.tracks.get(id)===node)this.tracks.delete(id);gain.disconnect();throw error;}
  }
  pause(id){
    const node=this.tracks.get(id);if(!node)return;
    this.tracks.delete(id);
    this.pruneCache();
    if(!node.source){node.gain.disconnect();return;}
    node.gain.gain.setTargetAtTime(0,this.context.currentTime,.04);
    node.source.stop(this.context.currentTime+.2);
    node.source.onended=()=>{node.source.disconnect();node.gain.disconnect();};
  }
  volume(id,value){const node=this.tracks.get(id);if(node)node.gain.gain.setTargetAtTime(Math.max(0,Math.min(100,value))/100,this.context.currentTime,.08);}
  mute(value){this.muted=value;if(this.master)this.master.gain.setTargetAtTime(value?0:.55,this.context.currentTime,.06);}
  async meow() {
    await this.unlock();
    const ctx = this.context, osc = ctx.createOscillator(), gain = ctx.createGain(), filter = ctx.createBiquadFilter();
    osc.type = 'sawtooth'; osc.frequency.setValueAtTime(640, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(920, ctx.currentTime + .13); osc.frequency.exponentialRampToValueAtTime(390, ctx.currentTime + .62);
    filter.type = 'bandpass'; filter.frequency.value = 1250; filter.Q.value = 1.5;
    gain.gain.setValueAtTime(0, ctx.currentTime); gain.gain.linearRampToValueAtTime(.11, ctx.currentTime + .07); gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .7);
    osc.connect(filter); filter.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + .75);
    osc.onended = () => { osc.disconnect(); filter.disconnect(); gain.disconnect(); };
  }
}
