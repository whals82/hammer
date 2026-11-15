/* 못박자! — 플레이 밖의 화면: 타이틀, 스테이지 고르기, 결과, 설정, 일시정지 */
(function (global) {
  'use strict';
  const MB = (global.MB = global.MB || {});
  const A = global.MBArt;
  const C = A.C;
  const Au = MB.Audio;
  const { L, PY, NAIL_TOP, W, H } = MB.Layout;
  const INK = C.ink;

  let svg = null, overlay = null;
  let T = null;            // 타이틀 움직임
  let K = null;            // 싱크 자동 맞춤
  let primary = 'select';  // 결과 화면에서 엔터가 누르는 단추

  const q = (id) => document.getElementById(id);
  const pct = (acc) => Math.floor(acc * 100 + 1e-9);
  const gradeName = (g) => (g === 'S' ? '명품' : g === 'A' ? '합격' : '불합격');

  function init() {
    svg = q('stage');
    overlay = q('overlay');
  }
  /* keepGame = true 면 겹쳐 띄운 창만 닫는다 (일시정지에서 돌아올 때) */
  function clear(keepGame) {
    if (!keepGame && MB.Layers) MB.Layers.reset();   // 게임이 쓰던 배경 층과 흔들림을 지운다
    overlay.innerHTML = '';
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }

  function tipOrigin(tx, ty, aDeg, s) {
    const a = (aDeg * Math.PI) / 180, t = A.BEAK_TIP;
    return [tx - s * (t.x * Math.cos(a) - t.y * Math.sin(a)), ty - s * (t.x * Math.sin(a) + t.y * Math.cos(a))];
  }
  const sbtn = (act, x, y, w, label, fill) => `<g data-act="${act}" class="sbtn">` + A.pill(x, y, w, 62, fill) +
    A.text(label, x + w / 2, y + 41, { size: 30, fill: INK, anchor: 'middle' }) + `</g>`;

  /* ---------- 타이틀 ---------- */
  /* o.touch = 터치 기기인가, o.canInstall = 앱으로 설치할 수 있는가 */
  function showTitle(o) {
    o = o || {};
    clear();
    const nx = [320, 500, 590, 790, 1010];
    let g = A.defs() + A.wall(W, H, true, { cx: 640, cy: 190, rx: 600, ry: 320 }) + A.bench(W, H, L.benchTop, null);
    g += A.plankBack(L.plankX, L.plankTop, L.plankW);
    g += A.nail(nx[0], PY, 'up') + A.nail(nx[1], PY, 'perfect') + A.nail(nx[2], PY, 'perfect') + A.nail(nx[3], PY, 'up') + A.nail(nx[4], PY, 'up');
    g += A.plankFront(L.plankX, L.plankTop, L.plankW, L.plankH);
    g += A.sparkle(nx[1] - 28, PY - 34, 13) + A.sparkle(nx[2] + 30, PY - 44, 17) + A.sparkle(nx[2] - 22, PY - 62, 9, C.white);
    g += `<g id="t-bird"><g id="t-bird-up">${A.bird(0, 0, { wing: 'up' })}</g><g id="t-bird-down">${A.bird(0, 0, { wing: 'down' })}</g></g>`;
    g += `<g id="t-tok">${A.text('똑!', nx[0] + 36, NAIL_TOP - 36, { size: 44, stroke: INK, sw: 9, rot: -10 })}</g>`;
    g += `<g id="t-ham">${A.hammer(0, 0, {})}</g>`;
    g += A.logo(640, 30, 1.56);
    g += A.text('똑똑 듣고, 쾅쾅 박는 리듬 공방', 640, 300, { size: 34, anchor: 'middle', stroke: INK, sw: 8 });
    g += `<g id="t-start" data-act="start" class="sbtn">` + A.pill(420, 606, 440, 70, C.yellow) +
      A.text(o.touch ? '화면을 눌러 시작' : '스페이스 또는 터치로 시작', 640, 653, { size: 32, fill: INK, anchor: 'middle' }) + `</g>`;
    g += `<g data-act="settings" class="sbtn">` + A.pill(1150, 24, 104, 50, C.white, { shadow: false }) +
      A.text('설정', 1202, 59, { size: 26, fill: INK, anchor: 'middle' }) + `</g>`;
    g += `<g data-act="mute" class="sbtn">` + A.pill(1000, 24, 134, 50, o.muted ? C.steel : C.white, { shadow: false }) +
      A.text(o.muted ? '소리 끔' : '소리 켬', 1067, 59, { size: 26, fill: INK, anchor: 'middle' }) + `</g>`;
    if (o.canInstall) {
      g += `<g data-act="install" class="sbtn">` + A.pill(26, 24, 176, 50, C.white, { shadow: false }) +
        A.text('앱으로 설치', 114, 59, { size: 26, fill: INK, anchor: 'middle' }) + `</g>`;
    }
    svg.innerHTML = g;
    T = { nx, bird: q('t-bird'), up: q('t-bird-up'), down: q('t-bird-down'), tok: q('t-tok'), ham: q('t-ham'), start: q('t-start') };
    titleFrame(performance.now());
  }

  function titleFrame(now) {
    if (!T) return;
    const ph = (now % 700) / 700;                                  // 0.7초에 한 번 쫀다
    const p = ph < 0.14 ? ph / 0.14 : ph < 0.3 ? 1 - (ph - 0.14) / 0.16 : 0;
    const a = 50 + 16 * p;
    const o = tipOrigin(T.nx[0] - 2, NAIL_TOP - 34 + 32 * p, a, 0.95);
    T.bird.setAttribute('transform', `translate(${o[0].toFixed(1)} ${o[1].toFixed(1)}) scale(0.95) rotate(${a.toFixed(1)})`);
    const up = Math.floor(now / 80) % 2 === 0;
    T.up.style.display = up ? '' : 'none';
    T.down.style.display = up ? 'none' : '';
    T.tok.style.opacity = ph < 0.3 ? 1 : 0;
    const hy = NAIL_TOP + 2 + 7 * Math.sin(now / 420);
    T.ham.setAttribute('transform', `translate(${T.nx[4]} ${hy.toFixed(1)}) scale(-1 1) rotate(${(-26 + 2.5 * Math.sin(now / 560)).toFixed(1)} ${A.HAMMER_PIVOT.x} ${A.HAMMER_PIVOT.y})`);
    T.start.style.opacity = (0.84 + 0.16 * Math.sin(now / 260)).toFixed(2);
  }

  /* ---------- 스테이지 고르기 ---------- */
  /* 모든 스테이지를 처음부터 고를 수 있다 (예전에는 앞 스테이지에 합격해야 다음이 열렸다) */
  function isOpen() { return true; }
  // 카드 그림: 그 스테이지에서 만드는 물건
  const VIEW = { birdhouse: '-118 -100 236 300', chair: '-112 -184 224 292', bookshelf: '-118 -192 236 310', tteok: '-120 -70 240 170', docs: '-96 -112 192 208' };
  const icon = (s) => (s.tutorial
    ? `<svg viewBox="-104 -206 220 226">${A.bird(0, 0, {})}</svg>`
    : `<svg viewBox="${VIEW[s.item]}">${A.item(s.item, 0, 0, 1)}</svg>`);

  function showSelect(store) {
    T = null;
    svg.innerHTML = A.defs() + A.wall(W, H, true, { cx: 640, cy: 330, rx: 660, ry: 400 });
    let focusIdx = 0;
    const cards = MB.Stages.map((s, idx) => {
      const open = isOpen(store, idx);
      const best = store.best[s.id];
      let status;
      if (!open) status = '앞 스테이지 합격 시 열림';
      else if (s.tutorial) status = store.tutorial ? '연습 완료' : '여기부터!';
      else status = best ? `최고 ${pct(best.acc)}% · ${gradeName(best.grade)}` : '기록 없음';
      if (open && !s.tutorial && (!best || best.grade === 'F') && !focusIdx) focusIdx = idx;
      return `<button class="card${open ? '' : ' locked'}" data-stage="${s.id}"${open ? '' : ' disabled'}>` +
        `<span class="no">${s.no}</span><span class="art">${icon(s)}</span>` +
        `<span class="name">${s.name}</span><span class="meta">${s.bpm} BPM</span><span class="best">${status}</span></button>`;
    }).join('');
    if (!store.tutorial) focusIdx = 0;
    overlay.innerHTML = `<div class="screen select"><h1>어느 게임을 할까요?</h1><div class="cards">${cards}</div>` +
      `<div class="row"><button class="btn" data-act="title">처음으로</button><button class="btn" data-act="settings">설정</button></div></div>`;
    const list = overlay.querySelectorAll('.card');
    if (list[focusIdx]) list[focusIdx].focus();
  }

  function selectKey(code) {
    const list = Array.prototype.slice.call(overlay.querySelectorAll('.card:not(.locked)'));
    if (!list.length) return false;
    let i = list.indexOf(document.activeElement);
    if (code === 'ArrowRight' || code === 'ArrowDown') i = (i + 1) % list.length;
    else if (code === 'ArrowLeft' || code === 'ArrowUp') i = (i - 1 + list.length) % list.length;
    else return false;
    list[i < 0 ? 0 : i].focus();
    Au.ui('move');
    return true;
  }

  /* ---------- 결과 ---------- */
  function resultFrame(titleText) {
    let g = A.defs() + A.wall(W, H, false, { cx: 640, cy: 340, rx: 640, ry: 380 });
    g += `<rect x="150" y="82" width="980" height="536" rx="36" fill="${INK}" opacity=".3"/>`;
    g += `<rect x="150" y="70" width="980" height="536" rx="36" fill="${C.bench}" stroke="${INK}" stroke-width="6"/>`;
    g += A.pill(500, 36, 280, 66, C.yellow) + A.text(titleText, 640, 82, { size: 38, fill: INK, anchor: 'middle' });
    g += `<rect x="192" y="124" width="400" height="440" rx="28" fill="#DCE9FF" stroke="${INK}" stroke-width="${A.SW}"/>`;
    return g;
  }
  function birdSays(line, mood) {
    let g = A.bird(92, 706, { scale: 1, eye: mood });
    g += `<path d="M196 626 h336 a22 22 0 0 1 22 22 v22 a22 22 0 0 1 -22 22 h-336 a22 22 0 0 1 -22 -22 v-8 l-22 -6 l22 -10 a22 22 0 0 1 22 -20 Z" fill="${C.white}" stroke="${INK}" stroke-width="${A.SW}" stroke-linejoin="round"/>`;
    g += A.text(line, 364, 669, { size: line.length > 17 ? 23 : 27, fill: INK, anchor: 'middle' });
    return g;
  }

  function showResult(stage, res, o) {
    T = null;
    clear();
    const grade = res.grade;
    let g = resultFrame('납품 검사');
    g += `<ellipse cx="392" cy="524" rx="124" ry="16" fill="${INK}" opacity=".16"/>`;
    if (grade === 'F' && !stage.game) g += A.pile(392, 420, 1.3);
    else if (stage.item === 'chair') g += A.chair(392, 400, 1.3);
    else if (stage.item === 'bookshelf') g += A.bookshelf(392, 384, 1.22);
    else if (stage.item === 'tteok') g += A.tteok(392, 360, 1.45);
    else if (stage.item === 'docs') g += A.docs(392, 330, 1.4);
    else g += A.birdhouse(392, 286, 1.22);
    if (grade === 'S') g += A.sparkle(252, 196, 20) + A.sparkle(532, 250, 15) + A.sparkle(246, 404, 11, C.white) + A.sparkle(516, 160, 10, C.white);
    g += A.stamp(506, 478, 70, gradeName(grade), -14, grade === 'S' ? C.coral : grade === 'A' ? C.wall : '#7C8AA6');

    g += A.text(stage.no + ' · ' + stage.name, 640, 166, { size: 36, fill: INK });
    const rows = [['완벽', res.counts.perfect, C.yellow], ['좋아', res.counts.good, C.mint], ['삐끗', res.counts.bad, C.coral], ['놓침', res.counts.miss, C.steelDark]];
    rows.forEach((r, i) => {
      const y = 206 + i * 50;
      g += `<rect x="640" y="${y}" width="30" height="30" rx="9" fill="${r[2]}" stroke="${INK}" stroke-width="3.5"/>`;
      g += A.text(r[0], 686, y + 26, { size: 30, fill: INK });
      g += A.text(String(r[1]), 1084, y + 27, { size: 32, fill: INK, anchor: 'end' });
      g += `<path d="M772 ${y + 17} H${r[1] > 9 ? 1036 : 1052}" stroke="${C.benchEdge}" stroke-width="4" stroke-dasharray="2 10" stroke-linecap="round"/>`;
    });
    g += `<path d="M640 416 H1086" stroke="${C.benchEdge}" stroke-width="4" stroke-linecap="round"/>`;
    g += A.text('정확도', 640, 478, { size: 30, fill: INK });
    g += A.text(pct(res.acc) + '%', 1086, 492, { size: 76, fill: C.wall, anchor: 'end', stroke: INK, sw: 10 });
    g += A.text('최대 콤보 ' + res.maxCombo, 640, 520, { size: 24, fill: '#5B6B8C' });
    if (o.newBest) g += A.pill(640, 536, 116, 40, C.mint, { shadow: false }) + A.text('새 기록!', 698, 564, { size: 22, fill: INK, anchor: 'middle' });

    if (grade === 'F') {
      primary = 'retry';
      g += sbtn('select', 566, 630, 274, '스테이지 고르기', C.white) + sbtn('retry', 866, 630, 264, '다시 하기', C.yellow);
    } else if (o.next) {
      primary = 'next';
      g += sbtn('retry', 620, 630, 220, '다시 하기', C.white) + sbtn('next', 866, 630, 264, '다음 스테이지', C.yellow);
    } else {
      primary = 'select';
      g += sbtn('retry', 620, 630, 220, '다시 하기', C.white) + sbtn('select', 866, 630, 264, '스테이지 고르기', C.yellow);
    }
    g += birdSays(stage.lines[grade], grade === 'F' ? 'angry' : 'open');
    svg.innerHTML = g;
  }

  function showTutorialEnd(res) {
    T = null;
    clear();
    let g = resultFrame('연습 끝!');
    g += A.bird(360, 508, { scale: 1.7, eye: 'shut' });
    g += A.sparkle(250, 190, 18) + A.sparkle(540, 240, 14) + A.sparkle(520, 430, 10, C.white);
    g += A.text('규칙은 이게 전부예요', 640, 172, { size: 38, fill: INK });
    const lines = ['사부가 세운 간격 그대로 친다', '넷째 박 "자!" 다음이 내 차례', '소리가 밀리면 설정에서 싱크를 맞춘다'];
    lines.forEach((s, i) => {
      const y = 236 + i * 58;
      g += `<circle cx="656" cy="${y - 10}" r="14" fill="${C.yellow}" stroke="${INK}" stroke-width="3.5"/>` +
        A.text(String(i + 1), 656, y - 2, { size: 20, fill: INK, anchor: 'middle' }) + A.text(s, 684, y, { size: 28, fill: INK });
    });
    g += `<path d="M640 416 H1086" stroke="${C.benchEdge}" stroke-width="4" stroke-linecap="round"/>`;
    g += A.text('맞힌 못', 640, 478, { size: 30, fill: INK });
    g += A.text(res.phit + ' / ' + res.ptotal, 1086, 490, { size: 64, fill: C.wall, anchor: 'end', stroke: INK, sw: 10 });
    primary = 'next';
    g += sbtn('retry', 620, 630, 220, '한 번 더', C.white) + sbtn('next', 866, 630, 264, '스테이지 1 시작', C.yellow);
    g += `<path d="M196 626 h336 a22 22 0 0 1 22 22 v22 a22 22 0 0 1 -22 22 h-336 a22 22 0 0 1 -22 -22 v-22 a22 22 0 0 1 22 -22 Z" fill="${C.white}" stroke="${INK}" stroke-width="${A.SW}"/>` +
      A.text('이제 진짜 일을 하러 가 볼까?', 364, 669, { size: 27, fill: INK, anchor: 'middle' });
    svg.innerHTML = g;
  }

  /* ---------- 일시정지 ---------- */
  function showPause(touch) {
    overlay.innerHTML = `<div class="modal"><div class="panel narrow"><h2>잠깐 멈춤</h2>` +
      `<div class="col"><button class="btn primary" data-act="resume">계속하기</button>` +
      `<button class="btn" data-act="restart">처음부터</button><button class="btn" data-act="quit">나가기</button></div>` +
      (touch ? '' : `<p class="note center">Esc 계속 · R 처음부터 · Q 나가기</p>`) + `</div></div>`;
  }

  /* ---------- 설정 ---------- */
  function showSettings(store) {
    const off = (store.offset > 0 ? '+' : '') + store.offset + 'ms';
    overlay.insertAdjacentHTML('beforeend', `<div class="modal" id="m-settings"><div class="panel"><h2>설정</h2>` +
      `<label class="field"><span>배경음</span><input type="range" min="0" max="100" step="5" id="set-bgm" value="${Math.round(store.bgm * 100)}"><b id="set-bgm-v">${Math.round(store.bgm * 100)}</b></label>` +
      `<label class="field"><span>효과음</span><input type="range" min="0" max="100" step="5" id="set-sfx" value="${Math.round(store.sfx * 100)}"><b id="set-sfx-v">${Math.round(store.sfx * 100)}</b></label>` +
      `<div class="field"><span>싱크</span><button class="btn sm" data-act="off-">−5</button><b id="set-off">${off}</b>` +
      `<button class="btn sm" data-act="off+">+5</button><button class="btn sm primary" data-act="calib">자동 맞춤</button></div>` +
      `<p class="note">블루투스 이어폰이나 TV처럼 소리가 늦게 나오는 기기에서는 싱크 숫자를 올리세요. 잘 모르겠으면 자동 맞춤을 누르면 됩니다.</p>` +
      `<div class="field"><span>소리</span><button class="btn sm" data-act="mute" id="set-mute">${store.muted ? '꺼짐 (누르면 켜기)' : '켜짐 (누르면 끄기)'}</button>` +
      `<span style="width:auto;margin-left:18px">화면</span><button class="btn sm" data-act="fullscreen">전체 화면</button></div>` +
      `<div class="row center"><button class="btn primary" data-act="close">닫기</button></div></div></div>`);
  }
  function refreshSettings(store) {
    const e = q('set-off');
    if (e) e.textContent = (store.offset > 0 ? '+' : '') + store.offset + 'ms';
    const b = q('set-bgm-v'), s = q('set-sfx-v'), m = q('set-mute');
    if (b) b.textContent = Math.round(store.bgm * 100);
    if (s) s.textContent = Math.round(store.sfx * 100);
    if (m) m.textContent = store.muted ? '꺼짐 (누르면 켜기)' : '켜짐 (누르면 끄기)';
  }
  function closeSettings() {
    const m = q('m-settings');
    if (m) m.remove();
  }

  /* ---------- 싱크 자동 맞춤: 메트로놈에 맞춰 12번 두드린다 ---------- */
  const TAPS = 12, SKIP = 4;
  function calibStart() {
    calibStop();
    const m = q('m-settings');
    if (m) m.style.display = 'none';
    let dots = '';
    for (let i = 0; i < TAPS; i++) dots += '<i></i>';
    overlay.insertAdjacentHTML('beforeend', `<div class="modal" id="m-calib"><div class="panel"><h2>싱크 자동 맞춤</h2>` +
      `<p class="note big">"똑" 소리에 맞춰 스페이스를 누르거나 화면을 눌러 주세요. ${TAPS}번이면 끝납니다.</p>` +
      `<div class="dots" id="calib-dots">${dots}</div><p class="note big center" id="calib-res">&nbsp;</p>` +
      `<div class="row center"><button class="btn primary" data-act="calib-apply" id="calib-apply" disabled>적용</button>` +
      `<button class="btn" data-act="calib-retry">다시</button><button class="btn" data-act="calib-cancel">취소</button></div></div></div>`);
    K = { spb: 0.6, t0: 0, next: 0, taps: [], result: null, timer: 0 };
    Au.resume().then(() => {
      if (!K) return;
      K.t0 = Au.now() + 0.6;
      K.timer = setInterval(() => {
        if (!K || K.result != null) return;
        while (K.t0 + K.next * K.spb < Au.now() + 0.15) {
          Au.V.click(K.t0 + K.next * K.spb, 1, K.next % 4 === 0);
          K.next++;
        }
      }, 25);
    });
  }
  function calibTap(perfTs) {
    if (!K || K.result != null || !K.t0) return;
    const b = (Au.audible(perfTs) - K.t0) / K.spb;
    if (b < 0.5) return;
    K.taps.push((b - Math.round(b)) * K.spb * 1000);
    const dots = q('calib-dots').children;
    if (dots[K.taps.length - 1]) dots[K.taps.length - 1].className = 'on';
    if (K.taps.length >= TAPS) {
      const u = K.taps.slice(SKIP).sort((x, y) => x - y);
      const mid = u.length / 2;
      const med = (u[mid - 1] + u[mid]) / 2;
      K.result = Math.max(-100, Math.min(300, Math.round(med / 5) * 5));
      clearInterval(K.timer);
      q('calib-res').textContent = '측정값 ' + (K.result > 0 ? '+' : '') + K.result + 'ms';
      q('calib-apply').disabled = false;
    }
  }
  function calibStop() {
    if (K) clearInterval(K.timer);
    K = null;
    const m = q('m-calib');
    if (m) m.remove();
    const s = q('m-settings');
    if (s) s.style.display = '';
  }

  MB.UI = {
    init, clear, showTitle, titleFrame, showSelect, selectKey, showResult, showTutorialEnd, showPause,
    showSettings, refreshSettings, closeSettings, calibStart, calibTap, calibStop, isOpen,
    get primary() { return primary; },
    get calibResult() { return K ? K.result : null; }
  };
})(window);
