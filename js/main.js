/* 못박자! — 화면 전환, 입력, 저장, 앱 설치 */
(function (global) {
  'use strict';
  const MB = global.MB;
  const Au = MB.Audio, UI = MB.UI, Game = MB.Game;
  // 게임마다 엔진이 다르다: 못 박기 계열은 game.js, 떡방아와 의자(드릴)는 game2.js
  const engineOf = (stage) => (stage.game === 'pound' || stage.game === 'drill' || stage.game === 'stamp' ? MB.Game2 : Game);
  let G = Game;                               // 지금 돌고 있는 엔진

  const KEY = 'motbakja.v1';
  const HIT_KEYS = { Space: 1, Enter: 1, NumpadEnter: 1, KeyZ: 1, KeyX: 1, KeyC: 1, KeyD: 1, KeyF: 1, KeyJ: 1, KeyK: 1, ArrowDown: 1, ArrowUp: 1 };

  const params = new URLSearchParams(location.search);
  const TEST = params.has('test');           // 자동 검증용: 창이 가려져도 멈추지 않고, 앱 저장 기능을 끈다
  const FORCE_MUTE = (TEST && !params.has('sound')) || params.has('mute');
  if (FORCE_MUTE) Au.setMute(true);
  const TOUCH = !!(global.matchMedia && global.matchMedia('(pointer: coarse)').matches);
  const STANDALONE = !!((global.matchMedia && (global.matchMedia('(display-mode: standalone)').matches ||
    global.matchMedia('(display-mode: fullscreen)').matches)) || global.navigator.standalone);

  /* ---------- 저장 ---------- */
  const store = { best: {}, offset: 0, bgm: 0.7, sfx: 0.9, tutorial: false, muted: false };
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
    if (saved && typeof saved === 'object') Object.assign(store, saved);
    if (!store.best || typeof store.best !== 'object') store.best = {};
  } catch (e) { /* 저장을 못 쓰는 환경이면 기록 없이 논다 */ }
  if (store.muted) Au.setMute(true);          // 소리 끄기를 골라 두었으면 그대로
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { /* 무시 */ }
  }

  let screen = 'title';
  let modal = null;                           // null | 'pause' | 'settings' | 'calib'
  let curStage = null;
  let lastResult = null;
  let installEvt = null;                      // 브라우저가 "설치할 수 있다"고 알려 준 것
  let wake = null;                            // 화면 꺼짐 방지

  const appEl = document.getElementById('app');
  const frameEl = document.getElementById('frame');

  /* ---------- 앱처럼: 전체 화면, 가로 고정, 화면 켜 두기 ---------- */
  function goFullscreen() {
    const el = document.documentElement;
    try {
      const p = el.requestFullscreen ? el.requestFullscreen({ navigationUI: 'hide' }) : el.webkitRequestFullscreen ? el.webkitRequestFullscreen() : null;
      const lock = () => { try { if (global.screen.orientation && global.screen.orientation.lock) global.screen.orientation.lock('landscape').catch(() => {}); } catch (e) { /* 지원 안 함 */ } };
      if (p && p.then) p.then(lock, () => {}); else lock();
    } catch (e) { /* 전체 화면을 못 쓰는 브라우저 */ }
  }
  function toggleFullscreen() {
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      try { (document.exitFullscreen || document.webkitExitFullscreen).call(document); } catch (e) { /* 무시 */ }
    } else goFullscreen();
  }
  function keepAwake(on) {
    try {
      if (on && !wake && navigator.wakeLock) {
        navigator.wakeLock.request('screen').then((w) => { wake = w; w.addEventListener('release', () => { wake = null; }); }, () => {});
      } else if (!on && wake) { wake.release(); wake = null; }
    } catch (e) { /* 지원 안 함 */ }
  }
  const titleOpt = () => ({ touch: TOUCH, canInstall: !!installEvt && !STANDALONE, muted: store.muted });

  /* ---------- 화면 ---------- */
  function goTitle() {
    G.stop();
    keepAwake(false);
    screen = 'title';
    modal = null;
    UI.showTitle(titleOpt());
  }
  function goSelect() {
    G.stop();
    keepAwake(false);
    screen = 'select';
    modal = null;
    UI.clear();
    UI.showSelect(store);
  }
  function startStage(id, opt) {
    const stage = MB.Charts.stageById(id);
    if (!stage) return;
    G.stop();
    G = engineOf(stage);
    curStage = stage;
    screen = 'play';
    modal = null;
    UI.clear();
    Au.setVol(store.bgm, store.sfx);
    keepAwake(true);
    const go = () => {
      if (screen !== 'play' || curStage !== stage) return;
      G.start(stage, Object.assign({ offset: store.offset, onEnd: onStageEnd, touch: TOUCH }, opt || {}));
    };
    if (opt && opt.virtual) go(); else Au.resume().then(go);
  }
  function nextOf(stage) {
    const i = MB.Stages.indexOf(stage);
    return i >= 0 && i + 1 < MB.Stages.length ? MB.Stages[i + 1] : null;
  }
  function onStageEnd(res) {
    lastResult = res;
    screen = 'result';
    keepAwake(false);
    if (res.tutorial) {
      store.tutorial = true;
      save();
      UI.showTutorialEnd(res);
      Au.jingle('clear');
      return;
    }
    const prev = store.best[res.stageId];
    const better = !prev || res.acc > prev.acc;
    if (better) {
      store.best[res.stageId] = { acc: res.acc, grade: res.grade, combo: res.maxCombo };
      save();
    }
    UI.showResult(curStage, res, { newBest: better && !!prev, next: res.grade !== 'F' ? nextOf(curStage) : null });
    Au.jingle(res.grade === 'S' ? 'great' : res.grade === 'A' ? 'clear' : 'fail');
  }

  function pauseGame() {
    if (screen !== 'play' || modal) return;
    if (G.pause()) {
      modal = 'pause';
      UI.showPause(TOUCH);
    }
  }

  /* ---------- 단추 동작 ---------- */
  function act(name) {
    switch (name) {
      case 'start':
        Au.resume();
        Au.setVol(store.bgm, store.sfx);
        Au.ui('ok');
        if (TOUCH && !STANDALONE) goFullscreen();
        goSelect();                                          // 처음 켜도 바로 스테이지를 고른다 (연습은 첫 칸에 있다)
        break;
      case 'install':
        if (installEvt) {
          const ev = installEvt;
          installEvt = null;
          ev.prompt();
          if (ev.userChoice && ev.userChoice.then) ev.userChoice.then(() => { if (screen === 'title') UI.showTitle(titleOpt()); }, () => {});
        }
        break;
      case 'fullscreen': toggleFullscreen(); break;
      case 'mute':                             // 소리 전체 켜기/끄기
        store.muted = !store.muted;
        Au.setMute(store.muted || FORCE_MUTE);
        save();
        if (!store.muted) { Au.resume(); Au.ui('ok'); }
        if (modal === 'settings') UI.refreshSettings(store);
        else if (screen === 'title') UI.showTitle(titleOpt());
        break;
      case 'title': Au.ui('back'); goTitle(); break;
      case 'select': Au.ui('back'); goSelect(); break;
      case 'retry': Au.ui('ok'); startStage(curStage.id); break;
      case 'next': {
        const n = nextOf(curStage);
        Au.ui('ok');
        if (n) startStage(n.id); else goSelect();
        break;
      }
      case 'pause': pauseGame(); break;
      case 'resume': modal = null; UI.clear(true); G.resume(); break;
      case 'restart': startStage(curStage.id); break;
      case 'quit': goSelect(); break;
      case 'settings':
        if (modal) return;
        Au.resume();
        Au.setVol(store.bgm, store.sfx);
        modal = 'settings';
        UI.showSettings(store);
        break;
      case 'close': modal = null; UI.closeSettings(); Au.ui('back'); break;
      case 'off-': store.offset = Math.max(-100, store.offset - 5); save(); UI.refreshSettings(store); Au.ui('move'); break;
      case 'off+': store.offset = Math.min(300, store.offset + 5); save(); UI.refreshSettings(store); Au.ui('move'); break;
      case 'calib': modal = 'calib'; UI.calibStart(); break;
      case 'calib-retry': UI.calibStart(); break;
      case 'calib-apply':
        if (UI.calibResult != null) { store.offset = UI.calibResult; save(); }
        UI.calibStop();
        UI.refreshSettings(store);
        modal = 'settings';
        Au.ui('ok');
        break;
      case 'calib-cancel': UI.calibStop(); modal = 'settings'; break;
      default: break;
    }
  }

  /* ---------- 입력 ---------- */
  // 이벤트가 실제로 일어난 시각(performance.now 기준). 값이 이상한 브라우저에서는 지금 시각을 쓴다
  function stamp(e) {
    const n = performance.now();
    const t = e.timeStamp;
    return t > 0 && Math.abs(n - t) < 2000 ? t : n;
  }

  document.addEventListener('click', (e) => {
    const el = e.target.closest ? e.target.closest('[data-act],[data-stage]') : null;
    if (el) {
      if (el.dataset.stage) {
        if (!el.classList.contains('locked')) { Au.ui('ok'); startStage(el.dataset.stage); }
      } else act(el.dataset.act);
      return;
    }
    if (screen === 'title' && !modal) act('start');
  });

  document.addEventListener('input', (e) => {
    if (e.target.id === 'set-bgm') store.bgm = e.target.value / 100;
    else if (e.target.id === 'set-sfx') store.sfx = e.target.value / 100;
    else return;
    Au.setVol(store.bgm, store.sfx);
    UI.refreshSettings(store);
    save();
    if (e.target.id === 'set-sfx') Au.ui('move');
  });

  frameEl.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (modal === 'calib') {
      if (!e.target.closest('button')) { e.preventDefault(); UI.calibTap(stamp(e)); }
      return;
    }
    if (screen !== 'play' || modal) return;
    if (e.target.closest('[data-act]')) return;
    e.preventDefault();
    G.pressAt(stamp(e));
  });

  global.addEventListener('keydown', (e) => {
    const c = e.code;
    if (e.repeat) {
      if (screen === 'play' && HIT_KEYS[c]) e.preventDefault();
      return;
    }
    if (modal === 'calib') {
      if (HIT_KEYS[c]) { e.preventDefault(); UI.calibTap(stamp(e)); }
      else if (c === 'Escape') act('calib-cancel');
      return;
    }
    if (modal === 'settings') {
      if (c === 'Escape') act('close');
      return;
    }
    if (modal === 'pause') {
      if (c === 'Escape' || c === 'KeyP' || c === 'Enter' || c === 'Space') { e.preventDefault(); act('resume'); }
      else if (c === 'KeyR') act('restart');
      else if (c === 'KeyQ') act('quit');
      return;
    }
    if (screen === 'play') {
      if (c === 'Escape' || c === 'KeyP') { e.preventDefault(); pauseGame(); }
      else if (HIT_KEYS[c]) { e.preventDefault(); G.pressAt(stamp(e)); }
      return;
    }
    if (screen === 'title') {
      if (c === 'Enter' || c === 'Space' || c === 'NumpadEnter') { e.preventDefault(); act('start'); }
      return;
    }
    if (screen === 'select') {
      if (c === 'Escape') act('title');
      else if (UI.selectKey(c)) e.preventDefault();
      return;                                 // 엔터·스페이스는 초점이 있는 카드가 받는다
    }
    if (screen === 'result') {
      if (c === 'Enter' || c === 'Space' || c === 'NumpadEnter') { e.preventDefault(); act(UI.primary); }
      else if (c === 'KeyR') act('retry');
      else if (c === 'Escape') act('select');
    }
  });

  // 떼는 순간도 판정하는 게임(의자 드릴)을 위해 손을 뗀 시각을 넘긴다
  function letGo(e) {
    if (screen === 'play' && !modal && G.releaseAt) G.releaseAt(stamp(e));
  }
  global.addEventListener('keyup', (e) => { if (HIT_KEYS[e.code]) letGo(e); });
  global.addEventListener('pointerup', letGo);
  global.addEventListener('pointercancel', letGo);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { if (!TEST) pauseGame(); }
    else if (screen === 'play' && !modal) keepAwake(true);   // 돌아오면 화면 켜 두기를 다시 건다
  });
  // 손가락 동작으로 화면이 움직이거나 커지지 않게
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('dblclick', (e) => e.preventDefault());
  document.addEventListener('touchmove', (e) => { if (!e.target.closest || !e.target.closest('input')) e.preventDefault(); }, { passive: false });

  /* ---------- 앱 설치 ---------- */
  global.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    installEvt = e;
    if (screen === 'title' && !modal) UI.showTitle(titleOpt());
  });
  global.addEventListener('appinstalled', () => {
    installEvt = null;
    if (screen === 'title' && !modal) UI.showTitle(titleOpt());
  });
  // 한 번 열어 두면 인터넷이 없어도 켜지도록 파일을 저장해 둔다 (검증 모드와 파일 직접 열기에서는 끈다)
  if ('serviceWorker' in navigator && !TEST && /^https?:$/.test(location.protocol)) {
    global.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
  }

  /* ---------- 화면 맞춤과 반복 ---------- */
  function fit() {
    const r = appEl.getBoundingClientRect();
    // 휴대폰을 세로로 들고 있으면 게임을 90도 돌려 그린다. 화면 회전 잠금이 켜져 있어도 폰만 눕히면 가로 화면이 된다
    const rot = TOUCH && r.height > r.width;
    const vw = rot ? r.height : r.width, vh = rot ? r.width : r.height;
    const k = Math.min(vw / 1280, vh / 720) || 1;
    frameEl.style.transform = `translate(${(r.width / 2).toFixed(1)}px, ${(r.height / 2).toFixed(1)}px)` +
      (rot ? ' rotate(90deg)' : '') + ` scale(${k.toFixed(4)}) translate(-640px, -360px)`;
  }
  global.addEventListener('resize', fit);
  global.addEventListener('orientationchange', () => setTimeout(fit, 200));

  // 검증 모드에서는 창이 가려져 화면 갱신이 멈춰도 돌도록 타이머로 돌린다
  const nextFrame = TEST
    ? (fn) => setTimeout(() => fn(performance.now()), 16)
    : (fn) => requestAnimationFrame(fn);
  // 화면 갱신 간격을 재서, 계속 느리면(평균 30ms 넘게) 조각·불꽃·속도선을 줄이는 가벼운 모드로 바꾼다
  let lastFrame = 0, avgFrame = 16, slowFrames = 0;
  function loop(now) {
    if (screen === 'play') {
      const dt = now - lastFrame;
      if (!modal && dt > 0 && dt < 250) {
        avgFrame += (dt - avgFrame) * 0.06;
        slowFrames = avgFrame > 30 ? slowFrames + 1 : 0;
        if (slowFrames > 45 && !TEST) MB.perf.lite = true;
      }
      G.frame(now);
    } else if (screen === 'title') UI.titleFrame(now);
    lastFrame = now;
    nextFrame(loop);
  }

  /* 자동 검증과 손보기용 */
  MB.debug = {
    run: (id, opt) => startStage(id, opt),    // 예: MB.debug.run('s1', { bot: 'perfect' })
    sim: (id, opt) => engineOf(MB.Charts.stageById(id)).simulate(MB.Charts.stageById(id), opt),   // 화면 갱신 없이 계산으로만 한 판
    goTitle, goSelect, store, save, TOUCH, STANDALONE,
    get last() { return lastResult; },
    get screen() { return screen + (modal ? '/' + modal : ''); },
    get canInstall() { return !!installEvt; }
  };

  UI.init();
  fit();
  goTitle();
  nextFrame(loop);
})(window);
