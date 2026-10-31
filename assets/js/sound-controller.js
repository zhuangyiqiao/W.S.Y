import { SOUND_TRACKS, SCENE_SOUND_PLANS } from './sound-catalog.js';

export class SoundController {
  constructor(mixer, settings, changed = () => {}, save = () => {}) {
    this.mixer = mixer; this.settings = settings;
    this.changed = changed; this.save = save;
    this.states = new Map(); this.scene = null;
    this.keepMix = false;
    if (!settings.sounds || typeof settings.sounds !== 'object' || Array.isArray(settings.sounds)) settings.sounds = {};
  }
  snapshot() {
    return Object.fromEntries([...this.states].map(([id,s]) => [id,{volume:s.volume,enabled:s.preferred}]));
  }
  persist() {
    if (this.settings.saveSounds && this.scene) {
      this.settings.sounds[this.scene] = this.snapshot(); this.save();
    }
  }
  selectScene(id, { restore = true } = {}) {
    if (!SCENE_SOUND_PLANS[id]) return;
    const active = [...this.states.values()].some(s => s.wanted);
    const previous = this.snapshot();
    this.persist();
    for (const key of this.states.keys()) this.mixer.pause(key);
    this.scene = id;
    const saved = this.settings.saveSounds ? this.settings.sounds[id] : null;
    // An explicitly saved silent mix must stay silent; it is not a missing preset.
    const config = this.keepMix && restore ? previous : saved;
    this.states = new Map(SOUND_TRACKS.map(track => {
      const entry = config?.[track.id];
      return [track.id, {volume:Number.isFinite(entry?.volume) ? Math.max(0,Math.min(100,entry.volume)) : track.volume,
        wanted:false, preferred:config ? !!entry?.enabled : SCENE_SOUND_PLANS[id].primary.includes(track.id),
        enabled:false, pending:false, error:'', token:0}];
    }));
    this.changed();
    if (restore && active) return this.restore();
    return Promise.resolve();
  }
  async start(id) {
    const state = this.states.get(id);
    if (!state || state.pending || state.enabled) return;
    const token = ++state.token;
    const valid = () => this.states.get(id) === state && state.token === token && state.wanted;
    state.wanted = true; state.preferred = true; state.pending = true; state.error = '';
    this.persist(); this.changed();
    try {
      const played = await this.mixer.play(id, state.volume, valid);
      if (valid()) { state.enabled = played !== false; this.mixer.volume(id,state.volume); }
    } catch (error) {
      if (valid()) state.error = error.message || '加载失败，请重试';
    } finally {
      if (valid()) { state.pending = false; this.changed(); }
    }
  }
  stop(id) {
    const state = this.states.get(id); if (!state) return;
    state.token++; state.wanted = false; state.preferred = false;
    state.enabled = false; state.pending = false; state.error = '';
    this.mixer.pause(id); this.persist(); this.changed();
  }
  toggle(id) {
    const state = this.states.get(id); if (!state) return;
    return state.pending || state.enabled ? this.stop(id) : this.start(id);
  }
  volume(id, value) {
    const state = this.states.get(id); if (!state || !Number.isFinite(value)) return;
    state.volume = Math.max(0,Math.min(100,value));
    this.mixer.volume(id,state.volume); this.persist();
  }
  restore() {
    return Promise.all([...this.states].filter(([,s]) => s.preferred).map(([id])=>this.start(id)));
  }
  recommended() {
    for (const id of this.states.keys()) this.stop(id);
    for (const track of SOUND_TRACKS) this.states.get(track.id).volume = track.volume;
    const jobs = SCENE_SOUND_PLANS[this.scene].primary.map(id => this.start(id));
    this.persist(); this.changed(); return Promise.all(jobs);
  }
}
