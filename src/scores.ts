// 六维分：把产品提示词里的 SCORES_RUBRIC 改写成确定性规则。
// 判定细则与取舍见 docs/RULES.md。
import type { Chart, DimScore, Evidence, Palace, PalaceName, RulesVersion, ScoreDim } from './types.ts';
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

/**
 * v2 修订提案（候选方案 C，选型依据见 docs/RULES-v2.md）：让分数分布以 3 为中心、两端都有。
 * 正面（累加，封顶 +2）：本宫有化禄/化权/化科 +1；本宫有六吉或禄存 +1；主星庙旺且本宫无任何负面信号 +1（庙旺无煞）。
 * 负面（累加，封顶 −2）：四煞坐宫 −1；化忌坐宫 −1；空劫坐宫 −1；化忌在对宫冲照 −1。
 * 与 v1 的区别：v1 要「庙旺且禄科同宫」才 +2，而四煞在对宫、化忌在三合都扣分，导致负面信号远多于正面。
 */
export function scorePalaceV2(chart: Chart, p: Palace): { score: number; positive: Evidence[]; negative: Evidence[] } {
  const positive: Evidence[] = [];
  const negative: Evidence[] = [];

  const opp = opposite(chart, p);
  const sha = findStars([p], FOUR_SHA);
  if (sha.length) negative.push(ev(p, `${sha.map((x) => x.star.name).join('、')}坐宫`));
  const ji = findMutagen([p], '忌');
  if (ji.length) negative.push(ev(p, `${ji.map((x) => x.star.name).join('、')}化忌坐宫`));
  const kj = findStars([p], ['地空', '地劫']);
  if (kj.length) negative.push(ev(p, `${kj.map((x) => x.star.name).join('、')}坐宫`));
  const jiOpp = findMutagen([opp], '忌');
  if (jiOpp.length) negative.push(ev(p, `${jiOpp.map((x) => x.star.name).join('、')}化忌在${opp.name}冲照`));
  const neg = Math.min(2, negative.length);

  const huaGood = p.stars.filter((s) => s.mutagen === '禄' || s.mutagen === '权' || s.mutagen === '科');
  if (huaGood.length) positive.push(ev(p, huaGood.map((s) => s.name + '化' + s.mutagen).join('、')));
  const aux = findStars([p], AUX_GOOD);
  if (aux.length) positive.push(ev(p, `辅星${aux.map((x) => x.star.name).join('、')}`));
  const strongMajors = majors(p).filter((s) => STRONG_BRIGHT.includes(s.brightness));
  if (strongMajors.length && negative.length === 0) positive.push(ev(p, `主星${strongMajors.map((s) => s.name + s.brightness).join('、')}且无煞忌`));
  const pos = Math.min(2, positive.length);

  return { score: Math.max(1, Math.min(5, 3 + pos - neg)), positive, negative };
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

export function computeScores(chart: Chart, version: RulesVersion = 'v1'): Record<ScoreDim, DimScore> {
  const scoreOne = version === 'v2' ? scorePalaceV2 : scorePalace;
  const out = {} as Record<ScoreDim, DimScore>;
  for (const dim of SCORE_DIMS) {
    const ps: Palace[] = [];
    for (const n of DIM_PALACES[dim]) {
      const p = n === '身宫' ? bodyPalace(chart) : palace(chart, n);
      if (!ps.includes(p)) ps.push(p); // 身命同宫时只算一次
    }
    const perPalace = ps.map((p) => ({ palace: p.name, ...scoreOne(chart, p) }));
    out[dim] = {
      score: combine(perPalace.map((x) => x.score)),
      palaces: ps.map((p) => p.name),
      perPalace,
    };
  }
  return out;
}
