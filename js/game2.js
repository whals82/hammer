/* 못박자! — 두 번째 엔진: 떡방아(pound)와 의자 만들기(drill)
 * 시계·소리 예약·점수 계산은 못 박기(js/game.js)와 같지만, 장면·도구·치는 방식이 다르다.
 *   pound: 할멈이 손으로 떡을 뒤집어 "철썩" 하면 한 박 뒤에 떡메를 내리친다. 손이 있을 때 치면 "아야!"
 *   drill: 사부가 부리로 북질한 길이만큼 버튼을 누르고 있다가 뗀다. 누른 순간과 뗀 순간을 둘 다 판정한다
 * 시간 축: 박 0 = 세기 시작, 0–4박은 "하나 둘 셋 넷".
 */
(function (global) {
  'use strict';
  const MB = (global.MB = global.MB || {});
  const A = global.MBArt;
  const C = A.C;
  const Au = MB.Audio;
  const NS = 'http://www.w3.org/2000/svg';
  const W = 1280, H = 720;

  const WIN = { perfect: 0.045, good: 0.1, bad: 0.16 };      // 누르는 순간의 판정 폭(초)
  const REL = { perfect: 0.06, good: 0.13, bad: 0.24 };      // 떼는 순간의 판정 폭: 조금 넉넉하다
  const PTS = { perfect: 100, good: 60, bad: 20, miss: 0 };
  const RANK = { perfect: 3, good: 2, bad: 1, miss: 0 };
  const INTRO = 4, OUTRO = 3;
  const MILES = [10, 20, 30, 50, 75, 100];
  const HEAT = [C.yellow, '#FF9F1C', C.coral];
  const SOFT = '#DCE7FF', SKIN = '#FFDDBF';

  const lerp = (a, b, u) => a + (b - a) * u;
  const clamp01 = (u) => (u < 0 ? 0 : u > 1 ? 1 : u);
  const easeOut = (u) => 1 - (1 - u) * (1 - u);
  const pulse = (beat) => { const f = beat - Math.floor(beat); return f < 0.25 ? 1 - f * 4 : 0; };

  let svg = null, els = null, st = null;

  function mk(html) { const e = document.createElementNS(NS, 'g'); if (html) e.innerHTML = html; return e; }
  const nowMs = () => (st && st.simNow != null ? st.simNow : performance.now());
  function setT(el, t) { if (el._t !== t) { el._t = t; el.setAttribute('transform', t); } }
  function show(el, on) { if (el._on !== on) { el._on = on; el.style.display = on ? '' : 'none'; } }
  function setO(el, o) { const v = o.toFixed(2); if (el._o !== v) { el._o = v; el.style.opacity = v; } }
  const idText = (id, str, x, y, o) => A.text(str, x, y, o).replace('<text ', `<text id="${id}" `);
  const tOf = (beat) => st.t0 + beat * st.spb;
  const STK = `stroke="${C.ink}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"`;

  /* ---------- 효과 (못 박기와 같은 손맛) ---------- */
  function addFx(layer, html, life, anim) {
    const e = mk(html);
    layer.appendChild(e);
    st.fx.push({ e, born: nowMs(), life, anim });
    return e;
  }
  function runFx(now) {
    for (let i = st.fx.length - 1; i >= 0; i--) {
      const f = st.fx[i], u = (now - f.born) / f.life;
      if (u >= 1) { f.e.remove(); st.fx.splice(i, 1); } else f.anim(f.e, u);
    }
  }
  const stampIn = (x, y) => (e, u) => {
    const k = u < 0.2 ? lerp(1.9, 1, easeOut(u / 0.2)) : 1 + 0.025 * Math.sin((u - 0.2) * 22);
    e.setAttribute('transform', `translate(${x} ${y}) scale(${k.toFixed(3)}) translate(${-x} ${-y})`);
    e.style.opacity = u < 0.78 ? 1 : ((1 - u) / 0.22).toFixed(2);
  };
  function label(str, x, y, fill, size) {
    return addFx(els.fx, A.text(str, x, y, { size, fill, stroke: C.ink, sw: Math.max(8, Math.round(size / 6)), anchor: 'middle' }), 560, stampIn(x, y - size * 0.35));
  }
  function banner(str, fill, size, y, life) {
    size = size || 88; y = y || 250;
    return addFx(els.fx, A.text(str, 640, y, { size, fill: fill || C.yellow, stroke: C.ink, sw: Math.round(size / 6.5), anchor: 'middle' }), life || 760, stampIn(640, y - size * 0.35));
  }
  function bits(x, y, n, power, fills) {                    // 튀는 조각
    if (MB.perf.lite) n = Math.ceil(n / 3);
    const parts = [];
    let html = '';
    for (let k = 0; k < n; k++) {
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * 2.3, sp = (220 + Math.random() * 320) * power;
      parts.push({ vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, rot: (Math.random() - 0.5) * 1000 });
      html += `<rect x="-7" y="-4" width="14" height="8" rx="3" fill="${fills[k % fills.length]}" stroke="${C.ink}" stroke-width="2"/>`;
    }
    const life = 540;
    addFx(els.fx, html, life, (el, u) => {
      const tt = (u * life) / 1000, kids = el.children;
      for (let k = 0; k < kids.length; k++) {
        const p = parts[k];
        kids[k].setAttribute('transform', `translate(${(x + p.vx * tt).toFixed(1)} ${(y + p.vy * tt + 750 * tt * tt).toFixed(1)}) rotate(${(p.rot * tt).toFixed(0)})`);
      }
      el.style.opacity = u < 0.7 ? 1 : ((1 - u) / 0.3).toFixed(2);
    });
  }
  function sparks(x, y, n, color) {
    if (MB.perf.lite) return;
    let html = '';
    for (let k = 0; k < n; k++) html += `<path d="M0 0 h20" stroke="${color}" stroke-width="6" stroke-linecap="round"/>`;
    const a0 = Math.random() * 6.28;
    addFx(els.fx, html, 220, (el, u) => {
      const r = 26 + 74 * easeOut(u), kids = el.children;
      for (let k = 0; k < kids.length; k++) {
        const a = a0 + (k / kids.length) * 6.283;
        kids[k].setAttribute('transform', `translate(${(x + Math.cos(a) * r).toFixed(1)} ${(y + Math.sin(a) * r * 0.8).toFixed(1)}) rotate(${((a * 180) / Math.PI).toFixed(0)}) scale(${(1 - u * 0.7).toFixed(2)} 1)`);
      }
      el.style.opacity = (1 - u * u).toFixed(2);
    });
  }
  function ring(x, y, r1, color) {
    addFx(els.fx, `<circle cx="${x}" cy="${y}" r="10" fill="none" stroke="${color}" stroke-width="8"/>`, 240, (el, u) => {
      const c = el.firstChild;
      c.setAttribute('r', (10 + (r1 - 10) * easeOut(u)).toFixed(1));
      c.setAttribute('stroke-width', (8 * (1 - u)).toFixed(1));
      el.style.opacity = (1 - u).toFixed(2);
    });
  }
  function kick(amp, zoom) {
    if (!st.cam || nowMs() - st.cam.at > 120 || amp >= st.cam.amp) st.cam = { at: nowMs(), amp, zoom: zoom || 0 };
  }

  /* ---------- 점수 ---------- */
  function breakCombo() {
    if (st.combo >= 10) { banner('콤보 끊김', SOFT, 54, 250, 620); if (!st.virtual) Au.drop(); }
    st.combo = 0;
    st.heat = 0;
    st.hudDirty = true;
  }
  function award(q, scored) {
    if (!scored) {                                         // 연습은 점수 없이 맞힌 수만 센다
      st.ptotal++;
      if (q === 'perfect' || q === 'good') st.phit++;
      return;
    }
    st.counts[q]++;
    st.score += PTS[q];
    if (q === 'perfect' || q === 'good') {
      st.combo++;
      if (st.combo > st.maxCombo) st.maxCombo = st.combo;
      st.comboPop = nowMs();
      st.heat = st.combo >= 30 ? 2 : st.combo >= 10 ? 1 : 0;
      const m = MILES.indexOf(st.combo);
      if (m >= 0) {
        banner(st.combo + ' 콤보!', HEAT[st.heat], 96, 250, 820);
        sparks(640, 220, 14, HEAT[st.heat]);
        kick(9, 0.03);
        if (!st.virtual) Au.stinger(m);
      }
      st.hudDirty = true;
    } else breakCombo();
  }
  const grade = (d, win) => (d <= win.perfect ? 'perfect' : d <= win.good ? 'good' : d <= win.bad ? 'bad' : null);
  function botErr() {
    if (!st.bot || st.bot === 'none') return Infinity;
    if (st.bot === 'perfect') return 0;
    if (st.bot === 'good') return (Math.random() < 0.5 ? -1 : 1) * 0.07;
    return (Math.random() * 2 - 1) * 0.15;
  }

  /* ---------- 위쪽 표시 ---------- */
  function hudArt(stage) {
    let g = A.pill(28, 22, 272, 58, C.white) + A.text(stage.no + ' · ' + stage.name, 54, 62, { size: 30, fill: C.ink });
    g += `<rect x="34" y="96" width="200" height="12" rx="6" fill="${C.ink}" opacity=".25"/><rect id="g2-prog" x="34" y="96" width="0" height="12" rx="6" fill="${C.yellow}"/>`;
    g += idText('g2-setno', '', 246, 109, { size: 20, fill: '#fff' });
    g += `<g id="g2-pill">` + A.pill(530, 20, 220, 66, C.white) + idText('g2-pill-t', '준비', 640, 66, { size: 40, fill: C.ink, anchor: 'middle' }) + `</g>`;
    g += `<g id="g2-practice" style="display:none">` + A.pill(766, 30, 96, 46, C.mint, { shadow: false }) + A.text('연습', 814, 62, { size: 26, fill: C.ink, anchor: 'middle' }) + `</g>`;
    g += A.text('점수', 1112, 56, { size: 22, fill: '#fff', anchor: 'end' }) + idText('g2-score', '0', 1250, 60, { size: 36, anchor: 'end', stroke: C.ink, sw: 7 });
    g += A.text('콤보', 1112, 104, { size: 22, fill: '#fff', anchor: 'end' }) +
      `<g id="g2-combo-g">` + idText('g2-combo', '0', 1250, 110, { size: 46, fill: C.yellow, anchor: 'end', stroke: C.ink, sw: 8 }) + `</g>`;
    g += idText('g2-hint', '', 640, 150, { size: 30, anchor: 'middle', stroke: C.ink, sw: 7 });
    g += `<g data-act="pause" style="cursor:pointer">` + A.pill(1132, 640, 122, 54, C.white, { shadow: false }) + A.text('멈춤', 1193, 677, { size: 26, fill: C.ink, anchor: 'middle' }) + `</g>`;
    return g;
  }
  function setPill(text, fill) {
    if (st.pill === text) return;
    st.pill = text;
    st.pillAt = nowMs();
    els.pillT.textContent = text;
    els.pillBg.setAttribute('fill', fill);
  }
  function drawHud(beat, now) {
    const bp = pulse(beat);
    let cx = 0, cy = 0, z = 1;                              // 화면 흔들기: 층을 통째로 옮겨서 다시 그리지 않는다
    if (st.cam) {
      const d = now - st.cam.at;
      if (d > 260 || d < 0) st.cam = null;
      else { const k = (1 - d / 260) * (1 - d / 260); cy = st.cam.amp * k * Math.cos(d * 0.075); cx = st.cam.amp * 0.45 * k * Math.sin(d * 0.11); z += st.cam.zoom * k; }
    }
    MB.Layers.cam(cx, cy, z);
    const fl = now - st.flashAt;
    MB.Layers.flash((MB.perf.lite ? 0 : 0.05 * bp * bp) + (fl >= 0 && fl < 120 ? 0.16 * (1 - fl / 120) : 0));
    const tp = now - st.pillAt;
    setT(els.pill, `translate(640 53) scale(${((tp >= 0 && tp < 180 ? 1 + 0.22 * (1 - tp / 180) : 1) + 0.03 * bp).toFixed(3)}) translate(-640 -53)`);
    if (st.hudDirty) {
      st.hudDirty = false;
      els.score.textContent = st.score.toLocaleString('en-US');
      els.combo.textContent = String(st.combo);
      if (st.heat !== st.heatShown) { st.heatShown = st.heat; els.combo.setAttribute('fill', HEAT[st.heat]); }
    }
    const cp = now - st.comboPop;
    setT(els.comboG, `translate(1250 110) scale(${(cp >= 0 && cp < 160 ? 1 + 0.4 * (1 - cp / 160) : 1).toFixed(3)}) translate(-1250 -110)`);
  }
  function setHint(s) { if (s !== st.hint) { st.hint = s; els.hint.textContent = s; } }
  function setProgress(done, total, practice) {
    const key = practice ? 'p' : done + '/' + total;
    if (key === st.progKey) return;
    st.progKey = key;
    els.setno.textContent = practice ? '연습' : done + ' / ' + total;
    if (!practice) els.prog.setAttribute('width', Math.round((200 * done) / Math.max(1, total)));
    show(els.practice, !!practice);
  }

  /* 박자 줄: 지금 마디의 반 박 8칸. cueIcon(x, 속임수인가) = 신호 칸 그림, hitIcon(x) = 내가 칠 칸 그림 */
  function strip(beat, cueIcon, hitIcon) {
    const rel = beat - INTRO, bi = Math.floor(rel / 4);
    const shown = Math.max(0, Math.min(st.bars.length - 1, bi));
    if (shown !== st.stripBar) {
      st.stripBar = shown;
      const p = st.bars[shown].p;
      let g = '';
      for (let i = 0; i < 8; i++) {
        const x = 310 + i * 84, k = p[i], hit = i >= 2 && p[i - 2] === 'h';
        g += `<rect x="${x}" y="628" width="70" height="62" rx="16" fill="#fff" opacity="${k === 'h' || k === 'f' || hit ? 1 : 0.4}" stroke="${C.ink}" stroke-width="4"/>`;
        if (k === 'h' || k === 'f') g += cueIcon(x, k === 'f');
        if (hit) g += hitIcon(x);
      }
      els.strip.innerHTML = g;
    }
    const sl = bi === shown ? Math.floor((rel - bi * 4) * 2) : -1;
    show(els.slotHi, sl >= 0 && sl < 8);
    if (sl >= 0 && sl < 8) setT(els.slotHi, `translate(${310 + sl * 84} 0)`);
  }
  const SLOT_HI = `<rect x="0" y="622" width="70" height="74" rx="16" fill="none" stroke="${C.yellow}" stroke-width="9"/>`;
  const handIcon = (x, fake) => `<g opacity="${fake ? 0.4 : 1}"><circle cx="${x + 35}" cy="660" r="15" fill="${SKIN}" stroke="${C.ink}" stroke-width="4"/><circle cx="${x + 49}" cy="649" r="6.5" fill="${SKIN}" stroke="${C.ink}" stroke-width="3.5"/></g>`;
  const malletIcon = (x) => `<rect x="${x + 21}" y="640" width="28" height="40" rx="8" fill="${C.plank}" stroke="${C.ink}" stroke-width="4"/><path d="M${x + 21} 652 h28" stroke="${C.coral}" stroke-width="6"/>`;
  const docIcon = (x, fake) => `<rect x="${x + 22}" y="641" width="26" height="36" rx="4" fill="${fake ? C.yellow : '#fff'}" stroke="${C.ink}" stroke-width="4"/>` +
    (fake ? `<path d="M${x + 28} 652 l14 14 M${x + 42} 652 l-14 14" stroke="${C.coral}" stroke-width="4" stroke-linecap="round"/>` : `<path d="M${x + 28} 652 h14 M${x + 28} 660 h14" stroke="${C.benchEdge}" stroke-width="3" stroke-linecap="round"/>`);
  const stampIcon = (x) => `<circle cx="${x + 35}" cy="649" r="9" fill="${C.plank}" stroke="${C.ink}" stroke-width="4"/><rect x="${x + 20}" y="662" width="30" height="13" rx="4" fill="${C.coral}" stroke="${C.ink}" stroke-width="4"/>`;

  /* =====================================================================
   * 떡방아
   * 박자표: 한 마디를 반 박 8칸으로 적는다. h = 할멈 손(한 박 뒤에 친다), f = 속임수(치면 안 됨), - = 쉼.
   * 손 칸의 두 칸 뒤에는 손이 올 수 없다(그 자리가 내가 치는 박이다).
   * ===================================================================== */
  const POUND = {
    prepare(stage) {
      st.bars = stage.bars.map((b) => (typeof b === 'string' ? { p: b } : b));
      st.cues = [];
      st.notes = [];
      st.total = 0;
      st.bars.forEach((bar, i) => {
        if (!bar.practice) st.total++;
        for (let k = 0; k < 8; k++) {
          const ch = bar.p[k];
          if (ch !== 'h' && ch !== 'f') continue;
          const beat = INTRO + i * 4 + k / 2;
          const cue = { beat, fake: ch === 'f', done: false, note: null };
          st.cues.push(cue);
          if (ch === 'h') { cue.note = { beat: beat + 1, scored: !bar.practice, judged: null, err: botErr() }; st.notes.push(cue.note); }
        }
      });
      st.notes.forEach((n) => { if (n.scored) st.max += 100; });
      st.endBeat = INTRO + st.bars.length * 4;
      st.cueLo = 0;
      st.stripBar = -9;
      st.squishAt = -1e9;
      st.hitAt = -1e9;
      st.angryUntil = 0;
      st.strike = null;
    },

    build(w) {
      // 마당: 하늘과 구름, 언덕, 기와 담장, 흙바닥, 멍석 (움직이지 않으니 배경 층에)
      let bg = A.defs() + (`<defs><linearGradient id="g2-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6FC3FF"/><stop offset="1" stop-color="#D8F2FF"/></linearGradient>` +
        `<linearGradient id="g2-ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFEBBD"/><stop offset="1" stop-color="#F2C77A"/></linearGradient>` +
        `<pattern id="g2-tile" width="44" height="30" patternUnits="userSpaceOnUse"><path d="M0 4 a22 20 0 0 0 44 0" fill="none" stroke="#141E3C" stroke-width="3" opacity=".55"/></pattern></defs>` +
        `<rect x="-40" y="-40" width="${W + 80}" height="${H + 80}" fill="url(#g2-sky)"/>` +
        `<g fill="#fff" opacity=".92"><ellipse cx="250" cy="196" rx="92" ry="24"/><ellipse cx="300" cy="176" rx="54" ry="24"/><ellipse cx="1016" cy="232" rx="112" ry="26"/><ellipse cx="962" cy="212" rx="60" ry="24"/></g>` +
        `<ellipse cx="240" cy="470" rx="430" ry="200" fill="#63C58F"/><ellipse cx="1060" cy="480" rx="470" ry="180" fill="#4FB682"/>` +
        `<g fill="#3A9A69"><circle cx="96" cy="306" r="26"/><circle cx="138" cy="294" r="34"/><circle cx="182" cy="310" r="24"/><circle cx="1128" cy="322" r="32"/><circle cx="1176" cy="330" r="24"/></g>` +
        `<rect x="-40" y="362" width="1360" height="110" fill="#FFF3D6" ${STK}/>` +
        `<path d="M-40 398 H1320 M120 362 V398 M360 362 V398 M600 362 V398 M840 362 V398 M1080 362 V398 M0 398 V472 M240 398 V472 M480 398 V472 M720 398 V472 M960 398 V472 M1200 398 V472" stroke="${C.ink}" stroke-width="3" opacity=".3"/>` +
        `<rect x="-40" y="330" width="1360" height="40" rx="8" fill="#3D4F7A" ${STK}/><rect x="-40" y="333" width="1360" height="30" fill="url(#g2-tile)"/>` +
        `<path d="M-40 336 H1320" stroke="#fff" stroke-width="3" opacity=".3"/>` +
        `<rect x="-40" y="470" width="1360" height="300" fill="url(#g2-ground)"/><path d="M-40 470 H1320" ${STK}/>` +
        `<g fill="#C99646" opacity=".55"><ellipse cx="140" cy="524" rx="15" ry="4"/><ellipse cx="1090" cy="512" rx="18" ry="4.5"/><ellipse cx="1180" cy="600" rx="14" ry="4"/><ellipse cx="96" cy="640" rx="20" ry="5"/><ellipse cx="236" cy="684" rx="12" ry="3.5"/></g>` +
        `<ellipse cx="640" cy="590" rx="340" ry="48" fill="#F6C76A" ${STK}/><ellipse cx="640" cy="590" rx="304" ry="38" fill="none" stroke="${C.ink}" stroke-width="3" opacity=".22"/>` +
        `<path d="M350 590 H930 M410 610 H870 M410 570 H870" stroke="${C.ink}" stroke-width="3" opacity=".26"/>`);
      // 떡 할멈: 저고리(동정과 고름), 쪽 찐 머리와 비녀. 얼굴 표정만 따로 움직인다
      bg += (`<ellipse cx="338" cy="568" rx="132" ry="15" fill="url(#mb-g-shadow)"/>` +
        `<path d="M226 568 C226 480 270 450 338 450 C406 450 450 480 450 568 Z" fill="${A.G.grip}" ${STK}/>` +
        `<path d="M404 472 C432 492 447 522 450 568 H412 C414 530 412 500 404 472 Z" fill="#7E2323" opacity=".28"/>` +
        `<path d="M296 456 L338 506 L380 456" fill="none" stroke="${C.ink}" stroke-width="17" stroke-linecap="round" stroke-linejoin="round"/>` +
        `<path d="M296 456 L338 506 L380 456" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>` +
        `<path d="M338 508 q-26 20 -34 52 M338 508 q12 26 8 58" fill="none" stroke="${C.ink}" stroke-width="12" stroke-linecap="round"/>` +
        `<path d="M338 508 q-26 20 -34 52 M338 508 q12 26 8 58" fill="none" stroke="#8A5BE0" stroke-width="6" stroke-linecap="round"/>` +
        `<circle cx="338" cy="332" r="26" fill="${C.steel}" ${STK}/>` +
        `<path d="M296 330 L382 322" stroke="${C.ink}" stroke-width="9" stroke-linecap="round"/><path d="M298 330 L380 322.4" stroke="${C.yellow}" stroke-width="4" stroke-linecap="round"/>` +
        `<circle cx="338" cy="400" r="56" fill="${SKIN}" ${STK}/>` +
        `<path d="M284 392 C288 348 388 348 392 392 C360 372 316 372 284 392 Z" fill="${C.steel}" ${STK}/>` +
        `<path d="M306 366 q30 -10 64 0 M298 380 q14 -8 30 -10" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/>` +
        `<path d="M298 432 q4 6 0 12 M378 432 q-4 6 0 12" fill="none" stroke="${C.ink}" stroke-width="2.5" stroke-linecap="round" opacity=".35"/>` +
        `<ellipse cx="304" cy="424" rx="10" ry="6.5" fill="${C.coral}" opacity=".5"/><ellipse cx="372" cy="424" rx="10" ry="6.5" fill="${C.coral}" opacity=".5"/>`);
      els.faceOk = w(`<path d="M310 408 q10 -10 20 0 M346 408 q10 -10 20 0" fill="none" stroke="${C.ink}" stroke-width="5" stroke-linecap="round"/>` +
        `<path d="M328 430 q10 9 20 0" fill="none" stroke="${C.ink}" stroke-width="4.5" stroke-linecap="round"/>`);
      els.faceMad = w(`<path d="M308 398 l22 8 M368 398 l-22 8" stroke="${C.ink}" stroke-width="5" stroke-linecap="round"/>` +
        `<circle cx="320" cy="412" r="4.5" fill="${C.ink}"/><circle cx="356" cy="412" r="4.5" fill="${C.ink}"/>` +
        `<ellipse cx="338" cy="436" rx="9" ry="7" fill="${C.ink}"/>`);
      // 통나무 절구와 떡
      bg += (`<ellipse cx="640" cy="576" rx="156" ry="15" fill="url(#mb-g-shadow)"/>` +
        `<path d="M484 432 H796 L752 574 H528 Z" fill="${A.G.woodCyl}" ${STK}/>` +
        `<path d="M542 448 q-4 60 12 116 M602 454 q-6 60 4 114 M690 454 q8 58 -2 114 M744 448 q6 56 -14 116" fill="none" stroke="${C.woodDark}" stroke-width="2.4" stroke-linecap="round" opacity=".65"/>` +
        `<path d="M508 474 q132 16 264 0 M520 524 q120 14 240 0" fill="none" stroke="${C.woodDeep}" stroke-width="4" stroke-linecap="round" opacity=".6"/>` +
        `<ellipse cx="640" cy="432" rx="158" ry="29" fill="${A.G.wood}" ${STK}/><ellipse cx="640" cy="435" rx="130" ry="20" fill="#C08A3A"/><ellipse cx="640" cy="440" rx="116" ry="13" fill="#8F5F1E" opacity=".55"/>`);
      els.dough = w(`<path d="M540 430 C528 378 598 350 640 357 C694 348 754 380 740 430 C700 446 580 446 540 430 Z" fill="#FFFDF6" ${STK}/>` +
        `<path d="M548 428 C600 441 690 441 733 428 C731 414 724 402 714 394 C700 418 596 424 560 404 C552 412 548 420 548 428 Z" fill="#E6DAC0" opacity=".75"/>` +
        `<path d="M660 380 q26 -6 44 10 M588 388 q14 -10 30 -8" fill="none" stroke="${C.benchEdge}" stroke-width="5" stroke-linecap="round"/>`);
      // 할멈의 팔: 매 화면마다 다시 그린다
      els.arm = w(`<path fill="none" stroke="${C.ink}" stroke-width="36" stroke-linecap="round"/><path fill="none" stroke="${C.coral}" stroke-width="26" stroke-linecap="round"/><circle r="22" fill="${SKIN}" ${STK}/>`);
      // 떡메: 자루 끝(0,0)을 축으로 돈다. 쇠테를 두른 통나무 머리, 끈을 감은 자루
      els.mallet = w(`<rect x="-300" y="-14" width="332" height="28" rx="14" fill="${A.G.handle}" ${STK}/>` +
        `<path d="M-252 -6.5 H-104" stroke="#fff" stroke-width="3.5" stroke-linecap="round" opacity=".55"/>` +
        `<path d="M-14 -12 v24 M-36 -12 v24 M-58 -12 v24 M-80 -12 v24" stroke="#fff" stroke-width="7" stroke-linecap="round"/>` +
        `<rect x="-384" y="-70" width="108" height="174" rx="16" fill="${A.G.woodCyl}" ${STK}/>` +
        `<path d="M-368 -22 q9 44 0 76 M-348 -24 q11 50 0 80 M-312 -24 q-10 46 2 78 M-294 -22 q-8 40 0 74" fill="none" stroke="${C.woodDark}" stroke-width="2.4" stroke-linecap="round" opacity=".7"/>` +
        `<rect x="-389" y="-54" width="118" height="21" rx="5" fill="#3D4F7A" ${STK}/><rect x="-389" y="62" width="118" height="21" rx="5" fill="#3D4F7A" ${STK}/>` +
        `<path d="M-380 -47.5 h100 M-380 68.5 h100" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".35"/>` +
        `<rect x="-378" y="94" width="96" height="8" rx="4" fill="${C.woodDeep}" opacity=".4"/>` +
        `<g style="display:none"><path d="M-416 66 q-16 18 -6 42 M-244 66 q16 18 6 42" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round"/></g>`);
      els.hitMark = els.mallet.lastChild;                     // 내리치는 순간에만 보이는 충격선
      // 박자 줄: 지금 마디의 반 박 8칸
      els.strip = w('');
      els.slotHi = w(SLOT_HI);
      MB.Layers.setBg(bg);
    },

    slot(slot, t, beat) {                                   // 할멈 소리: 반 박마다 한 번 확인
      if (slot % 2) return;
      for (let i = 0; i < st.cues.length; i++) {
        const c = st.cues[i];
        if (c.beat === beat) { if (c.fake) Au.V.cue(t, 91, 0.7); else Au.V.slap(t, 1.3); }
        else if (c.beat > beat) break;
      }
    },

    /* 손이 떡 위에 얼마나 들어와 있는가 (0–1) */
    armIn(beat) {
      let v = 0;
      for (let i = st.cueLo; i < st.cues.length; i++) {
        const c = st.cues[i], u = beat - c.beat;
        if (u > 1.2) { if (i === st.cueLo) st.cueLo++; continue; }
        if (u < -0.4) break;
        let a;
        if (c.fake) a = u < 0 ? 0.65 * (1 + u / 0.3) : 0.65 * (1 - u / 0.22);
        else a = u < 0 ? 1 + u / 0.25 : u < 0.18 ? 1 : 1 - (u - 0.18) / 0.17;
        if (a > v) v = a;
      }
      return v;
    },

    judge(n, q) {
      n.judged = q;
      st.M.hitFx(n, q, nowMs());
      award(q, n.scored);
    },

    hitFx(n, q, now) {
      if (q === 'miss') {
        label('놓침', 640, 530, SOFT, 34);
        st.angryUntil = now + 500;
        if (!st.virtual) Au.miss();
      } else {
        st.hitAt = now;
        if (q === 'perfect') {
          ring(640, 392, 150, '#fff'); sparks(640, 380, 10, '#FFE04A'); bits(640, 380, 9, 1.1, ['#FFFDF6', '#FFF3D6']);
          label('완벽!', 640, 530, '#FFE04A', 56); kick(9, 0.022); st.flashAt = now;
        } else if (q === 'good') {
          bits(640, 380, 5, 0.85, ['#FFFDF6']); label('좋아', 640, 530, C.mint, 46); kick(5, 0.01);
        } else { label('삐끗', 640, 530, C.coral, 46); kick(4, 0); }
      }
    },

    press(t) {
      let best = null, bestAbs = 9, first = null;
      for (let i = 0; i < st.notes.length; i++) {
        const n = st.notes[i];
        if (n.judged) continue;
        const d = t - tOf(n.beat);
        if (d < -WIN.bad) break;
        const ad = Math.abs(d);
        if (ad <= WIN.bad) { if (!first) first = n; if (ad < bestAbs) { best = n; bestAbs = ad; } }
      }
      if (first && first !== best && Math.abs(t - tOf(first.beat)) <= WIN.good) { best = first; bestAbs = Math.abs(t - tOf(first.beat)); }
      st.strike = { at: nowMs() };
      st.presses++;
      if (best) {
        const q = grade(bestAbs, WIN);
        if (!st.virtual) Au.hit(q, st.combo);
        st.M.judge(best, q);
        return;
      }
      const beat = (t - st.t0) / st.spb;
      st.whiffs++;
      if (!st.M.wrong(beat)) {
        label('헛방', 640, 400, SOFT, 34);
        kick(3, 0);
        if (!st.virtual) Au.hit('whiff');
      }
      if (beat >= INTRO) breakCombo();
    },

    /* 쳐서는 안 될 때 쳤는가: 할멈 손이 떡 위에 있을 때 */
    wrong(beat) {
      if (POUND.armIn(beat) <= 0.45) return false;
      label('아야!', 430, 320, C.coral, 60);
      sparks(580, 396, 10, C.coral);
      kick(11, 0);
      st.angryUntil = nowMs() + 700;
      if (!st.virtual) { Au.hit('screw'); Au.miss(); }
      return true;
    },

    /* 신호가 나온 순간의 연출 */
    cueFx(c) {
      if (c.fake) label('훗', 500, 330, SOFT, 40);
      else { st.squishAt = nowMs(); label('철썩!', 520, 330, C.white, 46); ring(582, 396, 60, '#fff'); }
    },

    advance(beat, t) {
      for (let i = 0; i < st.cues.length; i++) {            // 철썩!
        const c = st.cues[i];
        if (c.done) continue;
        if (c.beat > beat) break;
        c.done = true;
        st.M.cueFx(c);
      }
      for (let i = 0; i < st.notes.length; i++) {
        const n = st.notes[i];
        if (n.judged) continue;
        const tn = tOf(n.beat);
        if (tn - t > 1) break;
        if (st.bot && t >= tn + n.err) { st.M.press(tn + n.err); continue; }
        if (t > tn + WIN.bad) st.M.judge(n, 'miss');
      }
      const bi = Math.floor((beat - INTRO) / 4);
      const bar = bi >= 0 && bi < st.bars.length ? st.bars[bi] : null;
      if (bar) {
        let done = 0;
        for (let i = 0; i <= bi; i++) if (!st.bars[i].practice) done++;
        setProgress(done, st.total, bar.practice);
      }
      setHint(bar && bar.cap ? bar.cap : '');
    },

    draw(beat, now) {
      const rel = beat - INTRO;
      strip(beat, handIcon, malletIcon);

      // 할멈의 팔
      const a = clamp01(POUND.armIn(beat)), e = a * a * (3 - 2 * a);
      const hx = lerp(470, 566, e), hy = lerp(512, 402, e);
      const d = `M414 502 Q${lerp(436, 486, e).toFixed(1)} ${lerp(498, 430, e).toFixed(1)} ${hx.toFixed(1)} ${hy.toFixed(1)}`;
      if (d !== st.armD) {
        st.armD = d;
        els.arm.children[0].setAttribute('d', d);
        els.arm.children[1].setAttribute('d', d);
        els.arm.children[2].setAttribute('cx', (hx + 16).toFixed(1));
        els.arm.children[2].setAttribute('cy', (hy - 6).toFixed(1));
      }
      const mad = now < st.angryUntil;
      show(els.faceOk, !mad);
      show(els.faceMad, mad);

      // 떡: 손이 뒤집거나 메가 내리치면 눌린다
      const sq = now - st.squishAt, hq = now - st.hitAt;
      const ky = 1 - (sq >= 0 && sq < 160 ? 0.1 * (1 - sq / 160) : 0) - (hq >= 0 && hq < 220 ? 0.26 * (1 - hq / 220) : 0);
      setT(els.dough, `translate(640 440) scale(${(2 - ky).toFixed(3)} ${ky.toFixed(3)}) translate(-640 -440)`);

      // 떡메: 칠 박이 다가오면 더 치켜들고, 누르면 내리친다
      let wind = 0;
      for (let i = 0; i < st.notes.length; i++) {
        const n = st.notes[i];
        if (n.judged) continue;
        const u = n.beat - beat;
        if (u > 0.7) break;
        if (u > 0) wind = Math.max(wind, 1 - u / 0.7);
      }
      let ang = 24 + 9 * wind + 2.5 * Math.abs(Math.sin(Math.PI * beat));
      let shut = false;
      if (st.strike) {
        // 누른 뒤 처음 그리는 화면에서 바로 끝까지 내려간 모습을 보이고, 그때부터 시간을 잰다 (느린 기기 대비)
        if (!st.strike.seen) { st.strike.seen = true; st.strike.at = now; }
        const dd = now - st.strike.at;
        if (dd > 280 || dd < 0) st.strike = null;
        else { const k = dd < 110 ? 1 : 1 - (dd - 110) / 170; ang = lerp(ang, 1.5, k); shut = dd < 110; }
      }
      show(els.hitMark, shut);
      setT(els.mallet, `translate(980 290) rotate(${ang.toFixed(1)})`);

      // 가운데 알림
      if (rel < 0) setPill('준비', C.white);
      else if (a > 0.5) setPill('기다려!', C.white);
      else if (wind > 0.25) setPill('쿵!', C.yellow);
      else setPill('…', C.white);
    },

    stopSound() {}
  };

  /* =====================================================================
   * 의자 만들기 (드릴)
   * 세트는 8박: 듣기 4박 + 누르기 4박.  d = [[시작 박, 길이], …]  길이는 0.5 / 1 / 2 박
   * ===================================================================== */
  const CHAIR = { x: 640, y: 412, s: 1.5 };                  // 다리 끝이 작업대 윗면(550)에 닿는다
  const SPOTS = [[-50, -152], [50, -152], [-58, -37], [58, -37], [-52, 38.5], [52, 38.5]]   // 의자 그림에서 나사가 박히는 자리
    .map((p) => [Math.round(CHAIR.x + p[0] * CHAIR.s), Math.round(CHAIR.y + p[1] * CHAIR.s)]);
  const RING = 2 * Math.PI * 40;
  const screwArt = (x, y, state) => {
    const cross = (r, rot) => `<g transform="rotate(${rot} ${x} ${y})"><path d="M${x - r} ${y} h${2 * r} M${x} ${y - r} v${2 * r}" stroke="#fff" stroke-width="4.5" stroke-linecap="round"/></g>`;
    const head = (r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${C.coral}" stroke="${C.ink}" stroke-width="4.5"/>`;
    if (state === 'perfect') return head(13) + cross(6, 0);
    if (state === 'good') return head(14) + cross(6, 24);
    if (state === 'early') return `<circle cx="${x}" cy="${y}" r="23" fill="#fff" stroke="${C.ink}" stroke-width="4.5"/>` + head(17) + cross(7, 40);
    if (state === 'late') return `<path d="M${x - 34} ${y - 12} l14 6 l-8 8 l16 4 M${x + 34} ${y + 14} l-14 -6 l8 -8 l-16 -4" fill="none" stroke="${C.ink}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>` + head(13) + cross(6, 0);
    return head(17) + cross(7, 0);
  };

  const DRILL = {
    prepare(stage) {
      st.sets = stage.sets.map((s) => ({ practice: !!s.practice, cap: s.cap || null, d: s.d }));
      st.notes = [];
      st.total = 0;
      let spot = 0;
      st.sets.forEach((set, i) => {
        if (!set.practice) st.total++;
        set.notes = set.d.map((d) => {
          const n = {
            set: i, s: d[0], len: d[1], spot: spot++ % SPOTS.length, b0: INTRO + i * 8 + 4 + d[0], b1: INTRO + i * 8 + 4 + d[0] + d[1],
            scored: !set.practice, state: 0, q0: null, judged: null, err: botErr(), called: 0
          };
          st.notes.push(n);
          return n;
        });
      });
      st.notes.forEach((n) => { if (n.scored) st.max += 100; });
      st.endBeat = INTRO + st.sets.length * 8;
      st.cur = -1;
      st.held = null;
      st.bp = { x: 1086, y: 450, a: 0 };
      st.dp = { x: 250, y: 470 };
      st.lastDraw = 0;
    },

    build(w) {
      // 공방 벽, 작업대, 횃대, 조립 중인 의자는 움직이지 않으니 배경 층에 그린다
      let bg = A.defs() + (`<defs><pattern id="g2-peg" width="48" height="48" patternUnits="userSpaceOnUse"><circle cx="24" cy="25.8" r="4.8" fill="#fff" opacity=".16"/><circle cx="24" cy="24" r="4.5" fill="#2A1A96" opacity=".5"/></pattern>` +
        `<linearGradient id="g2-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8475FF"/><stop offset="1" stop-color="#5343E2"/></linearGradient></defs>` +
        `<rect x="-40" y="-40" width="${W + 80}" height="${H + 80}" fill="url(#g2-wall)"/><rect x="-40" y="-40" width="${W + 80}" height="${H + 80}" fill="url(#g2-peg)"/>` +
        `<ellipse cx="640" cy="330" rx="470" ry="320" fill="url(#mb-glow)"/>` +
        `<rect x="-40" y="596" width="1360" height="170" fill="#3A2FA8"/><rect x="-40" y="600" width="1360" height="18" fill="#0B1230" opacity=".25"/>` +
        `<rect x="-40" y="550" width="1360" height="50" fill="${A.G.bench}" ${STK}/><rect x="-40" y="586" width="1360" height="12" fill="${C.benchEdge}"/><rect x="-40" y="553" width="1360" height="4" fill="#fff"/>`);
      bg += `<ellipse cx="1080" cy="553" rx="44" ry="7" fill="url(#mb-g-shadow)"/>` +
        `<rect x="1074" y="462" width="12" height="88" fill="${A.G.cyl}" stroke="${C.ink}" stroke-width="4"/><rect x="1058" y="541" width="44" height="10" rx="4" fill="${C.steelDark}" stroke="${C.ink}" stroke-width="4"/>` +
        `<rect x="1034" y="450" width="92" height="17" rx="8.5" fill="${A.G.handle}" ${STK}/>`;
      bg += A.chair(CHAIR.x, CHAIR.y, CHAIR.s);
      MB.Layers.setBg(bg);
      els.screws = SPOTS.map((p) => w(screwArt(p[0], p[1], 'new')));
      // 길이 고리: 바탕과 차오르는 띠
      els.gauge = w(`<circle r="40" fill="none" stroke="${C.ink}" stroke-width="16"/><circle r="40" fill="none" stroke="#fff" stroke-width="9"/>` +
        `<circle r="40" fill="none" stroke="${C.yellow}" stroke-width="9" stroke-dasharray="0 ${RING.toFixed(1)}" transform="rotate(-90)"/>`);
      els.gaugeArc = els.gauge.lastChild;
      // 나사가 도는 표시: 사부가 시범을 보일 때도, 내가 조일 때도 똑같이 돈다
      els.whirl = w(`<path d="M-54.5 -19.8 A58 58 0 0 1 -10.1 -57.1 M54.5 19.8 A58 58 0 0 1 10.1 57.1" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".9"/>`);
      // 전동 드릴: 날 끝이 (4,0). 꼬인 홈이 있는 날, 물림쇠, 모터 집(통풍구), 고무 손잡이와 방아쇠, 배터리
      els.drill = w(`<g><path d="M-264 -34 q-16 12 -4 30 M-272 30 q-18 8 -8 26" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round"/></g>` +
        `<path d="M-46 -6.5 H-5 L5 0 L-5 6.5 H-46 Z" fill="${A.G.steel}" ${STK}/>` +
        `<path d="M-38 -5 l8 10 M-27 -5 l8 10 M-16 -5 l8 10" stroke="${C.steelShade}" stroke-width="2.5"/>` +
        `<path d="M-90 -25 H-58 L-44 -12 V12 L-58 25 H-90 Z" fill="${A.G.steel}" ${STK}/>` +
        `<path d="M-81 -23 v46 M-71 -23 v46 M-61 -21 v42" stroke="${C.steelShade}" stroke-width="2.5"/>` +
        `<path d="M-200 40 L-218 146 H-140 L-128 40 Z" fill="#2E3D61" ${STK}/>` +
        `<path d="M-196 72 h54 M-200 92 h56 M-204 112 h58 M-207 130 h60" stroke="#1B2742" stroke-width="5" stroke-linecap="round"/>` +
        `<path d="M-128 46 q22 4 18 30 q-10 10 -22 6 Z" fill="${A.G.grip}" ${STK}/>` +
        `<rect x="-236" y="140" width="118" height="42" rx="11" fill="${A.G.mint}" ${STK}/>` +
        `<rect x="-233" y="160" width="112" height="9" fill="#1B2742" opacity=".5"/>` +
        `<circle cx="-216" cy="151" r="3.5" fill="#fff"/><circle cx="-204" cy="151" r="3.5" fill="#fff"/><circle cx="-192" cy="151" r="3.5" fill="#fff" opacity=".4"/>` +
        `<rect x="-246" y="-52" width="164" height="100" rx="32" fill="${A.G.mint}" ${STK}/>` +
        `<path d="M-212 -52 H-216 Q-246 -52 -246 -20 V16 Q-246 48 -216 48 H-212 Z" fill="#127A62" opacity=".45"/>` +
        `<rect x="-100" y="-36" width="18" height="68" rx="5" fill="#2E3D61" ${STK}/>` +
        `<path d="M-190 -14 h46 M-190 0 h46 M-190 14 h46" stroke="#127A62" stroke-width="6" stroke-linecap="round"/>` +
        `<rect x="-204" y="-42" width="86" height="8" rx="4" fill="#fff" opacity=".6"/>`);
      els.spin = els.drill.firstChild;
      // 딱 사부
      els.bird = w('');
      els.birdPose = {};
      [['up', { wing: 'up' }], ['down', { wing: 'down' }], ['sit', {}]].forEach((p) => {
        const e = mk(A.bird(0, 0, p[1]));
        els.bird.appendChild(e);
        els.birdPose[p[0]] = e;
      });
      // 누르고 있기 막대
      els.bar = w(`<rect x="330" y="632" width="620" height="40" rx="20" fill="${C.ink}"/><rect x="336" y="638" width="608" height="28" rx="14" fill="#2A2180"/>` +
        `<rect x="336" y="638" width="0" height="28" rx="14" fill="${C.yellow}"/>` +
        `<path d="M944 624 v56" stroke="#fff" stroke-width="5" stroke-linecap="round"/>` +
        A.pill(876, 584, 140, 42, C.coral, { shadow: false }) + A.text('여기서 떼기', 946, 613, { size: 22, fill: '#fff', anchor: 'middle' }) +
        A.text('누르고 있기', 250, 662, { size: 28, fill: '#E4DEFF', anchor: 'middle' }));
      els.barFill = els.bar.children[2];
    },

    slot(slot, t, beat) {                                   // 사부의 시범: 내 드릴과 똑같은 "위이잉", 다 조이면 "딱"
      const rel = beat - INTRO, i = Math.floor(rel / 8), lb = rel - i * 8;
      if (i < 0 || i >= st.sets.length || lb >= 4) return;
      const V = Au.V, notes = st.sets[i].notes;
      for (let k = 0; k < notes.length; k++) {
        const n = notes[k];
        if (n.s >= lb - 1e-9 && n.s < lb + 0.25 - 1e-9) V.whirr(t + (n.s - lb) * st.spb, n.len * st.spb - 0.03);
        const end = n.s + n.len;
        if (end >= lb - 1e-9 && end < lb + 0.25 - 1e-9) V.tight(t + (end - lb) * st.spb, 1.1);
      }
      if (lb === 3) V.cue(t, st.stage.cue[0], 1.1); else if (lb === 3.5) V.cue(t, st.stage.cue[1], 1.2);
    },

    setScrew(n, state) { els.screws[n.spot].innerHTML = screwArt(SPOTS[n.spot][0], SPOTS[n.spot][1], state); },

    finish(n, q, kind) {                                    // kind: perfect|good|early|late|miss
      n.state = 2;
      n.judged = q;
      if (st.held === n) st.held = null;
      if (!st.virtual) Au.drill(false);
      const p = SPOTS[n.spot], now = nowMs(), side = p[0] < 640 ? -1 : 1, lx = p[0] + side * 4, ly = p[1] - 62;
      DRILL.setScrew(n, kind === 'miss' ? 'new' : kind);
      if (q === 'perfect') {
        ring(p[0], p[1], 110, '#fff'); sparks(p[0], p[1], 9, '#FFE04A'); bits(p[0], p[1], 7, 1, [C.plank, C.plankSide]);
        label('완벽!', lx, ly, '#FFE04A', 50); kick(8, 0.02); st.flashAt = now;
      } else if (q === 'good') { bits(p[0], p[1], 4, 0.8, [C.plank]); label('좋아', lx, ly, C.mint, 42); kick(5, 0.01); }
      else if (q === 'bad') { label(kind === 'late' ? '쩍! 너무 오래' : '덜 조였다', lx, ly, C.coral, 36); kick(kind === 'late' ? 8 : 4, 0); }
      else { label('놓침', lx, ly, SOFT, 32); if (!st.virtual) Au.miss(); }
      if (!st.virtual && q !== 'miss') Au.tighten(q, st.combo);   // 시범과 같은 "딱"으로 끝난다
      award(q, n.scored);
    },

    press(t) {
      if (st.held) return;
      let best = null, bestAbs = 9;
      for (let i = 0; i < st.notes.length; i++) {
        const n = st.notes[i];
        if (n.state !== 0) continue;
        const d = t - tOf(n.b0);
        if (d < -WIN.bad) break;
        if (Math.abs(d) <= WIN.bad && Math.abs(d) < bestAbs) { best = n; bestAbs = Math.abs(d); }
      }
      st.presses++;
      if (!best) {
        st.whiffs++;
        label('헛돌았다', 640, 300, SOFT, 34);
        kick(3, 0);
        if (!st.virtual) Au.hit('whiff');
        if ((t - st.t0) / st.spb >= INTRO) breakCombo();
        return;
      }
      best.state = 1;
      best.q0 = grade(bestAbs, WIN);
      st.held = best;
      if (!st.virtual) Au.drill(true);
    },

    release(t) {
      const n = st.held;
      if (!n) return;
      const d = t - tOf(n.b1), q1 = grade(Math.abs(d), REL);
      if (!q1) return DRILL.finish(n, 'bad', d < 0 ? 'early' : 'late');
      const q = RANK[q1] < RANK[n.q0] ? q1 : n.q0;
      DRILL.finish(n, q, q === 'bad' ? (d < 0 ? 'early' : 'late') : q);
    },

    advance(beat, t) {
      const rel = beat - INTRO, i = Math.floor(rel / 8), lb = rel - i * 8;
      if (i >= 0 && i < st.sets.length && i !== st.cur) {   // 새 세트: 이번에 쓸 나사를 새로 꽂는다
        st.cur = i;
        st.sets[i].notes.forEach((n) => DRILL.setScrew(n, 'new'));
        let done = 0;
        for (let k = 0; k <= i; k++) if (!st.sets[k].practice) done++;
        setProgress(done, st.total, st.sets[i].practice);
      }
      const set = i >= 0 && i < st.sets.length ? st.sets[i] : null;
      if (set && lb < 4) {
        for (let k = 0; k < set.notes.length; k++) {         // 시범 소리 글자
          const n = set.notes[k], p = SPOTS[n.spot];
          if (n.called === 0 && lb >= n.s) { n.called = 1; label(n.len >= 2 ? '위이이이잉' : n.len >= 1 ? '위이잉' : '윙', p[0], p[1] - 70, C.white, 34); }
          if (n.called === 1 && lb >= n.s + n.len) { n.called = 2; ring(p[0], p[1], 70, '#fff'); }
        }
      }
      for (let k = 0; k < st.notes.length; k++) {
        const n = st.notes[k];
        if (n.state === 2) continue;
        const t0 = tOf(n.b0), t1 = tOf(n.b1);
        if (t0 - t > 1) break;
        if (n.state === 0) {
          if (st.bot && t >= t0 + n.err) { DRILL.press(t0 + n.err); continue; }
          if (t > t0 + WIN.bad) DRILL.finish(n, 'miss', 'miss');
        } else {
          if (st.bot && t >= t1 + n.err) { DRILL.release(t1 + n.err); continue; }
          if (t > t1 + REL.bad) DRILL.finish(n, 'bad', 'late');   // 너무 오래 눌렀다
        }
      }
      const hitPhase = set && lb >= 3;
      let hint = '';
      if (set) {
        if (set.cap) hint = hitPhase ? set.cap[1] : set.cap[0];
        else if (!set.practice && i < 4) hint = hitPhase ? (st.touch ? '화면을' : '스페이스를') + ' 누르고 있다가, 길이가 차면 떼기' : '사부의 드릴 소리가 얼마나 긴지 들어 보세요';
      }
      setHint(hint);
      if (rel < 0) setPill('준비', C.white);
      else if (!set) setPill('…', C.white);
      else setPill(hitPhase ? '누르기!' : '듣기', hitPhase ? C.yellow : C.white);
    },

    draw(beat, now) {
      const rel = beat - INTRO, i = Math.floor(rel / 8), lb = rel - i * 8;
      const set = i >= 0 && i < st.sets.length ? st.sets[i] : null;
      const dt = Math.min(100, Math.max(0, now - st.lastDraw));
      st.lastDraw = now;
      const k = 1 - Math.exp(-dt / 55);

      // 사부: 듣기 마디에는 북질할 나사로 날아가 쪼고, 나머지는 횃대에서 본다
      let call = null;
      if (set && lb < 4) for (let j = 0; j < set.notes.length; j++) { const n = set.notes[j]; if (lb < n.s + n.len) { call = n; break; } }
      const drumming = call && lb >= call.s;
      let bx, by, ba, flip, pose;
      if (call) {
        const p = SPOTS[call.spot], left = p[0] < 640;
        ba = 22 + (drumming ? 2.4 * Math.sin(now * 0.8) : 0);   // 쪼지 않고 부리를 대고 드르르 떤다 (부리 드릴)
        const r = (ba * Math.PI) / 180, T = A.BEAK_TIP, s = 0.8;
        const tx = T.x * Math.cos(r) - T.y * Math.sin(r), ty = T.x * Math.sin(r) + T.y * Math.cos(r);
        bx = left ? p[0] - 12 - s * tx : p[0] + 12 + s * tx;
        by = p[1] - s * ty;
        flip = !left;
        pose = Math.floor(now / 75) % 2 ? 'up' : 'down';
      } else { bx = 1086; by = 450; ba = 0; flip = true; pose = 'sit'; }
      st.bp.x += (bx - st.bp.x) * k; st.bp.y += (by - st.bp.y) * k; st.bp.a += (ba - st.bp.a) * k;
      const near = Math.abs(st.bp.x - bx) + Math.abs(st.bp.y - by) < 30;
      for (const key in els.birdPose) show(els.birdPose[key], key === (pose === 'sit' && !near ? 'up' : pose));
      const bs = call ? 0.8 : 0.9;
      setT(els.bird, `translate(${st.bp.x.toFixed(1)} ${st.bp.y.toFixed(1)}) scale(${flip ? -bs : bs} ${bs}) rotate(${st.bp.a.toFixed(1)})`);

      // 드릴: 다음에 조일 나사로 간다
      let target = st.held;
      if (!target && set && lb >= 3) for (let j = 0; j < set.notes.length; j++) if (set.notes[j].state === 0) { target = set.notes[j]; break; }
      let dx = 250, dy = 470, dflip = false;
      if (target) { const p = SPOTS[target.spot]; dflip = p[0] > 640; dx = p[0] + (dflip ? 20 : -20); dy = p[1]; }
      st.dp.x += (dx - st.dp.x) * k; st.dp.y += (dy - st.dp.y) * k;
      const shake = st.held ? 1.6 * Math.sin(now * 0.9) : 0;
      setT(els.drill, `translate(${(st.dp.x + shake).toFixed(1)} ${(st.dp.y + (st.held ? 1.2 * Math.cos(now * 0.7) : 0)).toFixed(1)}) scale(${dflip ? -1 : 1} 1)`);
      show(els.spin, !!st.held);

      // 길이 고리와 막대
      let gp = -1, gx = 0, gy = 0, over = false;
      if (st.held) { const n = st.held; gp = (beat - n.b0) / n.len; gx = SPOTS[n.spot][0]; gy = SPOTS[n.spot][1]; over = gp > 1.12; }
      else if (drumming) { gp = (lb - call.s) / call.len; gx = SPOTS[call.spot][0]; gy = SPOTS[call.spot][1]; }
      const turning = st.held || (drumming ? call : null);  // 지금 돌아가고 있는 나사
      show(els.whirl, !!turning);
      if (turning) setT(els.whirl, `translate(${SPOTS[turning.spot][0]} ${SPOTS[turning.spot][1]}) rotate(${((now * 0.9) % 360).toFixed(0)})`);
      show(els.gauge, gp >= 0);
      if (gp >= 0) {
        setT(els.gauge, `translate(${gx} ${gy})`);
        els.gaugeArc.setAttribute('stroke-dasharray', `${(RING * clamp01(gp)).toFixed(1)} ${RING.toFixed(1)}`);
        els.gaugeArc.setAttribute('stroke', over ? C.coral : st.held ? C.yellow : '#fff');
      }
      show(els.bar, !!(set && lb >= 3 && lb < 7.6));
      els.barFill.setAttribute('width', (608 * clamp01(st.held ? gp : 0)).toFixed(1));
      els.barFill.setAttribute('fill', over ? C.coral : C.yellow);
    },

    stopSound() { Au.drill(false); }
  };

  /* =====================================================================
   * 결재 쾅쾅 (도장)
   * 서류가 왼쪽에서 책상 위 도장 자리로 미끄러져 들어온다. 들어오기 시작한 지 한 박 뒤, 자리에 딱 놓였을 때 도장을 찍는다.
   * 박자표와 판정은 떡방아와 같다: h = 결재 서류(한 박 뒤에 찍는다), f = 광고지(찍으면 안 됨)
   * ===================================================================== */
  const DOC_X = 640, DOC_Y = 500;
  const DOC_T = `skewX(-14) scale(1.3 0.8)`;                 // 책상에 눕힌 모양
  const SEAL_X = DOC_X - 12, SEAL_Y = DOC_Y + 46;            // 서류의 도장 칸이 화면에서 놓이는 자리
  const STAMP_UP = 384;                                      // 도장이 떠 있는 높이
  const docArt = (fake) => (fake
    ? `<rect x="-80" y="-104" width="160" height="208" rx="10" fill="${C.yellow}" ${STK}/>` + A.burst(0, -34, 56, 30, 9, C.coral, 0.2) +
      A.text('광고', 0, -18, { size: 40, fill: '#fff', anchor: 'middle', stroke: C.ink, sw: 8 }) +
      `<path d="M-50 44 h100 M-50 68 h100" stroke="${C.ink}" stroke-width="7" stroke-linecap="round" opacity=".45"/>`
    : `<rect x="-80" y="-104" width="160" height="208" rx="10" fill="#fff" ${STK}/>` +
      `<path d="M-77 -68 V-94 Q-77 -101 -70 -101 H70 Q77 -101 77 -94 V-68 Z" fill="#DCE9FF"/>` +         // 머리띠
      `<path d="M-56 -84 h64" stroke="${C.ink}" stroke-width="9" stroke-linecap="round"/>` +
      `<path d="M-56 -48 h112 M-56 -26 h112 M-56 -4 h80" stroke="${C.benchEdge}" stroke-width="8" stroke-linecap="round"/>` +
      `<rect x="-34" y="26" width="68" height="64" rx="8" fill="none" stroke="${C.steelDark}" stroke-width="5" stroke-dasharray="8 7"/>` +
      A.text('인', 0, 70, { size: 32, fill: C.benchEdge, anchor: 'middle' }));
  const sealArt = (q) => (q === 'perfect'
    ? `<circle cx="0" cy="58" r="26" fill="none" stroke="${C.coral}" stroke-width="8"/><circle cx="0" cy="58" r="9" fill="${C.coral}"/>`
    : q === 'good'
      ? `<g transform="rotate(16 0 58) translate(8 -6)"><circle cx="0" cy="58" r="26" fill="none" stroke="${C.coral}" stroke-width="8" stroke-dasharray="46 9"/><circle cx="0" cy="58" r="8" fill="${C.coral}"/></g>`
      : q === 'bad'
        ? `<ellipse cx="14" cy="54" rx="44" ry="24" fill="${C.coral}" opacity=".4"/><path d="M-18 44 q20 -18 44 0" fill="none" stroke="${C.coral}" stroke-width="8" stroke-linecap="round"/>`
        : `<path d="M-52 -60 L52 60 M52 -60 L-52 60" stroke="${C.coral}" stroke-width="16" stroke-linecap="round"/>`);

  const STAMP = Object.assign({}, POUND, {
    prepare(stage) {
      POUND.prepare(stage);
      st.docLo = 0;
    },

    build(w) {
      // 사무실: 벽, 창문(하늘·블라인드), 벽시계, 화분, 나무 책상, 인주, 지켜보는 사부 (움직이지 않으니 배경 층에)
      MB.Layers.setBg(A.defs() +
        `<defs><linearGradient id="g2-office" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#37CBB6"/><stop offset="1" stop-color="#129684"/></linearGradient>` +
        `<linearGradient id="g2-sky2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8FD3FF"/><stop offset="1" stop-color="#E6F7FF"/></linearGradient></defs>` +
        `<rect x="-40" y="-40" width="${W + 80}" height="${H + 80}" fill="url(#g2-office)"/>` +
        `<ellipse cx="640" cy="230" rx="560" ry="300" fill="url(#mb-glow)"/>` +
        `<g transform="translate(34 48)"><rect x="96" y="70" width="300" height="230" rx="14" fill="url(#g2-sky2)" ${STK}/>` +
        `<g fill="#fff"><ellipse cx="184" cy="232" rx="46" ry="15"/><ellipse cx="208" cy="220" rx="28" ry="14"/><ellipse cx="322" cy="168" rx="40" ry="13"/></g>` +
        `<path d="M246 70 V300 M96 185 H396" ${STK}/>` +
        `<path d="M103 90 H389 M103 106 H389 M103 122 H389" stroke="#fff" stroke-width="8" opacity=".8"/>` +
        `<rect x="84" y="296" width="324" height="18" rx="6" fill="#fff" ${STK}/></g>` +
        `<circle cx="1010" cy="160" r="62" fill="#fff" ${STK}/><circle cx="1010" cy="160" r="50" fill="none" stroke="${C.benchEdge}" stroke-width="4"/>` +
        `<path d="M1010 116 v10 M1010 194 v10 M966 160 h10 M1044 160 h10" stroke="${C.ink}" stroke-width="4" stroke-linecap="round"/>` +
        `<path d="M1010 160 V128 M1010 160 L1036 174" ${STK}/><circle cx="1010" cy="160" r="5.5" fill="${C.coral}"/>` +
        `<g transform="translate(-64 0)"><path d="M556 340 C534 300 534 268 552 246 C568 274 570 306 556 340 Z M556 340 C580 302 600 290 624 288 C618 316 592 334 556 340 Z M556 340 C534 318 510 312 488 316 C500 338 528 346 556 340 Z" fill="#2FAE6B" ${STK}/>` +
        `<path d="M524 394 l-10 -56 h84 l-10 56 Z" fill="#E08557" ${STK}/><path d="M512 338 h88" stroke="${C.ink}" stroke-width="10" stroke-linecap="round"/><path d="M514 338 h84" stroke="#F3A77E" stroke-width="5" stroke-linecap="round"/></g>` +
        A.bird(1150, 452, { scale: 0.9, flip: true }) +        // 사부는 책상 뒤에 서서 지켜본다
        `<path d="M110 392 H1170 L1330 664 H-50 Z" fill="${A.G.woodSide}" ${STK}/>` +
        `<path d="M170 428 H1120 M96 478 H1208 M30 536 H1262 M-20 604 H1296" stroke="${C.woodDark}" stroke-width="2.5" stroke-linecap="round" opacity=".4"/>` +
        `<path d="M118 398 H1162" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".55"/>` +
        `<path d="M-50 664 H1330 V760 H-50 Z" fill="#C4893A" ${STK}/>` +
        `<g transform="translate(1010 618) skewX(-14)"><rect x="-74" y="-30" width="148" height="62" rx="11" fill="#3D4F7A" ${STK}/><rect x="-61" y="-21" width="122" height="40" rx="6" fill="${A.G.grip}"/></g>` +
        `<g transform="translate(${DOC_X} ${DOC_Y}) ${DOC_T}"><rect x="-96" y="-120" width="192" height="240" rx="14" fill="none" stroke="${C.ink}" stroke-width="5" stroke-dasharray="16 12" opacity=".3"/></g>`);
      els.docs = w('');
      // 도장: 찍는 면 한가운데가 (0,0). 둥근 나무 손잡이, 잘록한 목, 쇠 받침, 붉은 고무판
      els.tool = w(`<path d="M-46 -30 V-6 Q-46 0 -40 0 H40 Q46 0 46 -6 V-30 Z" fill="${A.G.grip}" ${STK}/>` +
        `<rect x="-52" y="-50" width="104" height="23" rx="7" fill="${A.G.steel}" ${STK}/>` +
        `<path d="M-27 -50 C-31 -88 -14 -100 -17 -126 H17 C14 -100 31 -88 27 -50 Z" fill="${A.G.woodCyl}" ${STK}/>` +
        `<ellipse cx="0" cy="-152" rx="45" ry="38" fill="${A.G.woodCyl}" ${STK}/>` +
        `<path d="M-25 -172 q10 -12 27 -12" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".75"/>` +
        `<path d="M-32 -142 q32 14 64 0" fill="none" stroke="${C.woodDark}" stroke-width="2.4" stroke-linecap="round" opacity=".7"/>` +
        `<g style="display:none"><path d="M-80 -22 l-24 -10 M-84 0 h-28 M80 -22 l24 -10 M84 0 h28" stroke="#fff" stroke-width="7" stroke-linecap="round"/></g>`);
      els.hitMark = els.tool.lastChild;                       // 찍는 순간에만 보이는 충격선
      els.strip = w('');
      els.slotHi = w(SLOT_HI);
    },

    slot(slot, t, beat) {                                   // 서류가 들어오는 소리 "착", 광고지는 "삐"
      if (slot % 2) return;
      for (let i = 0; i < st.cues.length; i++) {
        const c = st.cues[i];
        if (c.beat === beat) { if (c.fake) Au.V.cue(t, 91, 0.7); else Au.V.flip(t, 1.3); }
        else if (c.beat > beat) break;
      }
    },

    /* 광고지가 도장 자리에 있을 때 찍었는가 */
    wrong(beat) {
      for (let i = 0; i < st.cues.length; i++) {
        const c = st.cues[i];
        if (c.beat > beat) break;
        if (c.fake && !c.ruined && Math.abs(beat - (c.beat + 1)) <= 0.4) {
          c.ruined = true;
          if (c.el) c.el.appendChild(mk(sealArt('x')));
          label('앗! 광고지', 860, 470, C.coral, 50);
          kick(10, 0);
          if (!st.virtual) { Au.hit('screw'); Au.miss(); }
          return true;
        }
      }
      return false;
    },

    cueFx() {},                                             // 서류 그림은 draw 가 만들어 움직인다

    hitFx(n, q, now) {
      if (q === 'miss') { label('놓침', 860, 470, SOFT, 34); if (!st.virtual) Au.miss(); return; }
      st.hitAt = now;
      if (q === 'perfect') {
        ring(SEAL_X, SEAL_Y - 8, 160, '#fff'); sparks(SEAL_X, SEAL_Y - 14, 10, '#FFE04A'); bits(SEAL_X, SEAL_Y - 20, 7, 1, ['#fff', C.coral]);
        label('완벽!', 860, 470, '#FFE04A', 56); kick(9, 0.022); st.flashAt = now;
      } else if (q === 'good') { bits(SEAL_X, SEAL_Y - 20, 4, 0.8, ['#fff']); label('좋아', 860, 470, C.mint, 46); kick(5, 0.01); }
      else { label('삐끗', 860, 470, C.coral, 46); kick(4, 0); }
    },

    draw(beat, now) {
      const rel = beat - INTRO;
      strip(beat, docIcon, stampIcon);

      // 서류: 신호가 나오면 왼쪽에서 들어와 한 박 뒤 도장 자리에 놓이고, 찍히거나 때를 놓치면 오른쪽으로 나간다
      for (let i = st.docLo; i < st.cues.length; i++) {
        const c = st.cues[i], u = beat - c.beat;
        if (u < 0) break;
        if (c.gone) { if (i === st.docLo) st.docLo++; continue; }
        if (!c.el) { c.el = mk(docArt(c.fake)); els.docs.appendChild(c.el); }
        const judged = c.note ? c.note.judged : null;
        if (judged && !c.sealed) {
          c.sealed = true;
          if (judged !== 'miss') c.el.appendChild(mk(sealArt(judged)));
          c.outAt = Math.max(u, 1.03);
        }
        if (c.outAt == null && u > 1.28) c.outAt = u;       // 광고지는 그냥 지나간다
        let x;
        if (c.outAt != null) {
          const v = (u - c.outAt) / 0.55;
          if (v >= 1) { c.el.remove(); c.gone = true; continue; }
          x = DOC_X + 900 * (v < 0 ? 0 : v * v);
        } else { const v = clamp01(u / 0.88); x = DOC_X - 900 * (1 - v) * (1 - v); }
        setT(c.el, `translate(${x.toFixed(1)} ${DOC_Y}) ${DOC_T}`);
      }

      // 도장: 찍을 박이 다가오면 살짝 치켜들고, 누르면 꾹 내려찍는다
      let wind = 0;
      for (let i = 0; i < st.notes.length; i++) {
        const n = st.notes[i];
        if (n.judged) continue;
        const u = n.beat - beat;
        if (u > 0.7) break;
        if (u > 0) wind = Math.max(wind, 1 - u / 0.7);
      }
      let y = STAMP_UP - 26 * wind - 7 * Math.abs(Math.sin(Math.PI * beat));
      let shut = false;
      if (st.strike) {
        if (!st.strike.seen) { st.strike.seen = true; st.strike.at = now; }
        const dd = now - st.strike.at;
        if (dd > 280 || dd < 0) st.strike = null;
        else { const k = dd < 110 ? 1 : 1 - (dd - 110) / 170; y = lerp(y, SEAL_Y, k); shut = dd < 110; }
      }
      show(els.hitMark, shut);
      setT(els.tool, `translate(${SEAL_X} ${y.toFixed(1)})`);

      if (rel < 0) setPill('준비', C.white);
      else if (wind > 0.25) setPill('쾅!', C.yellow);
      else setPill('…', C.white);
    }
  });

  const MODES = { pound: POUND, drill: DRILL, stamp: STAMP };

  /* ---------- 시계와 소리 예약 ---------- */
  function clock(perfNow) { return st.virtual ? ((perfNow - st.v0) / 1000) * st.virtual : Au.audible(perfNow); }

  function schedule() {
    if (!st || st.virtual || st.paused || st.done) return;
    const horizon = Au.now() + 0.14, last = (st.endBeat + 1) * 4;
    while (st.nextSlot <= last) {
      const slot = st.nextSlot, beat = slot / 4, t = st.t0 + beat * st.spb;
      if (t >= horizon) break;
      const prog = clamp01((beat - INTRO) / (st.endBeat - INTRO));
      const tr = prog >= 0.75 ? 2 : 0;
      const rel = beat - INTRO;
      const hit = st.M !== DRILL ? true : rel >= 0 && rel - Math.floor(rel / 8) * 8 >= 4;
      if (beat < st.endBeat) MB.Charts.bgm(st.stage, Au.V, t, slot % 16, Math.floor(beat / 4), st.spb, { hit, energy: Math.min(3, Math.floor(prog * 4)), tr });
      else if (slot === st.endBeat * 4) MB.Charts.bgmEnd(st.stage, Au.V, t, st.spb, tr);
      if (beat < INTRO) { if (slot % 4 === 0) Au.V.click(t, 1, slot === 12); }
      else if (beat < st.endBeat) st.M.slot(slot, t, beat);
      st.nextSlot++;
    }
  }

  /* ---------- 시작과 끝 ---------- */
  function start(stage, opt) {
    opt = opt || {};
    stop();
    svg = document.getElementById('stage');
    st = {
      stage, M: MODES[stage.game], spb: 60 / stage.bpm, virtual: opt.virtual || 0, bot: opt.bot || null, onEnd: opt.onEnd || null,
      offset: (opt.offset || 0) / 1000, touch: !!opt.touch, fx: [], nextSlot: 0, counted: -1, ended: false, done: false, paused: false,
      score: 0, max: 0, combo: 0, maxCombo: 0, counts: { perfect: 0, good: 0, bad: 0, miss: 0 }, phit: 0, ptotal: 0, whiffs: 0, presses: 0,
      cam: null, heat: 0, heatShown: 0, flashAt: -1e9, hudDirty: true, comboPop: -1e9, pill: '', pillAt: -1e9, hint: null, progKey: '',
      t0: 0, v0: 0, timer: 0, pausedAt: 0
    };
    st.M.prepare(stage);
    svg.innerHTML = '';
    els = {};
    els.world = mk('');
    svg.appendChild(els.world);
    const w = (html) => { const e = mk(html); els.world.appendChild(e); return e; };
    MB.Layers.setLines('');
    st.M.build(w);                                         // 움직이지 않는 것은 각 게임이 배경 층(MB.Layers.setBg)에 그린다
    els.fx = w('');
    svg.appendChild(mk(hudArt(stage)));
    const q = (id) => svg.querySelector('#' + id);
    els.prog = q('g2-prog'); els.setno = q('g2-setno'); els.pill = q('g2-pill'); els.pillT = q('g2-pill-t');
    els.pillBg = els.pill.querySelectorAll('rect')[1];
    els.practice = q('g2-practice'); els.score = q('g2-score'); els.combo = q('g2-combo'); els.comboG = q('g2-combo-g'); els.hint = q('g2-hint');
    if (st.virtual) { st.v0 = performance.now(); st.t0 = 0.3; } else st.t0 = Au.now() + 0.35;
    st.timer = setInterval(schedule, 25);
    schedule();
    st.M.draw(-0.01, performance.now());
    drawHud(-0.01, performance.now());
  }

  function stop() {
    if (st) { clearInterval(st.timer); st.M.stopSound(); }
    st = null;
  }

  function finish() {
    st.done = true;
    clearInterval(st.timer);
    st.M.stopSound();
    const acc = st.max ? st.score / st.max : 0;
    const res = {
      stageId: st.stage.id, tutorial: false, score: st.score, max: st.max, acc, counts: Object.assign({}, st.counts), maxCombo: st.maxCombo,
      whiffs: st.whiffs, phit: st.phit, ptotal: st.ptotal, grade: acc >= 0.9 ? 'S' : acc >= 0.6 ? 'A' : 'F'
    };
    if (st.onEnd) st.onEnd(res);
  }

  function frame(now) {
    if (!st || st.paused || st.done) return;
    const t = clock(now), beat = (t - st.t0) / st.spb;
    schedule();
    if (beat >= 0 && beat < INTRO) {                        // 하나 둘 셋 넷
      const k = Math.floor(beat);
      if (k > st.counted) { st.counted = k; banner(['하나', '둘', '셋', '넷'][k], k === 3 ? C.yellow : C.white, 110, 330, Math.min(640, st.spb * 900)); kick(3, 0.012); }
    }
    if (beat >= st.endBeat && !st.ended) {
      st.ended = true;
      if (st.held) st.M.release(tOf(st.held.b1));           // 끝날 때 누르고 있던 것은 제때 뗀 것으로 본다
      banner('끝!', C.yellow, 130, 330, 1000);
      sparks(640, 300, 16, C.yellow);
      kick(10, 0.03);
    }
    st.M.advance(beat, t);
    st.M.draw(beat, now);
    drawHud(beat, now);
    runFx(now);
    if (beat >= st.endBeat + OUTRO) finish();
  }

  function state() {
    if (!st) return null;
    const t = st.simNow != null ? st.simNow / 1000 : clock(performance.now());
    return {
      beat: +((t - st.t0) / st.spb).toFixed(2), endBeat: st.endBeat, score: st.score, max: st.max, combo: st.combo, maxCombo: st.maxCombo,
      counts: Object.assign({}, st.counts), presses: st.presses, whiffs: st.whiffs, done: st.done, paused: st.paused, fx: st.fx.length, nextSlot: st.nextSlot
    };
  }

  /* 모의 실행 (자동 검증용): 화면 갱신을 기다리지 않고 계산으로 한 판을 돌린다 */
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
      if (opt.until != null && st && !st.done && (st.simNow / 1000 - st.t0) / st.spb >= opt.until) { st.paused = true; return state(); }
    }
    if (result) { result.frames = frames; result.presses = st ? st.presses : 0; }
    stop();
    return result;
  }

  function pause() {
    if (!st || st.paused || st.done) return false;
    if (st.held) st.M.release(clock(performance.now()));    // 누른 채로 멈추면 그 자리에서 뗀 것으로 본다
    st.paused = true;
    st.pausedAt = performance.now();
    st.M.stopSound();
    if (!st.virtual) Au.suspend();
    return true;
  }
  function resume() {
    if (!st || !st.paused) return;
    const d = performance.now() - st.pausedAt;
    st.fx.forEach((f) => { f.born += d; });
    if (st.cam) st.cam.at += d;
    if (st.strike) st.strike.at += d;
    ['flashAt', 'comboPop', 'pillAt', 'squishAt', 'hitAt', 'angryUntil'].forEach((k) => { if (st[k] != null) st[k] += d; });
    if (st.virtual) { st.v0 += d; st.paused = false; }
    else Au.resume().then(() => { if (st) st.paused = false; });
  }

  MB.Game2 = {
    start, stop, frame, pause, resume, simulate, state,
    pressAt(perfTs) { if (st && !st.paused && !st.done) st.M.press(clock(perfTs) - st.offset); },
    releaseAt(perfTs) { if (st && !st.paused && !st.done && st.M.release) st.M.release(clock(perfTs) - st.offset); },
    get active() { return !!st && !st.done; },
    get paused() { return !!st && st.paused; }
  };
})(window);
