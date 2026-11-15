/* 못박자! — 스테이지와 박자표, 배경음
 *
 * 박자표 표기: 한 마디의 앞 세 박을 공백으로 나눠 적는다(넷째 박은 차례 신호와 판자 교체 자리).
 * 한 박을 글자 수만큼 등분한다.  x = 못, o = 나사, - = 쉼
 *   'x x x'      한 박씩 세 번
 *   'x xx x'     둘째 박에 반 박 못 두 개
 *   'xx-- x x'   첫 박에 따닥못(16분 두 개)
 *   'xxx x x'    첫 박에 따다닥못(셋잇단)
 * 세트는 문자열(점수 있음)이거나 { p, practice: true, cap: [듣기 안내, 치기 안내] } (점수 없는 연습)이다.
 */
(function (global) {
  'use strict';
  const MB = (global.MB = global.MB || {});

  function parse(p) {
    const beats = p.trim().split(/\s+/);
    if (beats.length !== 3) throw new Error('박자표는 세 박이어야 한다: ' + p);
    const out = [];
    beats.forEach((grp, b) => {
      const n = grp.length;
      for (let i = 0; i < n; i++) {
        const ch = grp[i];
        if (ch === 'x' || ch === 'o') out.push({ t: b + i / n, kind: ch === 'o' ? 'screw' : 'nail' });
        else if (ch !== '-') throw new Error('모르는 글자 "' + ch + '": ' + p);
      }
    });
    return out;
  }

  const P = (p, listen, hit) => ({ p, practice: true, cap: [listen, hit] });

  const STAGES = [
    {
      id: 'p0', no: '연습', name: '첫 출근', bpm: 100, item: null, tutorial: true,
      style: 'p0', prog: ['C', 'F', 'G', 'C'], cue: [76, 79],
      sets: [
        P('x x x', '사부가 못을 세우는 박자를 들어 보세요', '같은 박자로 {tap}!'),
        P('x x x', '한 번 더. "자!" 소리 다음이 내 차례예요', '망치가 못 위에 왔을 때 누르세요'),
        P('x - x', '쉬는 박이 있어요. 간격을 잘 들어 보세요', '쉬는 박에서는 누르지 않아요'),
        P('x x xx', '끝에 반 박 못이 두 개 나와요', '마지막 두 번은 조금 빠르게'),
        P('xx x x', '이번에는 처음이 빨라요', '빠르게 두 번, 그다음 한 박씩'),
        P('x xx x', '마지막 연습이에요', '잘했어요. 이제 진짜 일을 하러 가요')
      ]
    },
    {
      id: 's1', no: '1', name: '새집 짓기', bpm: 120, item: 'birdhouse', hints: 2,
      style: 's1', prog: ['C', 'Am', 'F', 'G'], cue: [76, 79],
      lines: { S: '흠, 이 정도면 새도 살겠군!', A: '비는 안 새겠어. 합격!', F: '새가 도망가겠는걸. 다시!' },
      sets: [
        'x x x', 'x x xx', 'xx x x', 'x xx x',
        'xx xx x', 'x xx xx', 'xx x xx', 'xx xx xx',
        'x -x x', 'xx -x x', 'x -x xx', '-x xx x',
        'xx xx -x', 'xx -x xx', '-x -x x', 'xx xx xx'
      ]
    },
    {
      /* 의자 만들기는 드릴 게임이다 (js/game2.js 의 DRILL). d = [[시작 박, 길이], …], 길이는 0.5 / 1 / 2 박 */
      id: 's2', game: 'drill', no: '2', name: '의자 만들기', bpm: 120, item: 'chair',
      style: 's2', prog: ['F', 'Dm', 'Bb', 'C'], cue: [77, 81],
      lines: { S: '앉아도 꿈쩍 안 하는군. 명품이야!', A: '조금 삐걱대지만 앉을 만해.', F: '앉자마자 와르르겠어. 다시!' },
      sets: [
        { d: [[0, 1], [2, 1]], practice: true, cap: ['사부가 부리로 "위이잉" 조이는 길이를 들어 보세요', '똑같은 소리가 나게, 같은 길이만큼 누르고 있다가 떼세요'] },
        { d: [[0, 2]], practice: true, cap: ['이번에는 두 박짜리 긴 "위이이잉"이에요', '두 박 동안 꾹 누르고 있다가 떼세요'] },
        { d: [[0, 1], [2, 1]] }, { d: [[0, 2]] }, { d: [[0, 1], [1.5, 1]] }, { d: [[0, 0.5], [1, 0.5], [2, 1]] },
        { d: [[0, 2], [2.5, 0.5]] }, { d: [[0, 0.5], [1, 2]] }, { d: [[0, 1], [1.5, 0.5], [2.5, 0.5]] }, { d: [[0.5, 1], [2, 1]] },
        { d: [[0, 0.5], [1, 1], [2.5, 0.5]] }, { d: [[0, 1], [1.5, 0.5], [2, 1]] }, { d: [[0.5, 0.5], [1.5, 0.5], [2.5, 0.5]] }, { d: [[0, 2], [2.5, 0.5]] }
      ]
    },
    {
      id: 's3', no: '3', name: '책장 납품', bpm: 150, item: 'bookshelf',
      style: 's3', prog: ['Am', 'F', 'C', 'G'], cue: [76, 81],
      lines: { S: '책을 가득 꽂아도 끄떡없겠어!', A: '책 몇 권은 버티겠군. 합격!', F: '책 한 권에도 무너지겠어. 다시!' },
      sets: [
        P('xxx - x', '따다닥못이에요. 한 박에 고르게 세 번', '고르게 세 번 치세요'),
        P('x xxx x', '한 번 더 들어 보세요', '똑, 따다닥, 똑'),
        'xxx x x', 'x xxx x', 'x x xxx', 'xxx x xx', 'xx xxx x', 'xxx xxx x',
        P('x o x', '빨간 나사가 나와요. "끼릭" 소리가 나사예요', '나사는 치지 말고 지나가세요'),
        P('o x x', '한 번 더 들어 보세요', '나사만 빼고 치세요'),
        'x o x', 'x x o', 'xx o x', 'o xx x', 'x xo x', 'xo x xx',
        'xx-- xxx x', 'x -x xo', 'xxx o xx--', 'xx xxx x'
      ]
    },

    /* ---------- 다른 게임들: game 으로 그림과 소리가 바뀐다 (js/game.js 의 THEMES). open = 처음부터 열려 있다 ---------- */
    {
      /* 떡방아 (js/game2.js 의 POUND). 한 마디를 반 박 8칸으로 적는다: h = 할멈 손(한 박 뒤에 친다), f = 속임수, - = 쉼.
         손 칸의 두 칸 뒤는 내가 치는 자리라 손이 올 수 없고, 마지막 두 칸(7·8번째)에도 손을 두지 않는다 */
      id: 't1', game: 'pound', open: true, no: '떡 1', name: '쿵떡 떡방아', bpm: 112, item: 'tteok',
      style: 's1', prog: ['G', 'Em', 'C', 'D'], cue: [79, 83],
      lines: { S: '쫄깃쫄깃! 잔칫상에 올려도 되겠어.', A: '먹을 만한 떡이군.', F: '이건 떡이 아니라 죽이야. 다시!' },
      bars: [
        { p: 'h---h---', practice: true, cap: '할멈이 "철썩" 하면 한 박 뒤에 쿵!' },
        { p: 'h---h---', practice: true, cap: '손이 빠진 다음에 내리쳐요' },
        { p: 'h-------', practice: true, cap: '아래 박자 줄에 칠 자리가 미리 보여요' },
        { p: 'h---h---', practice: true, cap: '할멈 손이 있을 때 치면 "아야!"' },
        'h---h---', 'h---h---', 'hh------', 'h---h---', 'h---hh--', 'hh--h---', 'h---h---', 'hh--hh--',
        '-h---h--', 'h---h---', 'hh---h--', 'h---hh--', 'hh--hh--', '-h--h---', 'h---h---', 'hh--hh--',
        'h----h--', 'hh--h---', '-h---h--', 'hh--hh--', 'h---hh--', 'hh---h--', 'hh--hh--', 'h---h---'
      ]
    },
    {
      id: 't2', game: 'pound', no: '떡 2', name: '속임수 떡방아', bpm: 132, item: 'tteok',
      style: 's3', prog: ['Am', 'F', 'C', 'G'], cue: [76, 81],
      lines: { S: '한 번도 안 속았군. 명품 떡이야!', A: '이 정도면 잔치는 치르겠어.', F: '할멈 손이 남아나질 않겠다. 다시!' },
      bars: [
        { p: 'h---f---', practice: true, cap: '손만 들었다 빼면 속임수예요. 치지 마세요' },
        { p: 'f---h---', practice: true, cap: '진짜 "철썩"만 한 박 뒤에 쳐요' },
        'h---h---', 'h---f---', 'hh--h---', 'f---hh--', 'h---hh--', 'hh--f---', 'hf--h---', 'hh--hh--',
        '-h---h--', 'f---h---', 'hh---h--', 'h---hf--', 'hh--hh--', 'f---f---', 'h---hh--', 'hh--hh--',
        'hf--hh--', '-h--h---', 'hh--f---', 'f---hh--', 'hh--hh--', 'h---hf--', 'hf--hf--', 'hh--hh--',
        'h---h---', 'hh---h--', 'hf--hh--', 'hh--hh--'
      ]
    },
    {
      /* 결재 쾅쾅 (js/game2.js 의 STAMP). 박자표는 떡방아와 같다: h = 결재 서류(들어온 지 한 박 뒤에 찍는다), f = 광고지(찍으면 안 됨) */
      id: 'd1', game: 'stamp', open: true, no: '도장', name: '결재 쾅쾅', bpm: 126, item: 'docs',
      style: 's2', prog: ['F', 'Dm', 'Bb', 'C'], cue: [77, 81],
      lines: { S: '도장이 칼같이 찍혔군. 결재 완료!', A: '조금 삐뚤지만 통과!', F: '서류가 엉망이야. 다시!' },
      bars: [
        { p: 'h---h---', practice: true, cap: '서류가 도장 자리에 딱 놓일 때 쾅!' },
        { p: 'h---h---', practice: true, cap: '"착" 소리가 난 지 한 박 뒤예요' },
        { p: 'h---f---', practice: true, cap: '노란 광고지는 찍지 마세요' },
        'h---h---', 'hh--h---', 'h---hh--', 'f---h---', 'hh--hh--', 'h---f---', '-h---h--', 'hh--f---',
        'hf--h---', 'hh---h--', 'f---hh--', 'hh--hh--', 'h---hf--', '-h--h---', 'hf--hh--', 'hh--hh--',
        'f---f---', 'hh--h---', 'h---hh--', 'hf--hf--', 'hh---h--', 'hh--hh--', 'h---h---', 'hh--hh--'
      ]
    }
  ];

  /* ---------- 배경음 ---------- */
  const CHORD = {
    C: { r: 48, q: 'M' }, F: { r: 53, q: 'M' }, G: { r: 55, q: 'M' }, Am: { r: 57, q: 'm' },
    Dm: { r: 50, q: 'm' }, Bb: { r: 58, q: 'M' }, Em: { r: 52, q: 'm' }, D: { r: 50, q: 'M' }
  };
  const chordCache = {};
  // tr = 조옮김(반음). 스테이지 막바지에 한 음 올려서 달아오르게 한다
  function chord(name, tr) {
    tr = tr || 0;
    const key = name + ':' + tr;
    if (chordCache[key]) return chordCache[key];
    const c = CHORD[name];
    const r = c.r + tr;
    const third = c.q === 'M' ? 4 : 3;
    let bass = r - 12;
    if (bass > 46) bass -= 12;
    return (chordCache[key] = { bass, tri: [r + 12, r + 12 + third, r + 19] });
  }

  // 스테이지 3 가락: 마디마다 [16분 칸, 음, 길이(칸)]
  const MEL3 = [
    [[0, 76, 2], [2, 74, 2], [4, 72, 2], [6, 69, 4], [12, 72, 2], [14, 74, 2]],
    [[0, 72, 2], [2, 69, 2], [4, 65, 4], [8, 69, 2], [10, 72, 4]],
    [[0, 76, 2], [2, 79, 2], [4, 76, 2], [6, 72, 4], [12, 76, 2], [14, 79, 2]],
    [[0, 74, 2], [2, 71, 2], [4, 67, 4], [8, 71, 2], [10, 74, 4]]
  ];

  /* 스테이지별 반주.
   * s = 마디 안의 16분 칸(0–15), E = 달아오른 정도(0–3, 스테이지가 진행될수록 악기가 늘어난다),
   * hit = 치기 마디인가(치기 마디는 네 박 모두 킥을 넣어 밀어붙인다) */
  const STYLE = {
    p0(V, t, s, ch, spb, bar, E, hit) {
      if (s % 8 === 0 || (hit && s % 4 === 0)) V.kick(t, 0.85);
      if (s === 4 || s === 12) V.snare(t, 0.55);
      if (s % 2 === 0) V.hat(t, 0.42);
      if (s === 0) V.bass(t, ch.bass, spb * 0.9, 0.9);
      if (s === 6) V.bass(t, ch.bass + 12, spb * 0.4, 0.7);
      if (s === 8) V.bass(t, ch.bass + 7, spb * 0.9, 0.8);
      if (s === 14) V.bass(t, ch.bass + 7, spb * 0.4, 0.7);
      if (s % 4 === 2) ch.tri.forEach((m) => V.marimba(t, m, 0.5));
    },
    s1(V, t, s, ch, spb, bar, E, hit) {
      if (s % 8 === 0 || ((hit || E >= 2) && s % 4 === 0)) V.kick(t, 1);
      if (s === 4 || s === 12) V.snare(t, 0.9);
      if (s % 2 === 0) V.hat(t, s % 4 === 2 ? 0.6 : 0.4); else if (E >= 1) V.hat(t, 0.22);
      const bs = { 0: 0, 3: 0, 6: 12, 8: 7, 10: 7, 12: 0, 14: 7 };
      if (bs[s] != null) V.bass(t, ch.bass + bs[s], spb * 0.42);
      if (s % 4 === 2) ch.tri.forEach((m) => V.marimba(t, m, 0.6));
      if (E >= 2 && s % 2 === 0) V.lead(t, ch.tri[[0, 2, 1, 2, 0, 2, 1, 2][s / 2]] + 12, spb * 0.28, 0.5);
      if (E >= 3 && s % 4 === 0) V.marimba(t, ch.tri[2] + 12, 0.5);
    },
    s2(V, t, s, ch, spb, bar, E, hit) {
      if (s === 0 || s === 6 || s === 8 || (hit && s % 4 === 0)) V.kick(t, 1);
      if (s === 4 || s === 12) V.snare(t, 0.9);
      if (s % 2 === 0) V.hat(t, 0.45, s === 14); else if (E >= 1) V.hat(t, 0.22);
      const bs = { 0: 0, 3: 0, 6: 12, 8: 7, 11: 7, 14: 0 };
      if (bs[s] != null) V.bass(t, ch.bass + bs[s], spb * 0.42);
      if (s === 2 || s === 10 || (E >= 2 && s === 6)) ch.tri.forEach((m) => V.marimba(t, m, 0.6));
      if (s % 2 === 0) V.lead(t, ch.tri[[0, 1, 2, 1, 0, 1, 2, 1][s / 2]] + 12, spb * 0.3, 0.55);
      if (E >= 3 && s % 2 === 1) V.lead(t, ch.tri[2] + 24, spb * 0.2, 0.35);
    },
    s3(V, t, s, ch, spb, bar, E, hit, tr) {
      if (s % 4 === 0) V.kick(t, 1);
      if (s === 4 || s === 12) V.snare(t, 0.95);
      V.hat(t, s % 2 === 0 ? 0.42 : 0.2, s === 14);
      if (s % 2 === 0) V.bass(t, ch.bass + (s % 4 === 2 ? 12 : 0), spb * 0.4);
      if (s % 4 === 2) ch.tri.forEach((m) => V.marimba(t, m, 0.55));
      const mel = MEL3[bar % 4];
      for (let i = 0; i < mel.length; i++) {
        if (mel[i][0] !== s) continue;
        V.lead(t, mel[i][1] + tr, spb * mel[i][2] * 0.22, 0.75);
        if (E >= 2) V.lead(t, mel[i][1] + tr + 12, spb * mel[i][2] * 0.2, 0.35);
      }
    }
  };

  /* 16분 한 칸의 배경음을 예약한다. bar 0 은 시작 전에 세는 마디.
   * info = { hit: 치기 마디인가, energy: 0–3, tr: 조옮김 } */
  function bgm(stage, V, t, s, bar, spb, info) {
    if (bar === 0) {                                   // 세는 마디: 스네어가 점점 세게 굴러 들어온다
      if (s % 4 === 0) V.kick(t, 0.9);
      if (s % 2 === 0) V.hat(t, 0.45);
      if (s >= 12) V.snare(t, 0.35 + (s - 12) * 0.2);
      return;
    }
    const b = bar - 1;
    const soft = stage.tutorial ? 0.7 : 1;
    STYLE[stage.style](V, t, s, chord(stage.prog[b % stage.prog.length], info.tr), spb, b, info.energy, info.hit, info.tr || 0);
    if (!info.hit) {
      if (s === 0) V.crash(t, 0.8 * soft);             // 세트 머리의 심벌
      if (s >= 12) V.snare(t, (0.3 + (s - 12) * 0.17) * soft);   // 내 차례로 넘어가는 스네어 롤
    } else {
      if (s === 0) V.crash(t, 0.5 * soft);
      if (s === 4 || s === 12) V.clap(t, 0.8 * soft);  // 치기 마디의 박수
      if (s === 12) V.riser(t, spb, 0.7 * soft);       // 다음 판자로 넘어가는 바람 소리
    }
  }

  /* 마지막 한 방 */
  function bgmEnd(stage, V, t, spb, tr) {
    const ch = chord(stage.prog[0], tr);
    V.kick(t, 1);
    V.crash(t, 1);
    V.bass(t, ch.bass, spb * 2);
    ch.tri.forEach((m) => V.marimba(t, m, 0.9));
    V.marimba(t, ch.tri[0] + 12, 0.7);
  }

  MB.Stages = STAGES;
  MB.Charts = { parse, bgm, bgmEnd, stageById: (id) => STAGES.find((s) => s.id === id) };
})(window);
