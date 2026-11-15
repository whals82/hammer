/* 못박자! — 플레이 화면
 * 박자 시계(오디오 시계 기준), 소리 예약, 판정, 그림 움직임과 타격 연출을 맡는다.
 *
 * 시간 축: 박 0 = 세기 시작. 0–4박은 "하나 둘 셋 넷", 그 뒤로 세트마다 8박(듣기 4 + 치기 4).
 * 모든 위치는 "지금 몇 박인가"만으로 계산해서, 화면이 잠깐 밀려도 박자와 그림이 어긋나지 않는다.
 */
(function (global) {
  'use strict';
  const MB = (global.MB = global.MB || {});
  const A = global.MBArt;
  const C = A.C;
  const Au = MB.Audio;
  const NS = 'http://www.w3.org/2000/svg';
  const W = 1280, H = 720;

  // 배치 (시안과 같다)
  const L = { benchTop: 500, plankX: 236, plankW: 728, plankTop: 430, plankH: 70, beat0: 320, beatW: 190, perchX: 1010 };
  const PY = L.plankTop + 8;           // 못이 판자로 들어가는 높이
  const NAIL_TOP = PY - 68;            // 서 있는 못의 머리 윗면
  const bx = (b) => L.beat0 + L.beatW * b;
  const HOME_X = bx(-1) + 35;          // 망치가 차례를 기다리는 자리
  const PERCH = { x: L.perchX + 6, y: L.benchTop - 100 };
  const BIRD_S = 1;
  const HAM_S = 1.1;                   // 망치 크기
  const HAM_UP = -18, HAM_REST = -8;   // 치려고 들어 올린 각도, 기다릴 때의 각도
  const PIVOT_X = A.HAMMER_PIVOT.x * HAM_S, PIVOT_Y = A.HAMMER_PIVOT.y * HAM_S;
  // 작업대 위를 당겨 잡아 못·망치·사부를 크게 보여 준다. 화면 x = ZOOM × (x − VIEW_X). 위쪽 표시(점수·차례)는 당기지 않는다
  const ZOOM = 1.2, VIEW_X = 50, VIEW_Y = 46;
  const VIEW_T = `translate(${-VIEW_X * ZOOM} ${-VIEW_Y * ZOOM}) scale(${ZOOM})`;
  const CX = VIEW_X + 640 / ZOOM;      // 당겨 잡은 화면의 한가운데
  const SOFT = '#DCE7FF';

  // 판정 폭(초)과 점수
  const WIN = { perfect: 0.045, good: 0.1, bad: 0.16, screw: 0.07 };
  const PTS = { perfect: 100, good: 60, bad: 20, miss: 0 };
  const INTRO = 4;                     // 시작 전에 세는 박
  const OUTRO = 3;                     // 끝나고 결과 화면까지
  const MILES = [10, 20, 30, 50, 75, 100];        // 콤보 고비

  /* 게임마다 바뀌는 것: 놓이는 물건 그림, 도구 머리, 글자, 사부가 내는 소리, 내리치는 깊이.
   * 박자·판정·연출은 모든 게임이 같이 쓴다. 스테이지의 game 값으로 고른다 (없으면 nail) */
  const THEMES = {
    nail: {
      note: (x, py, s, o) => A.nail(x, py, s, o), tool: {}, call: '똑!', decoy: '끼릭', decoyHit: '나사!',
      sfx: (V, t, kind) => (kind === 'screw' ? V.ratchet(t, 1.1) : V.wood(t, 1.1)),
      depth: { perfect: PY - 12, good: PY - 22, bad: PY - 42, screw: PY - 34 }
    },
    tteok: {
      note: (x, py, s, o) => A.dough(x, py, s, o), tool: { head: 'mallet' }, call: '철퍽', decoy: '딱', decoyHit: '돌이다!',
      sfx: (V, t, kind) => (kind === 'screw' ? V.click(t, 1.2, true) : V.slap(t, 1.2)),
      depth: { perfect: PY - 13, good: PY - 17, bad: PY - 9, screw: PY - 34 }
    },
    stamp: {
      note: (x, py, s, o) => A.paper(x, py, s, o), tool: { head: 'stamp' }, call: '착!', decoy: '', decoyHit: '',
      sfx: (V, t) => V.flip(t, 1.2),
      depth: { perfect: PY - 50, good: PY - 50, bad: PY - 50, screw: PY - 50 }
    }
  };
  const HEAT_COLOR = [C.yellow, '#FF9F1C', C.coral];

  const lerp = (a, b, u) => a + (b - a) * u;
  const clamp01 = (u) => (u < 0 ? 0 : u > 1 ? 1 : u);
  const easeOut = (u) => 1 - (1 - u) * (1 - u);
  const easeIn = (u) => u * u;
  const easeIO = (u) => (u < 0.5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u));
  const pulse = (beat) => { const f = beat - Math.floor(beat); return f < 0.25 ? 1 - f * 4 : 0; };
  const turn = (u, a, b, from, to) => {
    let v = u <= a ? from : u >= b ? to : lerp(from, to, (u - a) / (b - a));
    if (Math.abs(v) < 0.06) v = v < 0 ? -0.06 : 0.06;
    return v;
  };

  let svg = null;
  let els = null;
  let st = null;

  /* ---------- 화면 층 ----------
   * 배경(#stage-bg)은 판이 시작될 때 한 번만 그리고, 움직이는 것만 #stage 에 둔다.
   * 흔들기·번쩍임·속도선은 CSS transform/opacity 로만 바꿔서 화면을 다시 그리지 않는다. 느린 휴대폰에서 끊기지 않게 하려는 것이다. */
  const Layers = (function () {
    let world, bg, lines, flash, cam = '', fl = '', lo = '';
    const grab = () => {
      if (world) return;
      world = document.getElementById('world');
      if (!world) {
        // 기기에 예전 index.html 이 남아 있으면 층이 없다. 그때는 여기서 만들어 #stage 를 감싼다
        const stage = document.getElementById('stage');
        const layer = (id, w) => {
          const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          s.id = id;
          s.setAttribute('viewBox', `0 0 ${w} 720`);
          s.setAttribute('width', w);
          s.setAttribute('height', 720);
          return s;
        };
        world = document.createElement('div');
        world.id = 'world';
        stage.parentNode.insertBefore(world, stage);
        world.appendChild(layer('stage-bg', 1280));
        world.appendChild(layer('stage-lines', 1280));
        world.appendChild(stage);
        const f = document.createElement('div');
        f.id = 'flash';
        world.parentNode.insertBefore(f, world.nextSibling);
      }
      bg = document.getElementById('stage-bg');
      lines = document.getElementById('stage-lines');
      flash = document.getElementById('flash');
      // 층의 크기와 모양은 여기서 정한다 (index.html·style.css 가 예전 것이어도 똑같이 겹친다)
      const box = (el, x, y, w, h, vb) => {
        el.setAttribute('viewBox', vb);
        el.setAttribute('width', w);
        el.setAttribute('height', h);
        return `position:absolute;left:${x}px;top:${y}px;display:block;`;
      };
      world.style.cssText = 'position:absolute;left:0;top:0;width:1280px;height:720px;transform-origin:640px 450px;will-change:transform;';
      // 배경은 사방으로 40px 더 크게 그려 둔다. 화면이 흔들려도 가장자리가 비지 않는다
      bg.style.cssText = box(bg, -40, -40, 1360, 800, '-40 -40 1360 800') + 'will-change:transform;';
      // 속도선은 흐릿해도 되니 절반 크기로 그려 두 배로 늘려 쓴다 (기억 공간 1/4)
      lines.style.cssText = box(lines, 0, 0, 1400, 360, '0 0 2800 720') + 'transform-origin:0 0;opacity:0;pointer-events:none;will-change:transform,opacity;';
      document.getElementById('stage').style.cssText = 'position:absolute;left:0;top:0;display:block;';
      flash.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;background:#fff;opacity:0;pointer-events:none;will-change:opacity;';
    };
    return {
      setBg(html) { grab(); bg.innerHTML = html; return bg; },
      setLines(html) { grab(); lines.innerHTML = html; lines.style.opacity = 0; lo = '0'; },
      cam(cx, cy, z) {
        const t = cx || cy || z !== 1 ? `translate3d(${cx.toFixed(1)}px,${cy.toFixed(1)}px,0) scale(${z.toFixed(4)})` : 'none';
        if (t !== cam) { cam = t; world.style.transform = t; }
      },
      flash(o) {
        const v = o < 0.005 ? '0' : o.toFixed(2);
        if (v !== fl) { fl = v; flash.style.opacity = v; }
      },
      lines(o, x) {
        const v = o < 0.01 ? '0' : o.toFixed(2);
        if (v !== lo) { lo = v; lines.style.opacity = v; }
        if (v !== '0') lines.style.transform = `translate3d(${x.toFixed(1)}px,0,0) scale(2)`;
      },
      reset() {
        grab();
        bg.innerHTML = '';
        lines.innerHTML = '';
        lines.style.opacity = 0;
        world.style.transform = 'none';
        flash.style.opacity = 0;
        cam = fl = lo = '';
      }
    };
  })();
  MB.Layers = Layers;
  // 화면이 느린 기기에서는 조각·불꽃·속도선을 줄인다 (main.js 가 화면 갱신 간격을 재서 켠다)
  MB.perf = MB.perf || { lite: false };

  /* ---------- 그림 요소 ---------- */
  function mk(html) {
    const e = document.createElementNS(NS, 'g');
    if (html) e.innerHTML = html;
    return e;
  }
  // 효과에 쓰는 시각(ms). 모의 실행 중에는 가짜 시각을 쓴다
  const nowMs = () => (st && st.simNow != null ? st.simNow : performance.now());
  function setT(el, t) { if (el._t !== t) { el._t = t; el.setAttribute('transform', t); } }
  function show(el, on) { if (el._on !== on) { el._on = on; el.style.display = on ? '' : 'none'; } }
  function setO(el, o) { const v = o.toFixed(2); if (el._o !== v) { el._o = v; el.style.opacity = v; } }
  const idText = (id, str, x, y, o) => A.text(str, x, y, o).replace('<text ', `<text id="${id}" `);

  function perchArt(x) {
    const t = L.benchTop;
    return `<ellipse cx="${x}" cy="${t + 3}" rx="44" ry="7" fill="url(#mb-g-shadow)"/>` +
      `<rect x="${x - 6}" y="${t - 88}" width="12" height="88" fill="${A.G.cyl}" stroke="${C.ink}" stroke-width="4"/>` +
      `<rect x="${x - 22}" y="${t - 9}" width="44" height="10" rx="4" fill="${C.steelDark}" stroke="${C.ink}" stroke-width="4"/>` +
      `<rect x="${x - 46}" y="${t - 100}" width="92" height="17" rx="8.5" fill="${A.G.handle}" stroke="${C.ink}" stroke-width="${A.SW}"/>` +
      `<path d="M${x - 36} ${t - 95} h58" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".6"/>`;
  }

  // 치기 차례에 뒤로 흘러가는 속도선
  function linesArt() {
    let g = '';
    for (let k = 0; k < 14; k++) {
      const x = (k * 197) % 1400, y = 130 + ((k * 83) % 250), len = 90 + ((k * 61) % 160);
      for (let c = 0; c < 2; c++) g += `<path d="M${x + c * 1400} ${y} h${len}" stroke="#fff" stroke-width="${k % 3 === 0 ? 7 : 4}" stroke-linecap="round"/>`;
    }
    return g;
  }

  // 콤보가 붙으면 망치 뒤에서 타오르는 불꽃
  function auraArt() {
    return `<path d="M-44 -4 C-62 -52 -50 -104 -30 -140 C-26 -116 -14 -122 -8 -178 C10 -150 22 -150 26 -190 C44 -150 56 -110 52 -64 C50 -38 46 -18 40 -4 Z" fill="${C.coral}" opacity=".92"/>` +
      `<path d="M-32 -6 C-44 -48 -36 -92 -22 -120 C-18 -100 -8 -104 -2 -146 C12 -122 22 -126 26 -150 C38 -118 44 -92 40 -56 C38 -34 36 -18 30 -6 Z" fill="${C.yellow}"/>`;
  }

  function hudArt(stage) {
    let g = '';
    g += A.pill(28, 22, 272, 58, C.white);
    g += A.text(stage.no + ' · ' + stage.name, 54, 62, { size: 30, fill: C.ink });
    g += `<rect x="34" y="96" width="200" height="12" rx="6" fill="${C.wallDot}"/>` +
      `<rect id="pl-prog" x="34" y="96" width="0" height="12" rx="6" fill="${C.yellow}"/>`;
    g += idText('pl-setno', '', 246, 109, { size: 20, fill: SOFT });
    const turnPill = (id, fill, label) => `<g id="${id}" style="display:none">` + A.pill(530, 20, 220, 66, fill) +
      A.text(label, 640, 66, { size: 40, fill: C.ink, anchor: 'middle' }) + `</g>`;
    g += `<g id="pl-turn">` + turnPill('pl-turn-ready', C.white, '준비') + turnPill('pl-turn-listen', C.white, '듣기') +
      turnPill('pl-turn-hit', C.yellow, '치기!') + `</g>`;
    g += `<g id="pl-practice" style="display:none">` + A.pill(766, 30, 96, 46, C.mint, { shadow: false }) +
      A.text('연습', 814, 62, { size: 26, fill: C.ink, anchor: 'middle' }) + `</g>`;
    g += A.text('점수', 1112, 56, { size: 22, fill: SOFT, anchor: 'end' }) +
      idText('pl-score', '0', 1250, 60, { size: 36, anchor: 'end', stroke: C.ink, sw: 7 });
    g += A.text('콤보', 1112, 104, { size: 22, fill: SOFT, anchor: 'end' }) +
      `<g id="pl-combo-g">` + idText('pl-combo', '0', 1250, 110, { size: 46, fill: C.yellow, anchor: 'end', stroke: C.ink, sw: 8 }) + `</g>`;
    g += idText('pl-hint', '', 640, 664, { size: 30, fill: SOFT, anchor: 'middle' });
    g += `<g id="pl-big-g" style="display:none">` + idText('pl-big', '', 640, 676, { size: 60, fill: C.yellow, anchor: 'middle', stroke: C.ink, sw: 11 }) + `</g>`;
    g += `<g data-act="pause" style="cursor:pointer">` + A.pill(1132, 640, 122, 54, C.white, { shadow: false }) +
      A.text('멈춤', 1193, 677, { size: 26, fill: C.ink, anchor: 'middle' }) + `</g>`;
    return g;
  }

  function build(stage) {
    // 움직이지 않는 것(벽, 작업대, 횃대)은 배경 층에 한 번만 그린다
    const bg = Layers.setBg(A.defs() + `<g transform="${VIEW_T}">` + A.wall(W, H, false, { cx: 600, cy: 300, rx: 520, ry: 260 }) +
      `<g opacity=".45">` + A.saw(96, 178, -10) + A.trySquare(690, 116, -6) + A.wrench(884, 150, 18) + `</g>` +
      `<rect id="pl-heat" x="-30" y="-30" width="${W + 60}" height="${L.benchTop + 30}" fill="#FF7A3D" opacity="0"/>` +
      A.bench(W, H, L.benchTop, { x0: L.beat0, step: L.beatW, cue: 3 }) + perchArt(L.perchX) + `</g>`);
    Layers.setLines(linesArt());
    svg.innerHTML = '';
    els = {};
    const add = (html) => { const e = mk(html); svg.appendChild(e); return e; };
    els.world = add('');
    els.world.setAttribute('transform', VIEW_T);
    const w = (html) => { const e = mk(html); els.world.appendChild(e); return e; };
    els.heat = bg.querySelector('#pl-heat');
    els.fxBack = w('');
    els.plank = w('');
    const sub = (html) => { const e = mk(html); els.plank.appendChild(e); return e; };
    sub(A.plankBack(L.plankX, L.plankTop, L.plankW));
    els.dents = sub('');
    els.nails = sub('');
    sub(A.plankFront(L.plankX, L.plankTop, L.plankW, L.plankH));
    els.bird = w('');
    els.birdPose = {};
    [['up', { wing: 'up' }], ['down', { wing: 'down' }], ['sit', {}], ['angry', { eye: 'angry' }], ['happy', { eye: 'shut', wing: 'up' }]].forEach((p) => {
      const e = mk(A.bird(0, 0, p[1]));
      els.bird.appendChild(e);
      els.birdPose[p[0]] = e;
    });
    els.hammer = w('');
    els.aura = mk(auraArt());
    els.aura.style.display = 'none';
    els.hammer.appendChild(els.aura);
    // 내리치는 순간에만 보이는 잔상
    els.swoosh = mk(`<path d="M-176 -246 Q-36 -252 38 -74" fill="none" stroke="#fff" stroke-width="22" stroke-linecap="round" opacity=".38"/>`);
    els.swoosh.setAttribute('transform', `scale(${HAM_S})`);
    els.swoosh.style.display = 'none';
    els.hammer.appendChild(els.swoosh);
    els.hammer.appendChild(mk(A.hammer(0, 0, Object.assign({ scale: HAM_S }, (THEMES[stage.game] || THEMES.nail).tool))));
    els.fx = w('');
    add(hudArt(stage));
    const q = (id) => svg.querySelector('#' + id);
    els.prog = q('pl-prog');
    els.setno = q('pl-setno');
    els.turnG = q('pl-turn');
    els.turn = { ready: q('pl-turn-ready'), listen: q('pl-turn-listen'), hit: q('pl-turn-hit') };
    els.practice = q('pl-practice');
    els.score = q('pl-score');
    els.combo = q('pl-combo');
    els.comboG = q('pl-combo-g');
    els.hint = q('pl-hint');
    els.big = q('pl-big');
    els.bigG = q('pl-big-g');
  }

  /* ---------- 효과 ---------- */
  function addFx(layer, html, life, anim) {
    const e = mk(html);
    layer.appendChild(e);
    st.fx.push({ e, born: nowMs(), life, anim });
    return e;
  }
  const rise = (px) => (e, u) => {
    e.setAttribute('transform', `translate(0 ${(-px * easeOut(u)).toFixed(1)})`);
    e.style.opacity = u < 0.55 ? 1 : (1 - (u - 0.55) / 0.45).toFixed(2);
  };
  const fade = (e, u) => { e.style.opacity = (1 - u).toFixed(2); };
  // 커졌다가 확 줄어들며 찍히는 글자
  const stampIn = (x, y) => (e, u) => {
    const k = u < 0.2 ? lerp(1.9, 1, easeOut(u / 0.2)) : 1 + 0.025 * Math.sin((u - 0.2) * 22);
    e.setAttribute('transform', `translate(${x} ${y}) scale(${k.toFixed(3)}) translate(${-x} ${-y})`);
    e.style.opacity = u < 0.78 ? 1 : ((1 - u) / 0.22).toFixed(2);
  };
  const pop = (x, y, k0, k1) => (e, u) => {
    const k = lerp(k0, k1, easeOut(u));
    e.setAttribute('transform', `translate(${x} ${y}) scale(${k.toFixed(3)}) translate(${-x} ${-y})`);
    e.style.opacity = u < 0.5 ? 1 : (1 - (u - 0.5) / 0.5).toFixed(2);
  };
  function runFx(now) {
    for (let i = st.fx.length - 1; i >= 0; i--) {
      const f = st.fx[i];
      const u = (now - f.born) / f.life;
      if (u >= 1) {
        if (f.keep) f.e.removeAttribute('transform'); else f.e.remove();
        st.fx.splice(i, 1);
      } else f.anim(f.e, u);
    }
  }
  function popup(str, x, y, o) {
    o = o || {};
    return addFx(els.fx, A.text(str, x, y, { size: o.size || 40, fill: o.fill || C.white, stroke: C.ink, sw: o.sw || 8, anchor: 'middle', rot: o.rot || 0 }),
      o.life || 520, rise(o.rise == null ? 34 : o.rise));
  }
  // 판정 글자: 망치와 못을 가리지 않게 못 바로 아래, 판자 앞면에 쾅 찍는다
  function label(str, x, fill, size) {
    return addFx(els.fx, A.text(str, x, PY + 54, { size, fill, stroke: C.ink, sw: 8, anchor: 'middle' }), 560, stampIn(x, PY + 54 - size * 0.35));
  }
  // 화면 가운데 크게 뜨는 글자
  function banner(str, fill, size, y, life) {
    size = size || 88;
    y = y || 250;
    return addFx(els.fx, A.text(str, CX, y, { size, fill: fill || C.yellow, stroke: C.ink, sw: Math.round(size / 6.5), anchor: 'middle' }),
      life || 760, stampIn(CX, y - size * 0.35));
  }
  // 튀는 나뭇조각
  function chips(x, n, power) {
    if (MB.perf.lite) n = Math.ceil(n / 3);
    const parts = [];
    let html = '';
    for (let k = 0; k < n; k++) {
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * 2.3;
      const sp = (220 + Math.random() * 320) * power;
      parts.push({ vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, rot: (Math.random() - 0.5) * 1000 });
      html += `<rect x="-6" y="-3" width="12" height="6" rx="1.5" fill="${k % 3 === 0 ? C.plankSide : C.plank}" stroke="${C.ink}" stroke-width="2"/>`;
    }
    const life = 540;
    const e = addFx(els.fx, html, life, (el, u) => {
      const tt = (u * life) / 1000;
      const kids = el.children;
      for (let k = 0; k < kids.length; k++) {
        const p = parts[k];
        kids[k].setAttribute('transform', `translate(${(x + p.vx * tt).toFixed(1)} ${(PY - 6 + p.vy * tt + 750 * tt * tt).toFixed(1)}) rotate(${(p.rot * tt).toFixed(0)})`);
      }
      el.style.opacity = u < 0.7 ? 1 : ((1 - u) / 0.3).toFixed(2);
    });
    return e;
  }
  // 사방으로 튀는 불꽃
  function sparks(x, y, n, color) {
    if (MB.perf.lite) return;
    let html = '';
    for (let k = 0; k < n; k++) html += `<path d="M0 0 h20" stroke="${color}" stroke-width="6" stroke-linecap="round"/>`;
    const a0 = Math.random() * 6.28;
    addFx(els.fx, html, 220, (el, u) => {
      const r = 26 + 74 * easeOut(u);
      const kids = el.children;
      for (let k = 0; k < kids.length; k++) {
        const a = a0 + (k / kids.length) * 6.283;
        kids[k].setAttribute('transform', `translate(${(x + Math.cos(a) * r).toFixed(1)} ${(y + Math.sin(a) * r * 0.8).toFixed(1)}) rotate(${((a * 180) / Math.PI).toFixed(0)}) scale(${(1 - u * 0.7).toFixed(2)} 1)`);
      }
      el.style.opacity = (1 - u * u).toFixed(2);
    });
  }
  // 퍼지는 고리
  function ring(x, y, r1, color) {
    addFx(els.fxBack, `<circle cx="${x}" cy="${y}" r="10" fill="none" stroke="${color}" stroke-width="8"/>`, 240, (el, u) => {
      const c = el.firstChild;
      c.setAttribute('r', (10 + (r1 - 10) * easeOut(u)).toFixed(1));
      c.setAttribute('stroke-width', (8 * (1 - u)).toFixed(1));
      el.style.opacity = (1 - u).toFixed(2);
    });
  }
  // 화면 흔들기와 확 당기기
  function kick(amp, zoom) {
    if (!st.cam || nowMs() - st.cam.at > 120 || amp >= st.cam.amp) st.cam = { at: nowMs(), amp, zoom: zoom || 0 };
  }

  /* ---------- 시계 ---------- */
  function clock(perfNow) {
    return st.virtual ? ((perfNow - st.v0) / 1000) * st.virtual : Au.audible(perfNow);
  }

  /* ---------- 소리 예약: 16분 한 칸씩 앞서서 넣는다 ---------- */
  function schedule() {
    if (!st || st.virtual || st.paused || st.done) return;
    const horizon = Au.now() + 0.14;
    const last = (st.endBeat + 1) * 4;
    while (st.nextSlot <= last) {
      const t = st.t0 + (st.nextSlot / 4) * st.spb;
      if (t >= horizon) break;
      scheduleSlot(st.nextSlot, t);
      st.nextSlot++;
    }
  }

  function scheduleSlot(slot, t) {
    const V = Au.V, spb = st.spb, beat = slot / 4, n = st.sets.length;
    const rel = beat - INTRO;
    const i = rel < 0 ? -1 : Math.min(n - 1, Math.floor(rel / 8));
    const lb = rel - i * 8;
    const set = i >= 0 ? st.sets[i] : null;
    const info = { hit: !!set && lb >= 4, energy: set ? set.energy : 0, tr: set ? set.tr : 0 };
    if (beat < st.endBeat) MB.Charts.bgm(st.stage, V, t, slot % 16, Math.floor(beat / 4), spb, info);
    else if (slot === st.endBeat * 4) MB.Charts.bgmEnd(st.stage, V, t, spb, info.tr);
    if (beat < INTRO) {                                   // 하나 둘 셋 넷
      if (slot % 4 === 0) V.click(t, 1, slot === 12);
      return;
    }
    if (!set || beat >= st.endBeat || lb >= 4) return;
    const notes = set.notes;                              // 사부가 쪼는 소리
    for (let k = 0; k < notes.length; k++) {
      const note = notes[k];
      if (note.t >= lb - 1e-9 && note.t < lb + 0.25 - 1e-9) {
        const tn = t + (note.t - lb) * spb;
        st.th.sfx(V, tn, note.kind);
      }
    }
    if (lb === 3) V.cue(t, st.stage.cue[0] + set.tr, 1.1);          // 자!
    else if (lb === 3.5) V.cue(t, st.stage.cue[1] + set.tr, 1.2);
  }

  /* ---------- 세트 ---------- */
  function botErr() {
    if (!st.bot || st.bot === 'none') return Infinity;
    if (st.bot === 'perfect') return 0;
    if (st.bot === 'good') return (Math.random() < 0.5 ? -1 : 1) * 0.07;
    if (st.bot === 'late') return 0.12;
    return (Math.random() * 2 - 1) * 0.15;                // sloppy
  }

  function finalize() {
    for (let k = 0; k < st.notes.length; k++) {
      const n = st.notes[k];
      if (!n.judged) judge(n, n.kind === 'screw' ? 'pass' : 'miss', 0, true);
    }
  }

  function enterSet(i) {
    finalize();
    els.nails.innerHTML = '';
    els.dents.innerHTML = '';
    st.cur = i;
    st.swapped = false;
    st.cued = false;
    const set = st.sets[i];
    const base = st.t0 + (INTRO + i * 8 + 4) * st.spb;    // 치기 마디가 시작하는 시각
    st.notes = set.notes.map((n) => {
      const e = mk('');
      e.style.display = 'none';
      els.nails.appendChild(e);
      return { t: n.t, kind: n.kind, set: i, x: bx(n.t), time: base + n.t * st.spb, el: e, shown: false, judged: null, botErr: botErr() };
    });
    if (set.practice) {
      els.setno.textContent = '연습';
    } else {
      els.setno.textContent = (set.scoredIdx + 1) + ' / ' + st.scoredSets + ' 세트';
      els.prog.setAttribute('width', Math.round((200 * (set.scoredIdx + 1)) / st.scoredSets));
      if (st.scoredSets > 4 && set.scoredIdx === st.scoredSets - 1) banner('마지막 판자!', C.coral, 76, 250, 900);
      else if (st.scoredSets > 6 && set.scoredIdx === Math.ceil(st.scoredSets * 0.75)) banner('막바지!', '#FF9F1C', 76, 250, 900);
    }
  }

  function showNail(n) {
    n.shown = true;
    n.el.innerHTML = st.th.note(n.x, PY, 'up', { kind: n.kind });
    n.el.style.display = '';
    st.fx.push({                                           // 톡 튀어나온다
      e: n.el, born: nowMs(), life: 150, keep: true,
      anim: (e, u) => {
        const k = u < 0.6 ? lerp(0.25, 1.2, u / 0.6) : lerp(1.2, 1, (u - 0.6) / 0.4);
        e.setAttribute('transform', `translate(${n.x} ${PY}) scale(1 ${k.toFixed(3)}) translate(${-n.x} ${-PY})`);
      }
    });
    popup(n.kind === 'screw' ? st.th.decoy : st.th.call, n.x + 46, NAIL_TOP - 40, { size: 36, life: 300, rise: 14, rot: -10 });
    ring(n.x, NAIL_TOP + 4, 34, '#fff');
  }

  /* ---------- 판정 ---------- */
  function breakCombo() {
    if (st.combo >= 10) {
      banner('콤보 끊김', SOFT, 54, 250, 620);
      if (!st.virtual) Au.drop();
    }
    st.combo = 0;
    st.heat = 0;
    st.hudDirty = true;
  }

  function judge(n, q, dt, quiet) {
    if (n.judged) return;
    n.judged = q;
    const scored = !st.sets[n.set].practice;
    const dir = dt < 0 ? 1 : -1;                          // 일찍 치면 못의 왼쪽을 맞아 오른쪽으로 기운다
    const now = nowMs();
    let pts = 0, keep = false;

    if (n.kind === 'screw') {
      if (q === 'pass') {
        pts = 100; keep = true;
        if (scored) st.counts.perfect++;
        if (!quiet) label('참았다', n.x, C.mint, 32);
      } else {
        if (scored) st.counts.miss++;
        n.el.innerHTML = st.th.note(n.x, PY, 'bad', { kind: 'screw', dir });
        label(st.th.decoyHit, n.x, C.coral, 44);
        sparks(n.x, PY - 30, 8, C.coral);
        kick(9, 0);
        st.angryUntil = now + 600;
        st.worryUntil = now + 500;
      }
    } else if (q === 'miss') {
      if (scored) st.counts.miss++; else st.ptotal++;
      if (!quiet) {
        label('놓침', n.x, SOFT, 32);
        st.angryUntil = now + 500;
        kick(3, 0);
        if (!st.virtual) Au.miss();
      }
    } else {
      pts = PTS[q];
      keep = q !== 'bad';
      if (scored) st.counts[q]++; else { st.ptotal++; if (keep) st.phit++; }
      n.el.innerHTML = st.th.note(n.x, PY, q, { dir });
      if (q === 'perfect') {
        addFx(els.fxBack, A.burst(n.x, PY - 24, 92, 46, 10, C.yellow, 0.2), 260, pop(n.x, PY - 24, 0.5, 1.12));
        ring(n.x, PY - 8, 120, '#fff');
        sparks(n.x, PY - 18, 9, '#FFE04A');
        chips(n.x, 9, 1.15);
        label('완벽!', n.x, '#FFE04A', 50);
        kick(8, 0.02);
        st.jolt = { at: now, amp: 7 };
        st.flashAt = now;
        st.happyUntil = now + 320;
      } else if (q === 'good') {
        addFx(els.fxBack, A.burst(n.x, PY - 24, 66, 34, 8, C.white, 0.2), 210, pop(n.x, PY - 24, 0.55, 1.06));
        chips(n.x, 5, 0.85);
        label('좋아', n.x, C.mint, 42);
        kick(5, 0.01);
        st.jolt = { at: now, amp: 4 };
      } else {
        chips(n.x, 3, 0.6);
        label('삐끗', n.x, C.coral, 42);
        kick(4, 0);
        st.worryUntil = now + 500;
      }
    }

    if (scored) {
      st.score += pts;
      if (keep) {
        st.combo++;
        if (st.combo > st.maxCombo) st.maxCombo = st.combo;
        st.comboPop = now;
        st.heat = st.combo >= 30 ? 2 : st.combo >= 10 ? 1 : 0;
        const m = MILES.indexOf(st.combo);
        if (m >= 0) {                                      // 콤보 고비
          banner(st.combo + ' 콤보!', HEAT_COLOR[st.heat], 96, 250, 820);
          sparks(CX, 220, 14, HEAT_COLOR[st.heat]);
          kick(9, 0.03);
          if (!st.virtual) Au.stinger(m);
        }
        st.hudDirty = true;
      } else breakCombo();
    }
  }

  function whiff(x) {
    if (!st.sets[st.cur].practice) breakCombo();
    st.whiffs++;
    els.dents.appendChild(mk(`<ellipse cx="${x.toFixed(1)}" cy="${PY + 1}" rx="22" ry="5.5" fill="${C.grain}" stroke="${C.ink}" stroke-width="2.5"/>`));
    label('헛스윙', x, SOFT, 32);
    chips(x, 2, 0.5);
    kick(3, 0);
    st.worryUntil = nowMs() + 400;
  }

  /* 누름. t = 그 순간의 박자 시계(초), 싱크 보정까지 뺀 값 */
  function press(t) {
    if (!st || st.paused || st.done) return;
    const rel = (t - st.t0) / st.spb - INTRO;
    const i = Math.floor(rel / 8);
    const lbHit = rel - i * 8 - 4;                        // 치기 마디 안에서 몇 박째인가
    // 화면이 밀려 진행이 늦었으면 누른 시각까지 먼저 따라잡는다
    if (i >= 0 && i < st.sets.length && i >= st.cur) {
      if (i > st.cur) enterSet(i);
      for (let k = 0; k < st.notes.length; k++) if (!st.notes[k].shown && lbHit + 4 >= st.notes[k].t) showNail(st.notes[k]);
    }
    const active = i === st.cur && i >= 0 && i < st.sets.length;

    let best = null, bestAbs = 9, first = null, screw = null, screwAbs = 9;
    for (let k = 0; k < st.notes.length; k++) {
      const n = st.notes[k];
      if (n.judged || !n.shown) continue;
      const ad = Math.abs(t - n.time);
      if (n.kind === 'screw') {
        if (ad <= WIN.screw && ad < screwAbs) { screw = n; screwAbs = ad; }
      } else if (ad <= WIN.bad) {
        if (!first) first = n;
        if (ad < bestAbs) { best = n; bestAbs = ad; }
      }
    }
    // 빽빽한 박자에서 꾸준히 조금 늦게 쳐도 순서대로 맞도록, 가장 앞선 못이 '좋아' 폭 안이면 그 못을 친 것으로 본다.
    // 폭을 벗어났으면 그 못은 건너뛴 것으로 보고 가장 가까운 못을 친다.
    if (first && first !== best && Math.abs(t - first.time) <= WIN.good) {
      best = first;
      bestAbs = Math.abs(t - first.time);
    }
    const overPlank = active && lbHit > -0.45 && lbHit < 3.3;

    let q;
    if (screw && (!best || screwAbs < bestAbs)) q = 'screw';
    else if (best) q = bestAbs <= WIN.perfect ? 'perfect' : bestAbs <= WIN.good ? 'good' : 'bad';
    else q = overPlank ? 'whiff' : 'tick';
    if (!st.virtual) Au.hit(q, st.combo);
    st.presses++;
    if (q === 'tick') return;                             // 내 차례가 아닐 때는 벌점 없이 넘어간다

    const x = bx(lbHit);
    const depth = q === 'whiff' ? PY - 3 : st.th.depth[q];
    st.strike = { at: nowMs(), x, depth };
    // 내리치는 궤적
    addFx(els.fx, `<path d="M${(x + 8).toFixed(1)} ${NAIL_TOP - 150} Q${(x + 78).toFixed(1)} ${NAIL_TOP - 84} ${(x + 30).toFixed(1)} ${depth - 34}" fill="none" stroke="#fff" stroke-width="13" stroke-linecap="round" opacity=".7"/>`, 130, fade);

    if (q === 'screw') judge(screw, 'screw', t - screw.time);
    else if (best) {
      for (let k = 0; k < st.notes.length; k++) {         // 건너뛴 못은 놓침
        const n = st.notes[k];
        if (!n.judged && n.shown && n.kind !== 'screw' && n.time < best.time) judge(n, 'miss', 0);
      }
      judge(best, q, t - best.time);
    } else whiff(x);
  }

  /* ---------- 진행 ---------- */
  function advance(beat, t) {
    const n = st.sets.length;
    const rel = beat - INTRO;

    if (beat >= 0 && beat < INTRO) {                      // 하나 둘 셋 넷
      const k = Math.floor(beat);
      if (k > st.counted) {
        st.counted = k;
        banner(['하나', '둘', '셋', '넷'][k], k === 3 ? C.yellow : C.white, 110, 350, Math.min(640, st.spb * 900));
        kick(3, 0.012);
      }
    }
    const i = Math.floor(rel / 8);
    if (rel >= 0 && i < n && i !== st.cur) enterSet(i);
    if (rel >= n * 8 && st.cur < n) {
      finalize();
      st.cur = n;
      banner('끝!', C.yellow, 130, 350, 1000);
      sparks(CX, 310, 16, C.yellow);
      kick(10, 0.03);
    }
    if (st.cur < 0 || st.cur >= n) return;

    const lb = rel - st.cur * 8;
    if (!st.cued && lb >= 3 && lb < 4) {                  // "자!" — 내 차례
      st.cued = true;
      banner('내 차례!', C.yellow, 70, 250, 560);
      kick(4, 0.012);
    }
    for (let k = 0; k < st.notes.length; k++) {
      const note = st.notes[k];
      if (!note.shown) {
        if (lb >= note.t) showNail(note);
        continue;
      }
      if (note.judged) continue;
      if (st.bot && note.kind !== 'screw' && t >= note.time + note.botErr) {
        press(note.time + note.botErr);
        continue;
      }
      if (t > note.time + (note.kind === 'screw' ? WIN.screw : WIN.bad)) {
        judge(note, note.kind === 'screw' ? 'pass' : 'miss', 0);
      }
    }
  }

  /* ---------- 그리기 ---------- */
  function tipOrigin(tx, ty, aDeg) {
    const a = (aDeg * Math.PI) / 180;
    const T = A.BEAK_TIP;
    return [tx - BIRD_S * (T.x * Math.cos(a) - T.y * Math.sin(a)), ty - BIRD_S * (T.x * Math.sin(a) + T.y * Math.cos(a))];
  }
  function peck(notes, lb) {
    let p = 0;
    for (let k = 0; k < notes.length; k++) {
      const d = Math.abs(lb - notes[k].t);
      if (d < 0.17) p = Math.max(p, 1 - d / 0.17);
    }
    return p * p * (3 - 2 * p);
  }

  function draw(beat, now) {
    const n = st.sets.length;
    const rel = beat - INTRO;
    let i = Math.floor(rel / 8);
    if (i < -1) i = -1;
    if (i > n) i = n;
    const lb = rel - i * 8;                                // 세트 안의 박: 듣기 0–4, 치기 4–8
    const inSet = i >= 0 && i < n;
    const set = inSet ? st.sets[i] : null;
    const hitPhase = inSet && lb >= 3 && lb < 7.25;
    const bp = pulse(beat);

    // 화면 전체: 박마다 꿈틀, 맞으면 흔들리고 확 당겨진다
    let cx = 0, cy = 0, z = 1;
    if (st.cam) {
      const d = now - st.cam.at;
      if (d > 260 || d < 0) st.cam = null;
      else {
        const k = (1 - d / 260) * (1 - d / 260);
        cy = st.cam.amp * k * Math.cos(d * 0.075);
        cx = st.cam.amp * 0.45 * k * Math.sin(d * 0.11);
        z += st.cam.zoom * k;
      }
    }
    Layers.cam(cx, cy, z);

    // 박자 섬광, 속도선, 콤보 열기 — 모두 다시 그리지 않고 겹쳐 놓은 층의 투명도만 바꾼다
    const lite = MB.perf.lite;
    const fl = now - st.flashAt;
    Layers.flash((lite ? 0 : 0.05 * bp * bp) + (fl >= 0 && fl < 120 ? 0.16 * (1 - fl / 120) : 0));
    const lineTarget = lite ? 0 : hitPhase ? 0.15 + 0.1 * st.heat : st.heat ? 0.07 * st.heat : 0;
    st.lineO += (lineTarget - st.lineO) * 0.2;
    Layers.lines(st.lineO, -((beat * L.beatW * 1.5) % 1400));
    if (st.heat !== st.heatBg) {                           // 벽 색은 콤보 단계가 바뀔 때만 다시 칠한다
      st.heatBg = st.heat;
      els.heat.setAttribute('opacity', st.heat ? 0.12 * st.heat : 0);
    }

    // 판자 교체: 다 친 판자는 오른쪽으로 빠지고 새 판자가 왼쪽에서 들어온다
    let px = 0, jy = 0;
    if (inSet && lb >= 7.25) {
      if (lb < 7.6) px = easeIn((lb - 7.25) / 0.35) * 1300;
      else {
        if (!st.swapped) {
          st.swapped = true;
          finalize();
          els.nails.innerHTML = '';
          els.dents.innerHTML = '';
        }
        px = -1300 * (1 - easeOut(clamp01((lb - 7.6) / 0.35)));
      }
    }
    if (st.jolt) {                                         // 맞은 판자가 덜컥
      const d = now - st.jolt.at;
      if (d > 200 || d < 0) st.jolt = null;
      else jy = st.jolt.amp * (1 - d / 200) * Math.cos(d * 0.05);
    }
    setT(els.plank, `translate(${px.toFixed(1)} ${jy.toFixed(1)})`);

    // 딱 사부
    const hoverY = NAIL_TOP - 44;
    const flap = Math.floor(now / 75) % 2 ? 'up' : 'down';
    const sit = () => {
      const angry = now < st.angryUntil, happy = now < st.happyUntil;
      return {
        pose: angry ? 'angry' : happy ? 'happy' : 'sit',
        x: PERCH.x + (angry ? 5 * Math.sin(now * 0.09) : 0),
        y: PERCH.y - 5 * bp - (happy ? 16 * ((st.happyUntil - now) / 320) : 0), a: 0, sx: -1
      };
    };
    const fly = (tipX, p) => {
      const a = lerp(44, 68, p);
      const o = tipOrigin(tipX, lerp(hoverY, NAIL_TOP - 2, p), a);
      return { pose: flap, x: o[0], y: o[1], a, sx: 1 };
    };
    let b;
    if (inSet && lb < 3) {                                 // 판자 위를 지나가며 쫀다
      b = fly(bx(lb), peck(set.notes, lb));
    } else if (inSet && lb < 4) {                          // 횃대로 돌아간다
      const u = easeIO(lb - 3), f = fly(bx(3), 0), s = sit();
      b = {
        pose: u > 0.93 ? s.pose : flap, x: lerp(f.x, s.x, u), y: lerp(f.y, s.y, u) - 50 * Math.sin(Math.PI * u),
        a: lerp(f.a, 0, u), sx: turn(u, 0.8, 0.93, 1, -1)
      };
    } else if (i < n - 1 && lb >= 7) {                     // 다음 세트 자리로 날아온다 (시작 전도 포함)
      const u = easeIO(lb - 7), s = sit();
      const f = fly(bx(0), peck(st.sets[i + 1].notes, lb - 8));
      b = {
        pose: u < 0.05 ? s.pose : flap, x: lerp(s.x, f.x, u), y: lerp(s.y, f.y, u) - 50 * Math.sin(Math.PI * u),
        a: lerp(0, f.a, u), sx: turn(u, 0.78, 0.92, -1, 1)
      };
    } else b = sit();
    for (const k in els.birdPose) show(els.birdPose[k], k === b.pose);
    setT(els.bird, `translate(${b.x.toFixed(1)} ${b.y.toFixed(1)}) scale(${(b.sx * BIRD_S).toFixed(3)} ${BIRD_S}) rotate(${b.a.toFixed(1)})`);

    // 망치: 기다릴 때는 조금 내려 두고, 신호 박에 들어 올리며 들어와서, 한 박에 한 칸씩 판자 위를 지나간다
    let hx = HOME_X, hy = NAIL_TOP, ha = HAM_REST;
    if (inSet && lb >= 3) {
      if (lb < 4) {                                        // 신호 박: 첫 못 자리에 닿을 때 딱 박자 속도가 되도록 속도를 붙인다
        const u = lb - 3, D = bx(0) - HOME_X;
        hx = HOME_X + (L.beatW - D) * u * u + (2 * D - L.beatW) * u;
        ha = lerp(HAM_REST, HAM_UP, easeIO(u));
      } else if (lb < 7) {                                 // 같은 속도로 판자 위를 지나간다
        hx = bx(lb - 4);
        ha = HAM_UP;
      } else {                                             // 훌쩍 뛰어 제자리로. 사부가 날아오기 전에 먼저 비킨다
        const u = clamp01((lb - 7) / 0.5);
        hx = lerp(bx(3), HOME_X, easeIO(u));
        hy -= 90 * Math.sin(Math.PI * u);
        ha = lerp(HAM_UP, HAM_REST, u);
      }
    }
    hy -= 9 * Math.abs(Math.sin(Math.PI * beat));
    let hitNow = false;
    const sk = st.strike;
    if (sk) {
      // 누른 뒤 처음 그리는 화면에서 바로 끝까지 내려간 모습을 보이고, 그때부터 시간을 잰다.
      // 화면이 느린 기기에서도 망치가 내려가다 마는 일이 없다
      if (!sk.seen) { sk.seen = true; sk.at = now; }
      const d = now - sk.at;
      if (d > 270 || d < 0) st.strike = null;
      else {
        const k = d < 110 ? 1 : 1 - (d - 110) / 160;
        ha = lerp(ha, 5, k);
        hy = lerp(hy, sk.depth, k);
        hx = lerp(hx, sk.x, k);
        hitNow = d < 110;
      }
    }
    show(els.swoosh, hitNow);
    show(els.aura, st.heat > 0);
    if (st.heat > 0) setT(els.aura, `scale(${(HAM_S * (1 + 0.05 * Math.sin(now / 37))).toFixed(3)} ${(HAM_S * (1 + 0.1 * st.heat + 0.1 * Math.sin(now / 45))).toFixed(3)})`);
    setT(els.hammer, `translate(${hx.toFixed(1)} ${hy.toFixed(1)}) rotate(${ha.toFixed(1)} ${PIVOT_X.toFixed(1)} ${PIVOT_Y.toFixed(1)})`);

    // 위쪽 표시
    const turnNow = !inSet ? (i < 0 ? 'ready' : 'none') : hitPhase ? 'hit' : (i === n - 1 && lb >= 7.25) ? 'none' : 'listen';
    if (turnNow !== st.turn) {
      st.turn = turnNow;
      st.turnAt = now;
      for (const k in els.turn) show(els.turn[k], k === turnNow);
    }
    const tp = now - st.turnAt;
    const tk = (tp >= 0 && tp < 180 ? 1 + 0.22 * (1 - tp / 180) : 1) + 0.03 * bp;
    setT(els.turnG, `translate(640 53) scale(${tk.toFixed(3)}) translate(-640 -53)`);

    const src = !inSet ? (i < 0 ? st.sets[0] : null) : (!hitPhase && lb >= 7.25) ? (i < n - 1 ? st.sets[i + 1] : null) : set;
    let hint = '';
    if (src) {
      if (src.cap) hint = hitPhase ? src.cap[1] : src.cap[0];
      else if ((st.stage.hints || 0) > src.scoredIdx) hint = hitPhase ? st.hitHint : '잘 듣고, 못 사이 간격을 기억하세요';
    }
    if (hint !== st.hint) { st.hint = hint; els.hint.textContent = hint; }
    show(els.practice, !!(src && src.practice));
    if (st.hudDirty) {
      st.hudDirty = false;
      els.score.textContent = st.score.toLocaleString('en-US');
      els.combo.textContent = String(st.combo);
      els.big.textContent = st.combo + ' 콤보';
      if (st.heat !== st.heatShown) {
        st.heatShown = st.heat;
        els.combo.setAttribute('fill', HEAT_COLOR[st.heat]);
        els.big.setAttribute('fill', HEAT_COLOR[st.heat]);
      }
    }
    const cp = now - st.comboPop;
    const ck = cp >= 0 && cp < 160 ? 1 + 0.4 * (1 - cp / 160) : 1;
    setT(els.comboG, `translate(1250 110) scale(${ck.toFixed(3)}) translate(-1250 -110)`);
    const bigOn = !hint && st.combo >= 3;                  // 안내 문구가 없을 때는 그 자리에 콤보를 크게
    show(els.bigG, bigOn);
    if (bigOn) setT(els.bigG, `translate(640 656) scale(${(ck + 0.04 * bp + 0.1 * st.heat).toFixed(3)}) translate(-640 -656)`);
  }

  /* ---------- 시작과 끝 ---------- */
  function start(stage, opt) {
    opt = opt || {};
    stop();
    svg = document.getElementById('stage');
    build(stage);
    let scoredIdx = 0;
    const tapWord = opt.touch ? '화면을 톡' : '스페이스';           // 안내 문구의 {tap} 자리에 들어간다
    const sets = stage.sets.map((s) => {
      const o = typeof s === 'string' ? { p: s } : s;
      const practice = !!(o.practice || stage.tutorial);
      const cap = o.cap ? o.cap.map((c) => c.replace('{tap}', tapWord)) : null;
      return { practice, cap, notes: MB.Charts.parse(o.p), scoredIdx: practice ? -1 : scoredIdx++, before: scoredIdx };
    });
    sets.forEach((s) => {                                  // 스테이지가 진행될수록 배경음이 달아오른다
      const prog = scoredIdx > 1 ? Math.min(1, Math.max(0, (s.practice ? s.before : s.scoredIdx) / (scoredIdx - 1))) : 0;
      s.energy = Math.min(3, Math.floor(prog * 4));
      s.tr = !stage.tutorial && prog >= 0.75 ? 2 : 0;      // 막바지에는 한 음 올린다
    });
    st = {
      stage, sets, th: THEMES[stage.game] || THEMES.nail, spb: 60 / stage.bpm, virtual: opt.virtual || 0, bot: opt.bot || null, onEnd: opt.onEnd || null,
      offset: (opt.offset || 0) / 1000, endBeat: INTRO + sets.length * 8, scoredSets: scoredIdx,
      hitHint: opt.touch ? '망치가 못 위에 왔을 때 화면을 톡!' : '망치가 못 위에 왔을 때 스페이스!',
      cur: -1, notes: [], fx: [], nextSlot: 0, counted: -1, swapped: false, cued: false, done: false, paused: false,
      score: 0, max: 0, combo: 0, maxCombo: 0, counts: { perfect: 0, good: 0, bad: 0, miss: 0 }, phit: 0, ptotal: 0,
      whiffs: 0, presses: 0, strike: null, cam: null, jolt: null, heat: 0, heatShown: 0, lineO: 0, flashAt: -1e9,
      turn: '', turnAt: -1e9, hint: null, hudDirty: true, comboPop: -1e9,
      angryUntil: 0, happyUntil: 0, worryUntil: 0, pausedAt: 0, v0: 0, t0: 0, timer: 0
    };
    sets.forEach((s) => { if (!s.practice) st.max += 100 * s.notes.length; });
    if (st.virtual) { st.v0 = performance.now(); st.t0 = 0.3; }
    else st.t0 = Au.now() + 0.35;
    st.timer = setInterval(schedule, 25);                  // 화면이 밀려도 소리 예약은 끊기지 않게
    schedule();
    draw(-0.01, performance.now());
  }

  function stop() {
    if (st) clearInterval(st.timer);
    st = null;
  }

  function finish() {
    st.done = true;
    clearInterval(st.timer);
    const acc = st.max ? st.score / st.max : 0;
    const res = {
      stageId: st.stage.id, tutorial: !!st.stage.tutorial, score: st.score, max: st.max, acc,
      counts: Object.assign({}, st.counts), maxCombo: st.maxCombo, whiffs: st.whiffs,
      phit: st.phit, ptotal: st.ptotal, grade: acc >= 0.9 ? 'S' : acc >= 0.6 ? 'A' : 'F'
    };
    if (st.onEnd) st.onEnd(res);
  }

  function frame(now) {
    if (!st || st.paused || st.done) return;
    const t = clock(now);
    const beat = (t - st.t0) / st.spb;
    schedule();
    advance(beat, t);
    draw(beat, now);
    runFx(now);
    if (beat >= st.endBeat + OUTRO) finish();
  }

  function state() {
    if (!st) return null;
    const t = st.simNow != null ? st.simNow / 1000 : clock(performance.now());
    return {
      beat: +((t - st.t0) / st.spb).toFixed(2), endBeat: st.endBeat, cur: st.cur, sets: st.sets.length,
      score: st.score, max: st.max, combo: st.combo, maxCombo: st.maxCombo, counts: Object.assign({}, st.counts),
      presses: st.presses, whiffs: st.whiffs, done: st.done, paused: st.paused, fx: st.fx.length, nextSlot: st.nextSlot, heat: st.heat
    };
  }

  /* 모의 실행: 화면 갱신을 기다리지 않고 한 스테이지를 처음부터 끝까지 계산으로 돌린다 (자동 검증용).
   * opt.bot = perfect | good | late | sloppy | none,  opt.dt = 한 걸음(ms),  opt.until = 이 박에서 멈춰 세운다 */
  function simulate(stage, opt) {
    opt = opt || {};
    let result = null;
    start(stage, { virtual: 1, bot: opt.bot || 'perfect', onEnd: (r) => { result = r; } });
    st.v0 = 0;
    st.simNow = 0;
    const dt = opt.dt || 16.7;
    let frames = 0;
    while (st && !st.done && frames < 400000) {
      st.simNow += dt;
      frame(st.simNow);
      frames++;
      if (opt.until != null && st && !st.done && (st.simNow / 1000 - st.t0) / st.spb >= opt.until) {
        st.paused = true;
        return state();
      }
    }
    if (result) { result.frames = frames; result.presses = st ? st.presses : 0; }
    stop();
    return result;
  }

  function pause() {
    if (!st || st.paused || st.done) return false;
    st.paused = true;
    st.pausedAt = performance.now();
    if (!st.virtual) Au.suspend();
    return true;
  }

  function resume() {
    if (!st || !st.paused) return;
    const d = performance.now() - st.pausedAt;             // 멈춘 동안 효과 시계도 멈춘다
    st.fx.forEach((f) => { f.born += d; });
    if (st.strike) st.strike.at += d;
    if (st.cam) st.cam.at += d;
    if (st.jolt) st.jolt.at += d;
    st.angryUntil += d; st.happyUntil += d; st.worryUntil += d; st.comboPop += d; st.flashAt += d; st.turnAt += d;
    if (st.virtual) { st.v0 += d; st.paused = false; }
    else Au.resume().then(() => { if (st) st.paused = false; });
  }

  MB.Layout = { L, PY, NAIL_TOP, bx, W, H, perchArt };
  MB.Game = {
    start, stop, frame, pause, resume, simulate, state,
    /* 입력 이벤트의 timeStamp(performance.now 기준)를 받아 판정한다 */
    pressAt(perfTs) { if (st && !st.paused && !st.done) press(clock(perfTs) - st.offset); },
    get active() { return !!st && !st.done; },
    get paused() { return !!st && st.paused; },
    WIN, PTS
  };
})(window);
