// 分布评测：在固定的大样本真实命盘上跑引擎，检查规则本身是否合理。
// 样本：1960-2009 年，每月 1/11/21 日，12 个时辰（共 21,600 张盘）。性别只影响大限方向，不影响星曜落宫，固定为女。
// 输出：results/simulation.json、results/SIMULATION.md
import { writeFileSync, mkdirSync } from 'node:fs';
import { chartBySolar, computeProfile, evaluatePersona, PERSONA_RULES, SCORE_DIMS } from '../src/index.ts';
import { palace, hasStar } from '../src/chart.ts';
import type { Chart } from '../src/types.ts';

// 原提示词「X+Y」若按「命宫同宫」解读，各人物需要同时坐命的星曜组（每组任一即可）
const COLOCATION: Record<number, string[][]> = {
  1: [['天机'], ['文昌', '文曲']], 2: [['紫微'], ['七杀', '破军']], 3: [['武曲'], ['天府', '天相']],
  4: [['太阴', '天梁'], ['地空', '地劫']], 5: [['破军'], ['贪狼', '廉贞']], 6: [['七杀'], ['天相']],
  7: [['紫微'], ['天同', '太阴']], 8: [['贪狼'], ['火星', '铃星']], 9: [['火星', '铃星'], ['七杀', '武曲']],
  10: [['文昌'], ['文曲'], ['天机']], 11: [['紫微'], ['天相']], 12: [['巨门'], ['天机'], ['陀罗']],
  13: [['七杀'], ['破军'], ['火星']], 14: [['天梁'], ['文昌']], 15: [['天同'], ['天机']],
  16: [['廉贞'], ['七杀', '武曲']], 17: [['武曲'], ['贪狼'], ['陀罗']], 18: [['七杀'], ['擎羊', '火星']],
  19: [['天机'], ['文曲'], ['陀罗']], 20: [['巨门'], ['天机'], ['擎羊']], 21: [['文昌'], ['文曲'], ['天相']],
  22: [['七杀'], ['武曲']], 23: [['火星'], ['破军'], ['天刑']], 24: [['天机'], ['太阴'], ['地空']],
};

function colocated(c: Chart, groups: string[][]): boolean {
  const ming = palace(c, '命宫');
  return groups.every((g) => hasStar([ming], g));
}

const charts: { date: string; hour: number }[] = [];
for (let y = 1960; y <= 2009; y++)
  for (let m = 1; m <= 12; m++)
    for (const d of [1, 11, 21])
      for (let h = 0; h < 12; h++) charts.push({ date: `${y}-${m}-${d}`, hour: h });

const N = charts.length;
const chosen = new Map<number, number>();
const fullPossible = new Map<number, number>();
const coloc = new Map<number, number>();
const scoreHist: Record<string, number[]> = Object.fromEntries(SCORE_DIMS.map((d) => [d, [0, 0, 0, 0, 0]]));
let topFull = 0;
let ratioSum = 0;

for (const { date, hour } of charts) {
  const c = chartBySolar(date, hour, '女');
  const r = computeProfile(c);
  chosen.set(r.persona.id, (chosen.get(r.persona.id) ?? 0) + 1);
  if (r.persona.fullMatch) topFull++;
  ratioSum += r.persona.matchRatio;
  for (const d of SCORE_DIMS) scoreHist[d][r.scores[d] - 1]++;
  for (const rule of PERSONA_RULES) {
    if (evaluatePersona(c, rule).unmatched.length === 0) fullPossible.set(rule.id, (fullPossible.get(rule.id) ?? 0) + 1);
    if (colocated(c, COLOCATION[rule.id])) coloc.set(rule.id, (coloc.get(rule.id) ?? 0) + 1);
  }
}

const pct = (x: number) => ((100 * x) / N).toFixed(2) + '%';
const rows = PERSONA_RULES.map((r) => ({
  id: r.id,
  name: r.name,
  chosen: chosen.get(r.id) ?? 0,
  fullMatchAnywhere: fullPossible.get(r.id) ?? 0,
  colocationPossible: coloc.get(r.id) ?? 0,
}));

const summary = {
  sample: { charts: N, years: '1960-2009', days: [1, 11, 21], hours: 12, gender: '女', iztro: '2.5.8' },
  topPersonaFullMatchRate: topFull / N,
  meanTopMatchRatio: ratioSum / N,
  personas: rows,
  scoreHistogram: scoreHist,
};

mkdirSync('results', { recursive: true });
writeFileSync('results/simulation.json', JSON.stringify(summary, null, 2) + '\n');

const md: string[] = [];
md.push('# 分布评测结果', '', `样本：${N.toLocaleString()} 张 iztro 2.5.8 排出的命盘（1960-2009 年，每月 1/11/21 日 × 12 时辰）。由 \`npm run simulate\` 生成，可复算。`, '');
md.push(`- 最终选中人物为「完全匹配」的比例：**${pct(topFull)}**`);
md.push(`- 选中人物的平均条件满足率：**${(100 * summary.meanTopMatchRatio).toFixed(1)}%**`, '');
md.push('## 24 人物', '', '| # | 人物 | 被选中 | 完全满足（三方四正解读） | 星曜组合可同坐命宫（同宫解读） |', '|---|---|---|---|---|');
for (const r of rows) md.push(`| ${r.id} | ${r.name} | ${r.chosen} (${pct(r.chosen)}) | ${r.fullMatchAnywhere} (${pct(r.fullMatchAnywhere)}) | ${r.colocationPossible === 0 ? '**0：不可能**' : `${r.colocationPossible} (${pct(r.colocationPossible)})`} |`);
md.push('', '## 六维分分布', '', '| 维度 | 1 | 2 | 3 | 4 | 5 |', '|---|---|---|---|---|---|');
for (const d of SCORE_DIMS) md.push(`| ${d} | ${scoreHist[d].map(pct).join(' | ')} |`);
writeFileSync('results/SIMULATION.md', md.join('\n') + '\n');
console.log(md.join('\n'));
