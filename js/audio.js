/* 못박자! — 소리
 * 전부 Web Audio 로 합성한다. 음원 파일은 없다.
 * 예약하는 소리(V.*)는 오디오 시계의 시각 t 를 받고, 누르는 순간 나는 소리(hit 등)는 바로 낸다.
 */
(function (global) {
  'use strict';
  const MB = (global.MB = global.MB || {});

  let ctx = null;
  let master = null, bgmBus = null, sfxBus = null, noiseBuf = null;
  const vol = { bgm: 0.7, sfx: 0.9 };
  const MASTER = 0.85;
  let muted = false;                     // 전체 소리 끄기 (자동 검증 때 쓴다)

  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  function ensure() {
    if (ctx) return ctx;
    const AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC({ latencyHint: 'interactive' });
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12;
    comp.knee.value = 14;
    comp.ratio.value = 4;
    comp.attack.value = 0.003;
    comp.release.value = 0.18;
    master = ctx.createGain();
    master.gain.value = muted ? 0 : MASTER;
    bgmBus = ctx.createGain();
    sfxBus = ctx.createGain();
    bgmBus.connect(master);
    sfxBus.connect(master);
    master.connect(comp);
    comp.connect(ctx.destination);
    applyVol();
    const len = ctx.sampleRate;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return ctx;
  }

  function applyVol() {
    if (!ctx) return;
    bgmBus.gain.value = vol.bgm * vol.bgm * 0.6;
    sfxBus.gain.value = vol.sfx * vol.sfx * 1.0;
  }
  function setVol(bgm, sfx) {
    if (bgm != null) vol.bgm = Math.max(0, Math.min(1, bgm));
    if (sfx != null) vol.sfx = Math.max(0, Math.min(1, sfx));
    applyVol();
  }

  function setMute(on) {
    muted = !!on;
    if (master) master.gain.value = muted ? 0 : MASTER;
  }

  function resume() {
    if (!ensure()) return Promise.resolve(false);
    if (ctx.state === 'running') return Promise.resolve(true);
    return ctx.resume().then(() => true, () => false);
  }
  function suspend() {
    if (ctx && ctx.state === 'running') return ctx.suspend();
    return Promise.resolve();
  }
  const now = () => (ctx ? ctx.currentTime : 0);

  /* 지금 스피커에서 나오고 있는 소리의 오디오 시각.
   * perfNow(performance.now 기준)를 주면 그 순간의 값으로 환산한다 — 입력 이벤트의 timeStamp 를 넣는다. */
  function audible(perfNow) {
    if (!ctx) return 0;
    const cur = ctx.currentTime;
    let t = cur - ((ctx.outputLatency || 0) + (ctx.baseLatency || 0));
    if (ctx.getOutputTimestamp) {
      const ts = ctx.getOutputTimestamp();
      if (ts && ts.performanceTime > 0 && ts.contextTime > 0) {
        const p = perfNow == null ? performance.now() : perfNow;
        const e = ts.contextTime + (p - ts.performanceTime) / 1000;
        if (e <= cur + 0.03 && e >= cur - 0.8) t = e;   // 엉뚱한 값이면 쓰지 않는다
      }
    }
    return t;
  }

  /* ---------- 기본 발음 ---------- */
  function osc(type, freq, t, dur, peak, bus, o) {
    o = o || {};
    const os = ctx.createOscillator();
    const g = ctx.createGain();
    os.type = type;
    os.frequency.setValueAtTime(freq, t);
    if (o.to) os.frequency.exponentialRampToValueAtTime(o.to, t + (o.sweep || dur));
    const a = o.attack || 0.003;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dur);
    let node = os;
    if (o.lp) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = o.lp;
      node.connect(f);
      node = f;
    }
    node.connect(g);
    g.connect(bus);
    os.start(t);
    os.stop(t + a + dur + 0.05);
  }

  function nz(t, dur, peak, bus, type, freq, q) {
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    if (q) f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.002 + dur);
    s.connect(f);
    f.connect(g);
    g.connect(bus);
    s.start(t, Math.random() * 0.6);
    s.stop(t + dur + 0.06);
  }

  /* ---------- 예약해서 내는 소리 ---------- */
  const V = {
    // 배경음
    kick(t, v) {
      v = v == null ? 1 : v;
      osc('sine', 165, t, 0.19, 1.1 * v, bgmBus, { to: 44, sweep: 0.1, attack: 0.001 });
      nz(t, 0.012, 0.25 * v, bgmBus, 'highpass', 1800);
    },
    // 세트 머리의 심벌
    crash(t, v) {
      v = v == null ? 1 : v;
      nz(t, 0.8, 0.2 * v, bgmBus, 'highpass', 5200);
      nz(t, 0.22, 0.18 * v, bgmBus, 'bandpass', 9000, 0.7);
    },
    // 박수
    clap(t, v) {
      v = v == null ? 1 : v;
      nz(t, 0.03, 0.28 * v, bgmBus, 'bandpass', 1500, 1.2);
      nz(t + 0.012, 0.03, 0.28 * v, bgmBus, 'bandpass', 1500, 1.2);
      nz(t + 0.026, 0.12, 0.3 * v, bgmBus, 'bandpass', 1700, 0.9);
    },
    // 치고 올라가는 바람 소리
    riser(t, dur, v) {
      v = v == null ? 1 : v;
      const s = ctx.createBufferSource();
      s.buffer = noiseBuf;
      s.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.Q.value = 1.2;
      f.frequency.setValueAtTime(500, t);
      f.frequency.exponentialRampToValueAtTime(7000, t + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.15 * v, t + dur * 0.92);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f);
      f.connect(g);
      g.connect(bgmBus);
      s.start(t);
      s.stop(t + dur + 0.05);
    },
    snare(t, v) {
      v = v == null ? 1 : v;
      nz(t, 0.11, 0.42 * v, bgmBus, 'bandpass', 2100, 0.8);
      osc('triangle', 210, t, 0.07, 0.22 * v, bgmBus, { to: 150 });
    },
    hat(t, v, open) { nz(t, open ? 0.16 : 0.035, 0.2 * (v == null ? 1 : v), bgmBus, 'highpass', 7500); },
    bass(t, m, dur, v) {
      v = v == null ? 1 : v;
      osc('triangle', mtof(m), t, dur, 0.5 * v, bgmBus);
      osc('sine', mtof(m), t, dur, 0.3 * v, bgmBus);
    },
    marimba(t, m, v) {
      v = v == null ? 1 : v;
      const f = mtof(m);
      osc('sine', f, t, 0.28, 0.3 * v, bgmBus);
      osc('sine', f * 4, t, 0.07, 0.09 * v, bgmBus);
    },
    lead(t, m, dur, v) { osc('square', mtof(m), t, dur, 0.09 * (v == null ? 1 : v), bgmBus, { lp: 2400, attack: 0.008 }); },

    // 사부의 "똑"
    wood(t, v, f) {
      v = v == null ? 1 : v;
      f = f || 1180;
      osc('sine', f, t, 0.055, 0.9 * v, sfxBus, { to: f * 0.82, sweep: 0.05, attack: 0.001 });
      osc('triangle', f * 2.4, t, 0.02, 0.25 * v, sfxBus, { attack: 0.001 });
      nz(t, 0.012, 0.3 * v, sfxBus, 'bandpass', 2600, 1.5);
    },
    // 떡 반죽의 "철퍽"
    slap(t, v) {
      v = v == null ? 1 : v;
      nz(t, 0.07, 0.7 * v, sfxBus, 'lowpass', 900);
      osc('sine', 150, t, 0.09, 0.6 * v, sfxBus, { to: 75, attack: 0.001 });
    },
    // 서류의 "착"
    flip(t, v) {
      v = v == null ? 1 : v;
      nz(t, 0.03, 0.6 * v, sfxBus, 'highpass', 3200);
      osc('triangle', 1500, t, 0.03, 0.3 * v, sfxBus, { to: 900, attack: 0.001 });
    },
    // 전동 드릴 "위이잉": 정해진 시각부터 정해진 길이만큼. 누르고 있을 때 나는 drill(on) 과 똑같은 소리다
    // (의자 만들기에서 사부의 시범과 내 드릴이 같은 소리로 들려야 길이를 따라 하기 쉽다)
    whirr(t, dur, v) {
      if (!ctx) return;
      v = v == null ? 1 : v;
      const o = ctx.createOscillator(), o2 = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(128, t + 0.12);
      o2.type = 'square'; o2.frequency.setValueAtTime(181, t); o2.frequency.exponentialRampToValueAtTime(257, t + 0.12);
      f.type = 'lowpass'; f.frequency.value = 1800;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.17 * v, t + 0.03);
      g.gain.setValueAtTime(0.17 * v, t + dur);
      g.gain.setTargetAtTime(0.0001, t + dur, 0.02);
      o.connect(f); o2.connect(f); f.connect(g); g.connect(sfxBus);
      o.start(t); o2.start(t);
      o.stop(t + dur + 0.15); o2.stop(t + dur + 0.15);
    },
    // 나사가 다 조여졌을 때의 "딱"
    tight(t, v) {
      v = v == null ? 1 : v;
      osc('sine', 1560, t, 0.055, 0.9 * v, sfxBus, { to: 1280, sweep: 0.05, attack: 0.001 });
      osc('triangle', 3740, t, 0.02, 0.25 * v, sfxBus, { attack: 0.001 });
      nz(t, 0.012, 0.3 * v, sfxBus, 'bandpass', 2600, 1.5);
    },
    // 나사의 "끼릭"
    ratchet(t, v) {
      v = v == null ? 1 : v;
      for (let i = 0; i < 4; i++) osc('square', 1500 + i * 260, t + i * 0.024, 0.014, 0.22 * v, sfxBus, { lp: 5000, attack: 0.001 });
    },
    // 차례 신호 "자!"
    cue(t, m, v) {
      v = v == null ? 1 : v;
      const f = mtof(m);
      osc('triangle', f, t, 0.16, 0.5 * v, sfxBus);
      osc('sine', f * 2, t, 0.1, 0.2 * v, sfxBus);
    },
    // 세는 소리, 메트로놈
    click(t, v, accent) { osc('sine', accent ? 990 : 660, t, 0.05, 0.6 * (v == null ? 1 : v), sfxBus, { attack: 0.001 }); }
  };

  /* ---------- 누르는 순간 나는 소리 ---------- */
  /* q = 판정, combo = 지금 콤보. 콤보가 오를수록 쇠 울림이 조금씩 높아져서 달아오르는 느낌을 준다 */
  function hit(q, combo) {
    if (!ctx) return;
    const t = ctx.currentTime + 0.002;
    if (q === 'perfect' || q === 'good') {
      const v = q === 'perfect' ? 1 : 0.82;
      const up = Math.pow(2, Math.min(14, Math.floor((combo || 0) / 3)) / 24);
      osc('sine', 190, t, 0.2, 1.25 * v, sfxBus, { to: 42, sweep: 0.13, attack: 0.001 });     // 쿵
      osc('triangle', 96, t, 0.1, 0.5 * v, sfxBus, { to: 50, attack: 0.001 });
      nz(t, 0.03, 0.6 * v, sfxBus, 'highpass', 2500);                                         // 탁
      nz(t, 0.09, 0.3 * v, sfxBus, 'bandpass', 900, 0.8);                                     // 나무 울림
      const f = 1250 * up;                                                                    // 쇠 울림
      osc('square', f, t, 0.1, 0.11 * v, sfxBus, { lp: 7000, attack: 0.001 });
      osc('sine', f * 1.48, t, 0.16, 0.13 * v, sfxBus, { attack: 0.001 });
      osc('sine', f * 2.31, t, 0.12, 0.08 * v, sfxBus, { attack: 0.001 });
      if (q === 'perfect') {                                                                  // 반짝
        osc('sine', 2093 * up, t + 0.02, 0.14, 0.12, sfxBus);
        osc('sine', 3136 * up, t + 0.06, 0.2, 0.1, sfxBus);
      }
    } else if (q === 'bad') {
      osc('triangle', 300, t, 0.07, 0.5, sfxBus, { to: 180, attack: 0.001 });
      nz(t, 0.03, 0.3, sfxBus, 'lowpass', 1200);
      osc('sine', 420, t + 0.03, 0.16, 0.2, sfxBus, { to: 620, sweep: 0.14 });               // 띠용
    } else if (q === 'whiff') {
      nz(t, 0.06, 0.4, sfxBus, 'lowpass', 500);
      osc('sine', 90, t, 0.07, 0.4, sfxBus, { to: 60 });
    } else if (q === 'screw') {
      V.ratchet(t, 1.2);
      osc('sawtooth', 160, t + 0.05, 0.2, 0.3, sfxBus, { to: 90, lp: 900 });
    } else if (q === 'tick') {
      osc('sine', 500, t, 0.03, 0.15, sfxBus, { attack: 0.001 });
    }
  }

  // 전동 드릴: 누르고 있는 동안 계속 나는 소리
  let drillNode = null;
  function drill(on) {
    if (!ctx) return;
    if (on && !drillNode) {
      const t = ctx.currentTime;
      const o = ctx.createOscillator(), o2 = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(128, t + 0.12);
      o2.type = 'square'; o2.frequency.setValueAtTime(181, t); o2.frequency.exponentialRampToValueAtTime(257, t + 0.12);
      f.type = 'lowpass'; f.frequency.value = 1800;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.17, t + 0.03);
      o.connect(f); o2.connect(f); f.connect(g); g.connect(sfxBus);
      o.start(t); o2.start(t);
      drillNode = { o, o2, g };
    } else if (!on && drillNode) {
      const d = drillNode, t = ctx.currentTime;
      drillNode = null;
      d.g.gain.setTargetAtTime(0.0001, t, 0.02);
      d.o.stop(t + 0.15); d.o2.stop(t + 0.15);
    }
  }

  // 드릴에서 손을 뗀 순간: 사부의 시범과 같은 "딱"으로 끝나고, 잘 맞으면 반짝 소리가 덧붙는다
  function tighten(q, combo) {
    if (!ctx) return;
    const t = ctx.currentTime + 0.002;
    if (q === 'perfect' || q === 'good') {
      const up = Math.pow(2, Math.min(14, Math.floor((combo || 0) / 3)) / 24);
      V.tight(t, q === 'perfect' ? 1.25 : 1.05);
      osc('sine', 1250 * up * 1.48, t, 0.16, 0.12, sfxBus, { attack: 0.001 });
      if (q === 'perfect') {
        osc('sine', 2093 * up, t + 0.02, 0.14, 0.12, sfxBus);
        osc('sine', 3136 * up, t + 0.06, 0.2, 0.1, sfxBus);
      }
    } else {
      V.tight(t, 0.7);
      osc('sine', 420, t + 0.03, 0.16, 0.2, sfxBus, { to: 620, sweep: 0.14 });               // 띠용
    }
  }

  // 놓쳤을 때 사부의 한마디
  function miss() {
    if (!ctx) return;
    const t = ctx.currentTime + 0.002;
    osc('sawtooth', 520, t, 0.13, 0.16, sfxBus, { to: 330, sweep: 0.12, lp: 1800 });
  }

  // 콤보 고비를 넘길 때의 팡파르. n 이 클수록 높다
  function stinger(n) {
    if (!ctx) return;
    const t = ctx.currentTime + 0.005;
    const base = 60 + Math.min(4, n || 0) * 2;
    [0, 4, 7, 12].forEach((d, i) => {
      osc('sawtooth', mtof(base + d), t + i * 0.035, 0.3, 0.15, sfxBus, { lp: 3200 });
      osc('triangle', mtof(base + d + 12), t + i * 0.035, 0.2, 0.1, sfxBus);
    });
    nz(t, 0.5, 0.2, sfxBus, 'highpass', 6000);
  }

  // 콤보가 끊길 때 내려앉는 소리
  function drop() {
    if (!ctx) return;
    const t = ctx.currentTime + 0.002;
    osc('sawtooth', 620, t, 0.26, 0.2, sfxBus, { to: 110, sweep: 0.24, lp: 1500 });
  }

  // 메뉴 소리
  function ui(name) {
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime + 0.002;
    if (name === 'move') osc('sine', 880, t, 0.04, 0.25, sfxBus, { attack: 0.001 });
    else if (name === 'back') osc('sine', 520, t, 0.07, 0.3, sfxBus, { to: 390, attack: 0.001 });
    else { osc('sine', 784, t, 0.06, 0.3, sfxBus, { attack: 0.001 }); osc('sine', 1175, t + 0.06, 0.1, 0.3, sfxBus, { attack: 0.001 }); }
  }

  // 결과 화면 소리
  function jingle(name) {
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime + 0.05;
    const seq = name === 'great' ? [72, 76, 79, 84, 88] : name === 'clear' ? [67, 72, 76, 79] : [64, 60, 57];
    const step = name === 'fail' ? 0.2 : 0.11;
    seq.forEach((m, i) => {
      const f = mtof(m);
      osc('triangle', f, t + i * step, 0.28, 0.4, sfxBus);
      osc('sine', f * 2, t + i * step, 0.16, 0.14, sfxBus);
    });
    if (name === 'great') nz(t + seq.length * step, 0.5, 0.12, sfxBus, 'highpass', 6000);
  }

  MB.Audio = {
    ensure, resume, suspend, now, audible, setVol, setMute, V, hit, miss, drill, tighten, stinger, drop, ui, jingle, mtof,
    get ctx() { return ctx; },
    get vol() { return { bgm: vol.bgm, sfx: vol.sfx }; }
  };
})(window);
