// 六维分：把产品提示词里的 SCORES_RUBRIC 改写成确定性规则。
// 判定细则与取舍见 docs/RULES.md。
import type { Chart, DimScore, Evidence, Palace, PalaceName, ScoreDim } from './types.ts';
import { SCORE_DIMS } from './types.ts';
import {
  AUX_GOOD, FOUR_SHA, STRONG_BRIGHT, bodyPalace, findMutagen, findStars, majors, opposite, palace, trines,
} from './chart.ts';

/** 维度 → 宫位（来自原 SCORES_RUBRIC 的「维度-宫位参照」） */
export const DIM_PALACES: Record<ScoreDim, (PalaceName | '身宫')[]> = {
  自我觉察: ['命宫', '身宫'],
  情绪调节: ['福德'],
  延迟满足: ['财帛', '官禄'],
  关系模式: ['夫妻', '交友'],
  不确定性容忍: ['迁移'],
  自我叙事: ['命宫', '福德'],
};

const ev = (p: Palace, detail: string): Evidence => ({ palace: p.name, detail });

/** 单宫原始分：以 3 为基准，正面最多 +2，负面最多 −2，再截断到 1-5 */
export function scorePalace(chart: Chart, p: Palace): { score: number; positive: Evidence[]; negative: Evidence[] } {
  const positive: Evidence[] = [];
  const negative: Evidence[] = [];

  // 正面·强（5 分锚点）：主星庙旺，且本宫有化禄或化科
  const strongMajors = majors(p).filter((s) => STRONG_BRIGHT.includes(s.brightness));
  const luKe = p.stars.filter((s) => s.mutagen === '禄' || s.mutagen === '科');
  const posStrong = strongMajors.length > 0 && luKe.length > 0;
  if (posStrong) {
    positive.push(ev(p, `主星${strongMajors.map((s) => s.name + s.brightness).join('、')} + ${luKe.map((s) => s.name + '化' + s.mutagen).join('、')}`));
  }
  // 正面·弱（4 分锚点）：本宫有昌曲/魁钺/禄存/左右
  const aux = findStars([p], AUX_GOOD);
  if (aux.length > 0) positive.push(ev(p, `辅星${aux.map((x) => x.star.name).join('、')}`));
  const pos = posStrong ? 2 : aux.length > 0 ? 1 : 0;

  // 负面·强（1 分锚点）：化忌坐本宫或冲本宫（对宫），或四煞坐本宫
  const opp = opposite(chart, p);
  const jiIn = findMutagen([p], '忌');
  const jiOpp = findMutagen([opp], '忌');
  const shaIn = findStars([p], FOUR_SHA);
  for (const x of jiIn) negative.push(ev(p, `${x.star.name}化忌坐宫`));
  for (const x of jiOpp) negative.push(ev(p, `${x.star.name}化忌在${opp.name}冲照`));
  for (const x of shaIn) negative.push(ev(p, `${x.star.name}坐宫`));
  const negStrong = jiIn.length + jiOpp.length + shaIn.length > 0;

  // 负面·弱（2 分锚点）：空劫坐本宫、四煞在对宫、化忌在三合宫
  const kongJie = findStars([p], ['地空', '地劫']);
  const shaOpp = findStars([opp], FOUR_SHA);
  const jiTrine = findMutagen(trines(chart, p), '忌');
  for (const x of kongJie) negative.push(ev(p, `${x.star.name}坐宫`));
  for (const x of shaOpp) negative.push(ev(p, `${x.star.name}在${opp.name}冲照`));
  for (const x of jiTrine) negative.push(ev(p, `${x.star.name}化忌在三合宫${x.palace.name}`));
  const neg = negStrong ? 2 : kongJie.length + shaOpp.length + jiTrine.length > 0 ? 1 : 0;

  const score = Math.max(1, Math.min(5, 3 + pos - neg));
  return { score, positive, negative };
}

/** 多宫合并：取平均；恰好 .5 时向 3 靠拢（对应原规则「不确定时一律给 3 分」） */
export function combine(scores: number[]): 1 | 2 | 3 | 4 | 5 {
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const floor = Math.floor(mean);
  let r: number;
  if (mean - floor === 0.5) r = mean > 3 ? floor : floor + 1;
  else r = Math.round(mean);
  return Math.max(1, Math.min(5, r)) as 1 | 2 | 3 | 4 | 5;
}

export function computeScores(chart: Chart): Record<ScoreDim, DimScore> {
  const out = {} as Record<ScoreDim, DimScore>;
  for (const dim of SCORE_DIMS) {
    const ps: Palace[] = [];
    for (const n of DIM_PALACES[dim]) {
      const p = n === '身宫' ? bodyPalace(chart) : palace(chart, n);
      if (!ps.includes(p)) ps.push(p); // 身命同宫时只算一次
    }
    const perPalace = ps.map((p) => ({ palace: p.name, ...scorePalace(chart, p) }));
    out[dim] = {
      score: combine(perPalace.map((x) => x.score)),
      palaces: ps.map((p) => p.name),
      perPalace,
    };
  }
  return out;
}
