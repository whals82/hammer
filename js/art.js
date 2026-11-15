/* 못박자! — 그림 모듈
 * 모든 그림을 SVG 문자열로 만든다. 이미지 파일은 쓰지 않는다.
 * 시안(docs/mockups)과 실제 게임이 같은 함수를 쓴다.
 * 면을 칠할 때 G(그러데이션)를 쓰면 빛과 그늘이 들어간다. G 는 defs() 가 같은 화면 어딘가에 그려져 있어야 보이고,
 * 없으면 뒤에 적어 둔 단색으로 칠해진다. 가로·세로 직선의 선 색으로는 쓰지 않는다(그러데이션이 먹지 않는다).
 */
(function (global) {
  'use strict';

  const C = {
    ink: '#16213E',
    wall: '#2F6BFF',
    wallDot: '#2759DE',
    wallTool: '#2A60EC',
    under: '#1E3FA6',
    underDark: '#19358E',
    bench: '#F4F7FC',
    benchEdge: '#CBD6E8',
    plank: '#FFF1CC',
    plankSide: '#FFD98A',
    grain: '#F2BE5C',
    woodDark: '#D29A45',
    woodDeep: '#A8702A',
    steel: '#C5D2E5',
    steelLight: '#F0F4FA',
    steelDark: '#8FA2BF',
    steelShade: '#6F82A3',
    yellow: '#FFCB3D',
    yellowDark: '#F2A60C',
    coral: '#FF5E5E',
    coralDark: '#D94444',
    mint: '#3FE0B4',
    white: '#FFFFFF',
    birdDark: '#24324F',
    birdMid: '#3B4C70',
    leather: '#9A6532',
    leatherDark: '#6A421B'
  };

  /* 빛과 그늘이 들어간 칠 */
  const G = {
    wall: 'url(#mb-g-wall) #2F6BFF',
    cyl: 'url(#mb-g-cyl) #C5D2E5',            // 세로로 선 쇠 기둥 (왼쪽에서 빛)
    steel: 'url(#mb-g-steel) #C5D2E5',        // 위에서 빛을 받는 쇠
    wood: 'url(#mb-g-wood) #FFF1CC',          // 나무 윗면
    woodSide: 'url(#mb-g-woodside) #FFD98A',  // 나무 옆면
    woodCyl: 'url(#mb-g-woodcyl) #FFD98A',    // 세로로 선 통나무
    handle: 'url(#mb-g-handle) #FFCB3D',      // 가로로 누운 나무 자루
    grip: 'url(#mb-g-grip) #FF5E5E',
    bench: 'url(#mb-g-bench) #F4F7FC',
    belly: 'url(#mb-g-belly) #FFFFFF',
    back: 'url(#mb-g-back) #24324F',
    crest: 'url(#mb-g-crest) #FF5E5E',
    beak: 'url(#mb-g-beak) #FFCB3D',
    mint: 'url(#mb-g-mint) #3FE0B4'
  };

  const FONT = "Jua, MBHeavy, 'Malgun Gothic', sans-serif";
  const SW = 4.5; // 기본 외곽선 굵기

  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const r1 = (n) => Math.round(n * 10) / 10;

  /* ---------- 공통 ---------- */

  function defs() {
    const lg = (id, x2, y2, stops) => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">` +
      stops.map((s) => `<stop offset="${s[0]}" stop-color="${s[1]}"/>`).join('') + `</linearGradient>`;
    return `<defs>` +
      `<pattern id="mb-peg" width="48" height="48" patternUnits="userSpaceOnUse">` +
      `<circle cx="24" cy="25.8" r="4.8" fill="#fff" opacity=".2"/><circle cx="24" cy="24" r="4.5" fill="#12339A" opacity=".5"/></pattern>` +
      `<radialGradient id="mb-glow"><stop offset="0" stop-color="#fff" stop-opacity=".3"/>` +
      `<stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>` +
      `<radialGradient id="mb-g-shadow"><stop offset="0" stop-color="#0B1230" stop-opacity=".4"/>` +
      `<stop offset="1" stop-color="#0B1230" stop-opacity="0"/></radialGradient>` +
      lg('mb-g-wall', 0, 1, [[0, '#4783FF'], [1, '#2257DE']]) +
      lg('mb-g-cyl', 1, 0, [[0, '#7D90B0'], [0.28, '#F7FAFE'], [0.55, '#C5D2E5'], [1, '#6F82A3']]) +
      lg('mb-g-steel', 0, 1, [[0, '#F7FAFE'], [0.5, '#C5D2E5'], [1, '#8497B6']]) +
      lg('mb-g-wood', 0, 1, [[0, '#FFF8E2'], [1, '#FFE6AE']]) +
      lg('mb-g-woodside', 0, 1, [[0, '#FFDD93'], [1, '#EBB052']]) +
      lg('mb-g-woodcyl', 1, 0, [[0, '#D79A45'], [0.3, '#FFE9B4'], [0.6, '#F3C36E'], [1, '#BE8231']]) +
      lg('mb-g-handle', 0, 1, [[0, '#FFE596'], [0.45, '#FBC140'], [1, '#D98B10']]) +
      lg('mb-g-grip', 0, 1, [[0, '#FF8C7C'], [0.5, '#F4534F'], [1, '#BF3535']]) +
      lg('mb-g-bench', 0, 1, [[0, '#FFFFFF'], [1, '#DCE5F3']]) +
      lg('mb-g-belly', 1, 1, [[0, '#FFFFFF'], [1, '#D3DEF0']]) +
      lg('mb-g-back', 1, 1, [[0, '#3C5079'], [1, '#172039']]) +
      lg('mb-g-crest', 0, 1, [[0, '#FF8474'], [1, '#DC3939']]) +
      lg('mb-g-beak', 0, 1, [[0, '#FFE070'], [1, '#EC960A']]) +
      lg('mb-g-mint', 0, 1, [[0, '#8AF3D8'], [1, '#27BE98']]) +
      `</defs>`;
  }

  function text(str, x, y, o = {}) {
    const size = o.size || 28;
    const fill = o.fill || C.white;
    const anchor = o.anchor || 'start';
    const stroke = o.stroke
      ? ` stroke="${o.stroke}" stroke-width="${o.sw || 6}" paint-order="stroke" stroke-linejoin="round"`
      : '';
    const rot = o.rot ? ` transform="rotate(${o.rot} ${x} ${y})"` : '';
    const ls = o.ls ? ` letter-spacing="${o.ls}"` : '';
    return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" fill="${fill}" text-anchor="${anchor}"${ls}${stroke}${rot}>${esc(str)}</text>`;
  }

  function pill(x, y, w, h, fill, o = {}) {
    const sw = o.sw != null ? o.sw : SW;
    const shadow = o.shadow === false ? '' :
      `<rect x="${x}" y="${y + 6}" width="${w}" height="${h}" rx="${h / 2}" fill="${C.ink}" opacity=".28"/>`;
    return shadow + `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${o.rx != null ? o.rx : h / 2}" fill="${fill}" stroke="${C.ink}" stroke-width="${sw}"/>`;
  }

  function keycap(x, y, w, h, label, size) {
    return `<rect x="${x}" y="${y + 6}" width="${w}" height="${h}" rx="10" fill="${C.ink}"/>` +
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${C.white}" stroke="${C.ink}" stroke-width="4"/>` +
      text(label, x + w / 2, y + h / 2 + (size || 22) * 0.36, { size: size || 22, fill: C.ink, anchor: 'middle' });
  }

  /* 네 갈래 반짝이 */
  function sparkle(x, y, r, fill) {
    const k = r * 0.22;
    return `<path d="M${x} ${y - r} Q${x + k} ${y - k} ${x + r} ${y} Q${x + k} ${y + k} ${x} ${y + r} Q${x - k} ${y + k} ${x - r} ${y} Q${x - k} ${y - k} ${x} ${y - r} Z" ` +
      `fill="${fill || C.yellow}" stroke="${C.ink}" stroke-width="3" stroke-linejoin="round"/>`;
  }

  /* 뾰족한 충격 표시 */
  function burst(x, y, R, r, n, fill, rot) {
    let d = '';
    for (let i = 0; i < n * 2; i++) {
      const rad = (i % 2 ? r : R);
      const a = (Math.PI * i) / n + (rot || 0);
      d += (i ? 'L' : 'M') + r1(x + Math.cos(a) * rad) + ' ' + r1(y + Math.sin(a) * rad) + ' ';
    }
    return `<path d="${d}Z" fill="${fill || C.yellow}" stroke="${C.ink}" stroke-width="${SW}" stroke-linejoin="round"/>`;
  }

  /* ---------- 배경 ---------- */

  const TS = `stroke="${C.ink}" stroke-width="3.5" stroke-linejoin="round"`;
  /* 벽에 거는 연장들. (x, y) 는 걸이 못 자리 */
  function saw(x, y, rot) {
    return `<g transform="translate(${x} ${y}) rotate(${rot || 0})">` +
      `<path d="M58 8 L318 34 L318 56 L300 52 L290 62 L272 58 L262 68 L244 63 L234 73 L216 68 L206 78 L188 73 L178 83 L160 77 L150 87 L132 81 L122 91 L104 84 L94 94 L76 86 L58 90 Z" fill="${G.steel}" ${TS}/>` +
      `<path d="M92 24 L300 44" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".8"/>` +
      `<rect x="0" y="0" width="78" height="92" rx="22" fill="${G.woodSide}" ${TS}/>` +
      `<rect x="22" y="28" width="34" height="36" rx="13" fill="${C.wall}" ${TS}/>` +
      `<circle cx="67" cy="18" r="4" fill="#fff" ${TS}/><circle cx="67" cy="74" r="4" fill="#fff" ${TS}/></g>`;
  }
  function wrench(x, y, rot) {
    return `<g transform="translate(${x} ${y}) rotate(${rot || 0})">` +
      `<rect x="-13" y="14" width="26" height="150" fill="${G.cyl}" ${TS}/>` +
      `<path d="M-11 -4 V-30 A32 32 0 1 0 11 -30 V-4 Z" fill="${G.steel}" ${TS}/>` +
      `<circle cx="0" cy="178" r="24" fill="${G.steel}" ${TS}/><circle cx="0" cy="178" r="10" fill="${C.wall}" ${TS}/></g>`;
  }
  function trySquare(x, y, rot) {
    return `<g transform="translate(${x} ${y}) rotate(${rot || 0})">` +
      `<rect x="2" y="0" width="22" height="130" fill="${G.cyl}" ${TS}/>` +
      `<path d="M8 20 h8 M8 40 h12 M8 60 h8 M8 80 h12 M8 100 h8" stroke="${C.ink}" stroke-width="2.5"/>` +
      `<rect x="0" y="122" width="112" height="28" rx="5" fill="${G.woodSide}" ${TS}/>` +
      `<circle cx="18" cy="136" r="3.5" fill="#fff" ${TS}/><circle cx="96" cy="136" r="3.5" fill="#fff" ${TS}/></g>`;
  }

  /* glow = {cx, cy, rx, ry} 를 주면 그 자리에 은은한 조명을 깐다. tools = false 면 연장을 걸지 않는다 */
  function wall(w, h, tools, glow) {
    let g = `<rect width="${w}" height="${h}" fill="${G.wall}"/>`;
    if (glow) g += `<ellipse cx="${glow.cx}" cy="${glow.cy}" rx="${glow.rx}" ry="${glow.ry}" fill="url(#mb-glow)"/>`;
    g += `<rect width="${w}" height="${h}" fill="url(#mb-peg)"/>`;
    // 눈길을 끌지 않게 반쯤 비치게 건다
    if (tools !== false) g += `<g opacity=".45">` + saw(52, 150, -10) + wrench(1168, 140, 18) + trySquare(1010, 118, -6) + `</g>`;
    return g;
  }

  /* 작업대. ruler = {x0, step, from, to, cue} 를 주면 앞면에 박자 눈금을 그린다 (cue = 신호 박의 번호, 0부터) */
  function bench(w, h, topY, ruler) {
    const slabH = 62;
    let g = `<rect x="-10" y="${topY + slabH - 4}" width="${w + 20}" height="${h - topY - slabH + 20}" fill="${C.under}"/>`;
    g += `<rect x="96" y="${topY + slabH}" width="50" height="${h}" fill="${C.underDark}"/>` +
      `<rect x="${w - 146}" y="${topY + slabH}" width="50" height="${h}" fill="${C.underDark}"/>` +
      `<rect x="-10" y="${topY + slabH}" width="${w + 20}" height="18" fill="#0B1230" opacity=".25"/>`;        // 상판 아래 그늘
    g += `<rect x="-10" y="${topY}" width="${w + 20}" height="${slabH}" fill="${G.bench}"/>` +
      `<rect x="-10" y="${topY + slabH - 14}" width="${w + 20}" height="14" fill="${C.benchEdge}"/>` +
      `<rect x="-10" y="${topY + 2.5}" width="${w + 20}" height="4" fill="#fff"/>` +
      `<rect x="-10" y="${topY}" width="${w + 20}" height="${slabH}" fill="none" stroke="${C.ink}" stroke-width="5"/>`;
    if (ruler) {
      const from = ruler.from != null ? ruler.from : 0;
      const to = ruler.to != null ? ruler.to : 3.75;
      for (let b = from; b <= to + 0.001; b += 0.25) {
        const x = r1(ruler.x0 + ruler.step * b);
        const whole = Math.abs(b - Math.round(b)) < 0.01;
        const half = Math.abs(b * 2 - Math.round(b * 2)) < 0.01;
        const len = whole ? 20 : half ? 13 : 8;
        const sw = whole ? 4 : half ? 3 : 2.5;
        g += `<path d="M${x} ${topY + 3} v${len}" stroke="${C.ink}" stroke-width="${sw}" stroke-linecap="round" opacity="${whole ? 1 : 0.55}"/>`;
        if (whole && ruler.cue === Math.round(b)) {
          // 신호 박: 숫자 대신 "자!" 딱지
          g += `<rect x="${x - 30}" y="${topY + 26}" width="60" height="27" rx="13.5" fill="${C.yellow}" stroke="${C.ink}" stroke-width="3.5"/>` +
            text('자!', x, topY + 47, { size: 20, fill: C.ink, anchor: 'middle' });
        } else if (whole) {
          g += text(String(Math.round(b) + 1), x, topY + 46, { size: 22, fill: C.ink, anchor: 'middle' });
        }
      }
    }
    return g;
  }

  /* 판자: 윗면(뒤) → 못 → 앞면 순서로 그려서 못이 박혀 들어간 것처럼 보이게 한다 */
  function plankBack(x, y, w) {
    return `<path d="M${x + 12} ${y} H${x + w - 12} L${x + w} ${y + 16} H${x} Z" fill="${G.wood}" stroke="${C.ink}" stroke-width="${SW}" stroke-linejoin="round"/>` +
      `<path d="M${r1(x + w * 0.06)} ${y + 6} H${r1(x + w * 0.38)} M${r1(x + w * 0.5)} ${y + 10} H${r1(x + w * 0.93)}" stroke="${C.grain}" stroke-width="2" stroke-linecap="round" opacity=".8"/>`;
  }

  function plankFront(x, y, w, h) {
    const fy = y + 14;
    const fh = h - 14;
    let g = `<rect x="${x}" y="${fy}" width="${w}" height="${fh}" rx="3" fill="${G.woodSide}" stroke="${C.ink}" stroke-width="${SW}" stroke-linejoin="round"/>`;
    g += `<rect x="${x + 4}" y="${fy + 3.5}" width="${w - 8}" height="4" rx="2" fill="#fff" opacity=".5"/>` +          // 윗모서리에 받는 빛
      `<rect x="${x + 4}" y="${fy + fh - 9}" width="${w - 8}" height="6" rx="2" fill="${C.woodDeep}" opacity=".25"/>`;  // 아랫모서리 그늘
    // 나뭇결: 물결치는 줄 여러 개와 옹이 둘
    const u = w * 0.22;
    g += `<g fill="none" stroke="${C.woodDark}" stroke-width="2.4" stroke-linecap="round" opacity=".8">`;
    for (let k = 0; k < 4; k++) {
      const gy = r1(fy + 14 + k * ((fh - 26) / 3)), dy = k % 2 ? 5 : -5;
      g += `<path d="M${x + 16} ${gy} q${r1(u / 2)} ${dy} ${r1(u)} 0 t${r1(u)} 0 t${r1(u)} 0 t${r1(u)} 0"/>`;
    }
    g += `<ellipse cx="${r1(x + w * 0.3)}" cy="${r1(fy + fh * 0.55)}" rx="16" ry="7.5" fill="${C.woodDark}" fill-opacity=".35"/>` +
      `<ellipse cx="${r1(x + w * 0.3)}" cy="${r1(fy + fh * 0.55)}" rx="7" ry="3"/>` +
      `<ellipse cx="${r1(x + w * 0.8)}" cy="${r1(fy + fh * 0.36)}" rx="12" ry="5.5" fill="${C.woodDark}" fill-opacity=".35"/>` +
      `</g>`;
    return g;
  }

  /* ---------- 못 ---------- */
  /* state: up(서 있음) perfect(반듯) good(살짝 기움) bad(휨) miss(놓침)
   * o.kind: 'nail' | 'screw',  o.dir: 휘거나 기우는 방향(1 오른쪽, -1 왼쪽), o.h: 서 있는 길이 */
  function nail(x, py, state, o = {}) {
    const kind = o.kind || 'nail';
    const dir = o.dir || 1;
    const up = o.h != null ? o.h : 56;
    const ink = C.ink;
    const screw = kind === 'screw';

    // 못대가리: 옆 띠 위에 타원 윗면을 얹어 도톰하게 보이게 한다
    const headShape = (hx, hy) => screw
      ? `<path d="M${hx - 20} ${hy} a20 15 0 0 1 40 0 Z" fill="${G.grip}" stroke="${ink}" stroke-width="3.4" stroke-linejoin="round"/>` +
        `<path d="M${hx - 12} ${hy - 7} q5 -5 11 -5.5" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" opacity=".75"/>` +
        `<rect x="${hx - 3}" y="${hy - 16}" width="6" height="8" rx="1" fill="${ink}"/>`
      : `<rect x="${hx - 19}" y="${hy - 9}" width="38" height="10.5" rx="4" fill="${G.steel}" stroke="${ink}" stroke-width="3.2"/>` +
        `<ellipse cx="${hx}" cy="${hy - 8.5}" rx="19" ry="3.6" fill="#F9FBFE" stroke="${ink}" stroke-width="3.2"/>` +
        `<path d="M${hx - 11} ${hy - 9} h10" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>`;

    const straight = (H, tilt, dim) => {
      let g = `<ellipse cx="${x}" cy="${py + 1.5}" rx="11" ry="2.8" fill="${ink}" opacity=".28"/>`;          // 들어간 자리
      g += `<rect x="${x - 6}" y="${py - H}" width="12" height="${H + 9}" fill="${screw ? '#FFC2BC' : G.cyl}" stroke="${ink}" stroke-width="3.2"/>`;
      if (screw) {
        for (let yy = py - H + 7; yy < py - 3; yy += 9) {
          g += `<path d="M${x - 6} ${yy + 5} L${x + 6} ${yy}" stroke="${C.coralDark}" stroke-width="2.5"/>`;
        }
      }
      g += headShape(x, py - H);
      return `<g transform="rotate(${tilt} ${x} ${py})"${dim ? ' opacity=".5"' : ''}>${g}</g>`;
    };

    if (state === 'perfect') return straight(0, 0);
    if (state === 'good') return straight(11, 9 * dir);
    if (state === 'miss') return straight(up, 0, !!o.dim);
    if (state === 'bad') {
      const ex = x + 24 * dir, ey = py - 40;
      const d = `M${x} ${py + 9} L${x} ${py - 13} Q${x} ${py - 35} ${ex} ${ey}`;
      const ang = dir > 0 ? -14 : 194;
      return `<path d="${d}" fill="none" stroke="${ink}" stroke-width="18" stroke-linejoin="round"/>` +
        `<path d="${d}" fill="none" stroke="${screw ? '#FFC2BC' : C.steel}" stroke-width="11.5"/>` +
        `<path d="M${x - 2.5} ${py - 12} Q${x - 2.5} ${py - 30} ${ex - 3} ${ey - 3}" fill="none" stroke="#fff" stroke-width="3" opacity=".7"/>` +
        `<g transform="translate(${ex} ${ey}) rotate(${ang})"><rect x="-3" y="-18" width="12" height="36" rx="4.5" fill="${screw ? C.coral : C.steelLight}" stroke="${ink}" stroke-width="3.2"/></g>`;
    }
    return straight(up, 0);
  }

  /* ---------- 딱 사부 (딱따구리) ---------- */
  /* 기준점은 발. 오른쪽을 본다. o.angle(시계 방향 도), o.scale, o.flip, o.wing: folded|up|down, o.eye: open|shut|angry */
  const BEAK_TIP = { x: 86, y: -120 };

  function bird(x, y, o = {}) {
    const s = o.scale || 1;
    const a = o.angle || 0;
    const fx = o.flip ? -1 : 1;
    const wing = o.wing || 'folded';
    const eye = o.eye || 'open';
    const ink = C.ink;
    const st = `stroke="${ink}" stroke-width="3.8" stroke-linejoin="round" stroke-linecap="round"`;
    const thin = `stroke="${ink}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"`;
    let g = '';

    // 꼬리깃 (흰 줄무늬)
    g += `<path d="M-24 -58 Q-56 -38 -76 -2 Q-60 4 -48 -4 Q-32 -22 -10 -32 Z" fill="${G.back}" ${st}/>` +
      `<path d="M-16 -46 Q-44 -24 -57 10 Q-43 16 -32 8 Q-19 -10 -2 -24 Z" fill="${C.birdMid}" ${st}/>` +
      `<path d="M-60 -22 l10 6 M-51 -34 l10 6 M-46 -1 l9 5 M-39 -13 l9 5" stroke="#fff" stroke-width="3.2" stroke-linecap="round"/>`;
    // 몸통: 흰 배(깃털 무늬) 위에 남색 등
    const body = 'M-32 -42 C-44 -82 -22 -116 8 -112 C36 -108 46 -72 38 -42 C32 -18 14 -6 -6 -8 C-22 -10 -29 -24 -32 -42 Z';
    g += `<path d="${body}" fill="${G.belly}"/>` +
      `<path d="M18 -86 q5 4 10 0 M27 -73 q4 3 8 0 M14 -68 q5 4 10 0 M25 -56 q4 3 8 0 M12 -48 q5 4 10 0 M20 -36 q4 3 8 0" fill="none" stroke="#A9B7D0" stroke-width="2.3" stroke-linecap="round"/>`;
    g += `<path d="M-32 -42 C-44 -82 -22 -116 8 -112 C17 -111 23 -108 28 -103 C8 -90 -2 -58 6 -18 C3 -11 -1 -9 -6 -8 C-22 -10 -29 -24 -32 -42 Z" fill="${G.back}"/>`;
    g += `<path d="${body}" fill="none" ${st}/>`;
    // 가죽 연장 벨트: 바늘땀, 놋쇠 버클, 주머니
    g += `<path d="M-31 -38 Q4 -22 38 -40" fill="none" stroke="${ink}" stroke-width="13.5" stroke-linecap="round"/>` +
      `<path d="M-31 -38 Q4 -22 38 -40" fill="none" stroke="${C.leather}" stroke-width="7.5" stroke-linecap="round"/>` +
      `<path d="M-27 -36.4 Q4 -22 34 -38.4" fill="none" stroke="#E9BD80" stroke-width="1.5" stroke-dasharray="4 4"/>` +
      `<rect x="-11" y="-36" width="15" height="13" rx="3" fill="${C.yellow}" ${thin}/>` +
      `<path d="M15 -39 h17 v15 q-8.5 5 -17 0 Z" fill="${C.leather}" ${thin}/><path d="M15 -32 q8.5 4 17 0" fill="none" ${thin}/>`;
    // 발
    if (wing === 'folded') {
      g += `<ellipse cx="-9" cy="-3" rx="10.5" ry="5.5" fill="${G.beak}" ${thin}/><ellipse cx="13" cy="-3" rx="10.5" ry="5.5" fill="${G.beak}" ${thin}/>` +
        `<path d="M-13 -1 v-5 M-6 -1 v-5 M9 -1 v-5 M16 -1 v-5" stroke="${ink}" stroke-width="1.8" stroke-linecap="round"/>`;
    } else {
      g += `<path d="M-6 -9 l-7 9 M8 -8 l-5 10" stroke="${ink}" stroke-width="9" stroke-linecap="round"/>` +
        `<path d="M-6 -9 l-7 9 M8 -8 l-5 10" stroke="${C.yellowDark}" stroke-width="4" stroke-linecap="round"/>`;
    }
    // 날개
    if (wing === 'folded') {
      g += `<path d="M-17 -93 C-36 -70 -31 -40 -5 -23 C8 -38 11 -64 2 -86 C-4 -94 -11 -96 -17 -93 Z" fill="${C.birdMid}" ${thin}/>` +
        `<path d="M-24 -73 l13 -3 M-25 -59 l14 -3 M-21 -46 l13 -3 M-14 -34 l10 -3" stroke="#fff" stroke-width="4" stroke-linecap="round"/>`;
    } else {
      const up = wing === 'up';
      const wd = up
        ? 'M4 -84 C-18 -124 -54 -152 -90 -158 C-88 -140 -82 -128 -72 -120 C-84 -118 -92 -110 -96 -98 C-80 -98 -68 -94 -58 -86 C-64 -80 -66 -72 -64 -64 C-42 -70 -18 -68 2 -56 Z'
        : 'M4 -80 C-24 -84 -60 -70 -86 -40 C-70 -38 -58 -40 -48 -46 C-52 -36 -52 -26 -46 -16 C-36 -24 -26 -30 -14 -32 C-14 -24 -10 -18 -4 -12 C6 -30 10 -54 4 -80 Z';
      g += `<path d="${wd}" fill="${C.birdMid}" ${st}/>`;
      g += up
        ? `<path d="M-62 -128 l14 12 M-46 -112 l14 12 M-30 -96 l14 12" stroke="#fff" stroke-width="5" stroke-linecap="round"/>` +
          `<path d="M-8 -78 C-26 -100 -48 -118 -70 -126 M-4 -66 C-24 -78 -44 -84 -62 -84" fill="none" stroke="${ink}" stroke-width="2" stroke-linecap="round" opacity=".45"/>`
        : `<path d="M-58 -52 l14 -6 M-36 -44 l12 -8 M-18 -38 l10 -10" stroke="#fff" stroke-width="5" stroke-linecap="round"/>` +
          `<path d="M-2 -70 C-26 -70 -50 -62 -70 -46 M0 -54 C-16 -50 -30 -42 -40 -30" fill="none" stroke="${ink}" stroke-width="2" stroke-linecap="round" opacity=".45"/>`;
    }
    // 볏
    g += `<path d="M-14 -136 L-36 -170 L-11 -158 L-8 -186 L8 -160 L26 -180 L27 -146 Z" fill="${G.crest}" ${st}/>` +
      `<path d="M-10 -146 L-21 -161 M3 -150 L-1 -169 M17 -150 L20 -165" stroke="#A82A2A" stroke-width="2.3" stroke-linecap="round" opacity=".75"/>`;
    // 부리: 끌처럼 곧고 단단하다
    g += `<path d="M36 -136 L${BEAK_TIP.x} ${BEAK_TIP.y} L36 -106 Z" fill="${G.beak}" ${st}/>` +
      `<path d="M41 -121 L71 -120" stroke="${ink}" stroke-width="2.3" stroke-linecap="round"/>` +
      `<circle cx="45" cy="-127" r="1.8" fill="${ink}"/>`;
    // 머리
    g += `<circle cx="12" cy="-122" r="30" fill="${G.back}" ${st}/>`;
    g += `<path d="M6 -106 q14 12 30 -2" fill="none" stroke="${C.white}" stroke-width="8" stroke-linecap="round"/>` +
      `<path d="M-12 -134 q6 -12 18 -16" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".35"/>`;
    // 눈
    if (eye === 'shut') {
      g += `<path d="M13 -128 q9 8 18 0" fill="none" stroke="${C.white}" stroke-width="4.5" stroke-linecap="round"/>`;
    } else {
      g += `<circle cx="22" cy="-128" r="10" fill="${C.white}" stroke="${ink}" stroke-width="2.6"/>` +
        `<circle cx="25" cy="-127.5" r="5.6" fill="#2A1B10"/><circle cx="27.2" cy="-130" r="2" fill="${C.white}"/>`;
      if (eye === 'angry') g += `<path d="M10 -142 L34 -134" stroke="${ink}" stroke-width="5" stroke-linecap="round"/>`;
    }
    return `<g transform="translate(${r1(x)} ${r1(y)}) scale(${fx * s} ${s}) rotate(${a})">${g}</g>`;
  }

  /* 부리 끝이 (tx, ty)에 오도록 놓는다 */
  function birdByBeak(tx, ty, o = {}) {
    const s = o.scale || 1;
    const fx = o.flip ? -1 : 1;
    const a = ((o.angle || 0) * Math.PI) / 180;
    const bx = BEAK_TIP.x * Math.cos(a) - BEAK_TIP.y * Math.sin(a);
    const by = BEAK_TIP.x * Math.sin(a) + BEAK_TIP.y * Math.cos(a);
    return bird(tx - fx * s * bx, ty - s * by, o);
  }

  /* ---------- 망치 ---------- */
  /* (x, y)는 내리쳤을 때 타격면 한가운데. o.angle 이 음수면 자루 끝을 축으로 들어 올린 자세.
   * 단조한 쇠머리(여덟모 타격부, 목, 볼, 휘어 올라간 발톱)와 히코리 자루, 고무 손잡이 */
  const HAMMER_PIVOT = { x: -215, y: -52 };

  function hammer(x, y, o = {}) {
    const a = o.angle || 0;
    const s = o.scale || 1;
    const fx = o.flip ? -1 : 1;
    const ink = C.ink;
    const st = `stroke="${ink}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"`;
    let g = '';
    // 자루: 손잡이 쪽이 조금 굵다
    g += `<path d="M-232 -66 L-22 -61 V-43 L-232 -38 Q-240 -52 -232 -66 Z" fill="${G.handle}" ${st}/>` +
      `<path d="M-144 -55 H-44 M-118 -48 H-64" stroke="#B9770F" stroke-width="2" stroke-linecap="round" opacity=".5"/>` +
      `<path d="M-146 -60.5 L-30 -58" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".6"/>`;
    // 고무 손잡이
    g += `<path d="M-232 -67 H-150 V-37 H-232 Q-242 -52 -232 -67 Z" fill="${G.grip}" ${st}/>` +
      `<path d="M-216 -60 v16 M-202 -60 v16 M-188 -60 v16 M-174 -60 v16 M-161 -60 v16" stroke="${C.coralDark}" stroke-width="4" stroke-linecap="round"/>` +
      `<path d="M-226 -62.5 H-156" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".5"/>`;
    // 자루가 꽂히는 자리의 깃
    g += `<rect x="-41" y="-68" width="20" height="32" rx="5" fill="${C.steelDark}" ${st}/>`;
    if ((o.head || 'hammer') === 'hammer') {
      // 발톱: 볼 위에서 자루 쪽으로 휘어 올라간다
      g += `<path d="M26 -84 C26 -122 -4 -148 -74 -152 C-52 -138 -30 -118 -22 -84 Z" fill="${G.steel}" ${st}/>` +
        `<path d="M-58 -146 C-32 -136 -10 -118 -2 -92" fill="none" stroke="${C.steelShade}" stroke-width="2.6" stroke-linecap="round"/>`;
      // 볼, 목, 여덟모 타격부
      g += `<rect x="-28" y="-88" width="56" height="44" rx="9" fill="${G.cyl}" ${st}/>` +
        `<path d="M-19 -46 H19 L22 -32 H-22 Z" fill="${G.cyl}" ${st}/>` +
        `<path d="M-23 -34 H23 L31 -25 V-4 Q31 0 27 0 H-27 Q-31 0 -31 -4 V-25 Z" fill="${G.cyl}" ${st}/>` +
        `<path d="M-30 -8 H30" stroke="${C.steelShade}" stroke-width="2.4"/>` +
        `<rect x="-22" y="-29" width="6" height="18" rx="3" fill="#fff" opacity=".85"/>` +
        `<rect x="-20" y="-82" width="6" height="30" rx="3" fill="#fff" opacity=".8"/>`;
    } else {
      // 나무 메 머리 (예전 테마용)
      g += `<rect x="-30" y="-116" width="60" height="116" rx="10" fill="${G.woodCyl}" ${st}/>` +
        `<path d="M-30 -92 H30 M-30 -22 H30" stroke="${ink}" stroke-width="3" opacity=".5"/>`;
    }
    return `<g transform="translate(${r1(x)} ${r1(y)}) scale(${fx * s} ${s}) rotate(${a} ${HAMMER_PIVOT.x} ${HAMMER_PIVOT.y})">${g}</g>`;
  }

  /* ---------- 로고 "못박자!" ---------- */
  /* 획은 판자, '못'의 ㅗ 세로획은 못, 느낌표는 망치 */
  const LOGO = [
    { w: 100, tilt: -4, strokes: ['M27 14 H73 V46 H27 Z', 'M12 82 H88', 'M26 128 L50 104 L74 128'], nail: true },
    { w: 100, tilt: 3, strokes: ['M18 12 V58 H52 V12 M18 35 H52', 'M77 8 V66 M77 36 H93', 'M22 88 H80 V128'] },
    { w: 104, tilt: -3, strokes: ['M10 26 H60', 'M36 26 Q35 84 10 126', 'M32 70 Q42 102 62 126', 'M82 8 V128 M82 64 H98'] },
    { w: 66, tilt: 8, bang: true }
  ];
  const LOGO_H = 138;

  function logo(cx, y, s) {
    const gap = 6;
    const total = LOGO.reduce((n, l) => n + l.w, 0) + gap * (LOGO.length - 1);
    let ox = cx - (total * s) / 2;
    let under = '', over = '';
    const lj = 'stroke-linecap="round" stroke-linejoin="round" fill="none"';
    LOGO.forEach((l) => {
      const tf = `translate(${r1(ox)} ${y}) scale(${s}) rotate(${l.tilt} ${l.w / 2} ${LOGO_H / 2})`;
      let u = '', v = '';
      if (l.bang) {
        // 망치 모양 느낌표
        u += `<path d="M33 44 V98" stroke="${C.ink}" stroke-width="25" ${lj}/>` +
          `<rect x="-1" y="2" width="68" height="46" rx="14" fill="${C.ink}"/>` +
          `<circle cx="33" cy="124" r="15" fill="${C.ink}"/>`;
        v += `<path d="M33 44 V98" stroke="${C.yellow}" stroke-width="14" ${lj}/>` +
          `<rect x="5" y="8" width="56" height="34" rx="9" fill="${C.steel}"/>` +
          `<rect x="5" y="8" width="56" height="34" rx="9" fill="none" stroke="${C.ink}" stroke-width="2.5"/>` +
          `<rect x="12" y="14" width="26" height="5" rx="2.5" fill="#fff" opacity=".7"/>` +
          `<circle cx="33" cy="124" r="9.5" fill="${C.steelLight}"/><circle cx="33" cy="124" r="9.5" fill="none" stroke="${C.ink}" stroke-width="2.5"/>`;
      } else {
        l.strokes.forEach((d) => {
          u += `<path d="${d}" stroke="${C.ink}" stroke-width="26" ${lj}/>`;
          v += `<path d="${d}" stroke="${C.plank}" stroke-width="14.5" ${lj}/>`;
        });
        if (l.nail) {
          u += `<path d="M50 62 V76" stroke="${C.ink}" stroke-width="19" ${lj}/><rect x="36" y="52" width="28" height="16" rx="6" fill="${C.ink}"/>`;
          v += `<path d="M50 62 V78" stroke="${C.steel}" stroke-width="8" stroke-linecap="butt" fill="none"/>` +
            `<rect x="40.5" y="56" width="19" height="8" rx="3.5" fill="${C.steelLight}"/>`;
        }
      }
      under += `<g transform="${tf}">${u}</g>`;
      over += `<g transform="${tf}">${v}</g>`;
      ox += (l.w + gap) * s;
    });
    // 아래로 살짝 내린 어두운 겹이 그림자 노릇을 한다
    const shadow = under.split(C.ink).join('#0B1230');
    return `<g transform="translate(0 ${r1(7 * s)})" opacity=".45">${shadow}</g>` + under + over;
  }

  /* ---------- 완성품: 새집 ---------- */
  function birdhouse(x, y, s) {
    const ink = C.ink;
    const st = `stroke="${ink}" stroke-width="${SW}" stroke-linejoin="round"`;
    let g = '';
    g += `<rect x="-9" y="96" width="18" height="96" fill="${G.woodSide}" ${st}/>`;                       // 기둥
    g += `<rect x="-78" y="84" width="156" height="18" rx="4" fill="${G.woodSide}" ${st}/>`;             // 바닥판
    g += `<path d="M-62 86 V-10 L0 -62 L62 -10 V86 Z" fill="${G.wood}" ${st}/>`;                         // 몸통
    g += `<path d="M-62 20 H62 M-62 54 H62" stroke="${C.grain}" stroke-width="3"/>`;
    g += `<circle cx="0" cy="18" r="21" fill="${ink}"/>`;                                                 // 구멍
    g += `<rect x="-5" y="50" width="10" height="26" rx="5" fill="${C.yellow}" ${st}/>`;                  // 횃대
    g += `<path d="M-92 -2 L0 -82 L92 -2 L78 14 L0 -52 L-78 14 Z" fill="${C.coral}" ${st}/>`;             // 지붕
    [[-50, 74], [50, 74], [-50, 0], [50, 0], [-64, 6], [64, 6]].forEach((p) => {
      g += `<circle cx="${p[0]}" cy="${p[1]}" r="4.5" fill="${C.steelLight}" stroke="${ink}" stroke-width="2.5"/>`;
    });
    return `<g transform="translate(${x} ${y}) scale(${s})">${g}</g>`;
  }

  /* ---------- 완성품: 의자 ---------- */
  function chair(x, y, s) {
    const ink = C.ink;
    const st = `stroke="${ink}" stroke-width="${SW}" stroke-linejoin="round"`;
    const grain = (d) => `<path d="${d}" fill="none" stroke="${C.woodDark}" stroke-width="2" stroke-linecap="round" opacity=".7"/>`;
    let g = `<ellipse cx="0" cy="94" rx="98" ry="12" fill="url(#mb-g-shadow)"/>`;                     // 바닥 그림자
    g += `<rect x="-58" y="-150" width="16" height="118" rx="5" fill="${G.woodCyl}" ${st}/>`;        // 등받이 기둥
    g += `<rect x="42" y="-150" width="16" height="118" rx="5" fill="${G.woodCyl}" ${st}/>`;
    g += `<rect x="-50" y="-112" width="100" height="16" rx="6" fill="${G.wood}" ${st}/>` +          // 가운데 살
      grain('M-40 -105 q20 -4 40 0 t36 0');
    g += `<rect x="-66" y="-168" width="132" height="32" rx="11" fill="${G.grip}" ${st}/>` +         // 등받이 윗판
      `<path d="M-52 -160 H40" stroke="#fff" stroke-width="3.5" stroke-linecap="round" opacity=".45"/>`;
    g += `<rect x="-60" y="-28" width="16" height="120" rx="5" fill="${G.woodCyl}" ${st}/>`;         // 앞다리
    g += `<rect x="44" y="-28" width="16" height="120" rx="5" fill="${G.woodCyl}" ${st}/>`;
    g += `<rect x="-46" y="32" width="92" height="13" rx="5" fill="${G.wood}" ${st}/>` +             // 가로대
      grain('M-36 38.5 q18 3 36 0 t32 0');
    g += `<rect x="-76" y="-52" width="152" height="30" rx="11" fill="${G.wood}" ${st}/>` +          // 앉는 판
      `<rect x="-69" y="-31" width="138" height="5.5" rx="2.5" fill="${C.woodDeep}" opacity=".22"/>` +
      grain('M-60 -44 q24 -5 48 0 t48 0 M-42 -37 q20 4 40 0 t38 0');
    [[-50, -152], [50, -152], [-58, -37], [58, -37]].forEach((p) => {
      g += `<circle cx="${p[0]}" cy="${p[1]}" r="4.5" fill="${C.steelLight}" stroke="${ink}" stroke-width="2.5"/>`;
    });
    return `<g transform="translate(${x} ${y}) scale(${s})">${g}</g>`;
  }

  /* ---------- 완성품: 책장 ---------- */
  function bookshelf(x, y, s) {
    const ink = C.ink;
    const st = `stroke="${ink}" stroke-width="${SW}" stroke-linejoin="round"`;
    const thin = `stroke="${ink}" stroke-width="3.5" stroke-linejoin="round"`;
    let g = '';
    g += `<rect x="-84" y="-176" width="168" height="268" rx="9" fill="${G.woodSide}" ${st}/>`;     // 틀
    g += `<rect x="-68" y="-160" width="136" height="236" fill="#DCE9FF" ${thin}/>`;                 // 안쪽
    // 책: [x, 폭, 높이, 색], 선반 바닥 y 기준
    const row = (floor, books) => books.forEach((b) => {
      g += `<rect x="${b[0]}" y="${floor - b[2]}" width="${b[1]}" height="${b[2]}" rx="3" fill="${b[3]}" ${thin}/>`;
    });
    row(-92, [[-62, 17, 56, C.coral], [-45, 14, 48, C.yellow], [-31, 19, 60, C.mint], [-12, 14, 52, C.wall]]);
    g += `<g transform="rotate(18 34 -92)"><rect x="24" y="-146" width="16" height="54" rx="3" fill="${C.yellow}" ${thin}/></g>`;
    row(-12, [[-62, 15, 50, C.wall], [-47, 20, 62, C.coral], [14, 16, 54, C.mint], [30, 14, 46, C.yellow], [44, 18, 58, C.coral]]);
    row(70, [[-62, 22, 44, C.mint], [-40, 15, 58, C.yellow], [-25, 17, 50, C.wall], [36, 24, 40, C.coral]]);
    g += `<circle cx="14" cy="52" r="17" fill="${C.yellow}" ${thin}/>`;                              // 공
    g += `<rect x="-68" y="-92" width="136" height="13" fill="${C.plank}" ${thin}/>`;               // 선반
    g += `<rect x="-68" y="-12" width="136" height="13" fill="${C.plank}" ${thin}/>`;
    g += `<rect x="-92" y="88" width="184" height="15" rx="6" fill="${G.wood}" ${st}/>`;           // 받침
    [[-76, -166], [76, -166], [-76, 80], [76, 80]].forEach((p) => {
      g += `<circle cx="${p[0]}" cy="${p[1]}" r="4.5" fill="${C.steelLight}" stroke="${ink}" stroke-width="2.5"/>`;
    });
    return `<g transform="translate(${x} ${y}) scale(${s})">${g}</g>`;
  }

  /* ---------- 불합격: 와르르 무너진 판자 더미 ---------- */
  function pile(x, y, s) {
    const ink = C.ink;
    const st = `stroke="${ink}" stroke-width="${SW}" stroke-linejoin="round"`;
    let g = '';
    g += `<g fill="#fff" opacity=".85"><circle cx="-96" cy="62" r="20"/><circle cx="-70" cy="74" r="15"/><circle cx="98" cy="60" r="22"/><circle cx="70" cy="76" r="14"/><circle cx="0" cy="84" r="12"/></g>`;
    g += `<g transform="rotate(-40 -10 -10)"><rect x="-86" y="-24" width="160" height="26" rx="5" fill="${G.wood}" ${st}/></g>`;
    g += `<g transform="rotate(17 10 30)"><rect x="-80" y="14" width="176" height="28" rx="5" fill="${G.woodSide}" ${st}/></g>`;
    g += `<g transform="rotate(-9 0 62)"><rect x="-96" y="48" width="190" height="28" rx="5" fill="${G.wood}" ${st}/></g>`;
    g += `<g transform="rotate(64 60 -30)"><rect x="6" y="-44" width="120" height="24" rx="5" fill="${C.coral}" ${st}/></g>`;
    g += nail(-30, 50, 'bad', { dir: -1 }) + nail(44, 52, 'bad', { dir: 1 });
    return `<g transform="translate(${x} ${y}) scale(${s})">${g}</g>`;
  }

  /* ---------- 떡메치기: 떡 반죽과 돌 ---------- */
  /* state: up(반죽 덩이) perfect(반듯한 떡) good(살짝 기운 떡) bad(뭉개짐) miss, o.kind 'screw' 는 돌(치면 안 됨) */
  function dough(x, py, state, o = {}) {
    const ink = C.ink, dir = o.dir || 1, white = '#FFFDF6';
    const st = `stroke="${ink}" stroke-width="3.5" stroke-linejoin="round"`;
    if (o.kind === 'screw') {
      let g = `<path d="M${x - 22} ${py + 2} L${x - 26} ${py - 16} L${x - 12} ${py - 34} L${x + 10} ${py - 36} L${x + 26} ${py - 18} L${x + 22} ${py + 2} Z" fill="${C.steelDark}" ${st}/>` +
        `<path d="M${x - 8} ${py - 30} l6 10 l-8 8" fill="none" stroke="${ink}" stroke-width="2.5" stroke-linecap="round"/>`;
      if (state === 'bad') g += `<path d="M${x + 4} ${py - 34} l-4 14 l10 4 l-6 16" fill="none" stroke="${C.coral}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`;
      return g;
    }
    if (state === 'perfect' || state === 'good') {
      const h = state === 'perfect' ? 14 : 18;
      return `<g transform="rotate(${state === 'good' ? 6 * dir : 0} ${x} ${py})">` +
        `<rect x="${x - 30}" y="${py - h}" width="60" height="${h + 2}" rx="8" fill="${white}" ${st}/>` +
        `<path d="M${x - 14} ${py - h + 6} h3 M${x - 2} ${py - h + 8} h3 M${x + 11} ${py - h + 6} h3" stroke="${ink}" stroke-width="3" stroke-linecap="round"/></g>`;
    }
    if (state === 'bad') {
      return `<path d="M${x - 38} ${py + 2} C${x - 40} ${py - 8} ${x - 20} ${py - 6} ${x - 14} ${py - 12} C${x - 4} ${py - 4} ${x + 14} ${py - 14} ${x + 22} ${py - 6} C${x + 34} ${py - 8} ${x + 40} ${py - 2} ${x + 36} ${py + 2} Z" fill="#F1E7D0" ${st}/>`;
    }
    return `<path d="M${x - 23} ${py + 2} C${x - 28} ${py - 22} ${x - 12} ${py - 42} ${x} ${py - 42} C${x + 13} ${py - 42} ${x + 28} ${py - 22} ${x + 23} ${py + 2} Z" fill="${white}" ${st}/>` +
      `<path d="M${x - 10} ${py - 30} q6 -6 12 -3" fill="none" stroke="${C.benchEdge}" stroke-width="3" stroke-linecap="round"/>`;
  }

  /* ---------- 도장 찍기: 서류 ---------- */
  function paper(x, py, state, o = {}) {
    const ink = C.ink, dir = o.dir || 1;
    let g = `<rect x="${x - 18}" y="${py - 48}" width="36" height="50" rx="3" fill="#fff" stroke="${ink}" stroke-width="3.5"/>` +
      `<path d="M${x - 11} ${py - 38} h22 M${x - 11} ${py - 30} h22 M${x - 11} ${py - 22} h14" stroke="${C.benchEdge}" stroke-width="3" stroke-linecap="round"/>`;
    if (state === 'perfect') g += `<circle cx="${x + 5}" cy="${py - 11}" r="8" fill="none" stroke="${C.coral}" stroke-width="4"/><circle cx="${x + 5}" cy="${py - 11}" r="2.5" fill="${C.coral}"/>`;
    else if (state === 'good') g += `<circle cx="${x + 5 + 6 * dir}" cy="${py - 14}" r="8" fill="none" stroke="${C.coral}" stroke-width="4" stroke-dasharray="18 6"/>`;
    else if (state === 'bad') g += `<ellipse cx="${x + 8 * dir}" cy="${py - 14}" rx="15" ry="8" fill="${C.coral}" opacity=".45"/>`;
    return g;
  }

  /* 완성품: 접시에 쌓은 떡, 결재 끝난 서류 뭉치 */
  function tteok(x, y, s) {
    const st = `stroke="${C.ink}" stroke-width="${SW}" stroke-linejoin="round"`;
    let g = `<ellipse cx="0" cy="62" rx="104" ry="22" fill="${C.steelLight}" ${st}/><ellipse cx="0" cy="56" rx="78" ry="13" fill="${C.benchEdge}"/>`;
    [[-40, 30], [40, 30], [0, 34], [-20, -2], [22, -2], [0, -34]].forEach((p) => {
      g += `<rect x="${p[0] - 36}" y="${p[1] - 14}" width="72" height="30" rx="12" fill="#FFFDF6" ${st}/>` +
        `<path d="M${p[0] - 14} ${p[1] - 2} h4 M${p[0] + 2} ${p[1] + 2} h4 M${p[0] + 16} ${p[1] - 3} h4" stroke="${C.ink}" stroke-width="3" stroke-linecap="round"/>`;
    });
    return `<g transform="translate(${x} ${y}) scale(${s})">${g}</g>`;
  }
  function docs(x, y, s) {
    const st = `stroke="${C.ink}" stroke-width="${SW}" stroke-linejoin="round"`;
    let g = '';
    [[10, 6, 8], [-6, -2, -5], [0, -12, 2]].forEach((p) => {
      g += `<g transform="translate(${p[0]} ${p[1]}) rotate(${p[2]})"><rect x="-64" y="-84" width="128" height="164" rx="8" fill="#fff" ${st}/></g>`;
    });
    g += `<path d="M-40 -66 h80 M-40 -44 h80 M-40 -22 h56 M-40 0 h70" stroke="${C.benchEdge}" stroke-width="7" stroke-linecap="round"/>`;
    g += stamp(26, 34, 30, '결재', -14);
    return `<g transform="translate(${x} ${y}) scale(${s})">${g}</g>`;
  }

  /* 완성품 이름으로 그리기 */
  function item(kind, x, y, s) {
    if (kind === 'chair') return chair(x, y, s);
    if (kind === 'bookshelf') return bookshelf(x, y, s);
    if (kind === 'pile') return pile(x, y, s);
    if (kind === 'tteok') return tteok(x, y, s);
    if (kind === 'docs') return docs(x, y, s);
    return birdhouse(x, y, s);
  }

  /* 도장 */
  function stamp(x, y, r, label, rot, color) {
    const col = color || C.coral;
    return `<g transform="translate(${x} ${y}) rotate(${rot || -12})">` +
      `<circle r="${r}" fill="#fff" opacity=".9"/>` +
      `<circle r="${r}" fill="none" stroke="${col}" stroke-width="9"/>` +
      `<circle r="${r - 14}" fill="none" stroke="${col}" stroke-width="3.5"/>` +
      `<text x="0" y="${r * 0.2}" font-family="${FONT}" font-size="${r * (label.length > 2 ? 0.5 : 0.64)}" fill="${col}" text-anchor="middle">${esc(label)}</text>` +
      `</g>`;
  }

  global.MBArt = {
    C, G, FONT, SW, defs, text, pill, keycap, sparkle, burst, wall, saw, wrench, trySquare, bench, plankBack, plankFront,
    nail, dough, paper, bird, birdByBeak, hammer, logo, LOGO_H, birdhouse, chair, bookshelf, pile, tteok, docs, item, stamp,
    BEAK_TIP, HAMMER_PIVOT, esc
  };
})(window);
