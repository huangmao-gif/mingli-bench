// LLM 评测·分析：只读 results/llm/raw/ 下的原始输出，可离线重复运行。
// 运行：node scripts/llm/analyze.ts [--model deepseek-chat]
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { chartBySolar, computeProfile, evaluatePersona, PERSONA_RULES, SCORE_DIMS } from '../../src/index.ts';
import { extractClaims, type Claim } from '../../src/citation.ts';
import type { ScoreDim } from '../../src/types.ts';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const MODEL = arg('--model', 'deepseek-chat');
const DIR = `results/llm/raw/${MODEL}`;

interface Raw { chart: { id: string; date: string; hour: number; gender: '男' | '女' }; cond: 'baseline' | 'engine'; run: number; content: string; model: string; usage: { completion_tokens: number }; finish: string; ms: number }
const raws: Raw[] = readdirSync(DIR).filter((f) => f.endsWith('.json')).sort().map((f) => JSON.parse(readFileSync(`${DIR}/${f}`, 'utf8')));

const shortName = (full: string) => full.split('·')[0];
function personaId(name: string | undefined): number | null {
  if (!name) return null;
  const r = PERSONA_RULES.find((p) => p.name === name || shortName(p.name) === shortName(name));
  return r ? r.id : null;
}

/** 严格解析 SCORES/CARD：恰好各一个、严格 JSON、6 维整数 1-5、人物在 24 人表内 */
function parseMarkers(text: string) {
  const s = [...text.matchAll(/<!--SCORES:(.*?)-->/gs)];
  const c = [...text.matchAll(/<!--CARD:(.*?)-->/gs)];
  const problems: string[] = [];
  if (s.length !== 1) problems.push(`SCORES 标记 ${s.length} 个`);
  if (c.length !== 1) problems.push(`CARD 标记 ${c.length} 个`);
  let scores: Record<string, number> | null = null;
  let persona: number | null = null;
  try {
    const o = JSON.parse(s[0]?.[1] ?? 'x');
    if (SCORE_DIMS.every((d) => Number.isInteger(o[d]) && o[d] >= 1 && o[d] <= 5)) scores = o;
    else problems.push('SCORES 维度缺失或越界');
  } catch { if (s.length) problems.push('SCORES 非合法 JSON'); }
  try {
    const o = JSON.parse(c[0]?.[1] ?? 'x');
    persona = personaId(o.name);
    if (persona === null) problems.push(`CARD 人物不在 24 人表：${o.name}`);
  } catch { if (c.length) problems.push('CARD 非合法 JSON'); }
  return { ok: problems.length === 0, problems, scores, persona };
}

const engineOf = new Map<string, ReturnType<typeof computeProfile>>();
const chartOf = new Map<string, ReturnType<typeof chartBySolar>>();
for (const r of raws) if (!engineOf.has(r.chart.id)) {
  const c = chartBySolar(r.chart.date, r.chart.hour, r.chart.gender, '2026-6-1');
  chartOf.set(r.chart.id, c);
  engineOf.set(r.chart.id, computeProfile(c));
}

const pct = (a: number, b: number) => (b ? ((100 * a) / b).toFixed(1) + '%' : '—');
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
const out: string[] = [];
const flagged: string[] = ['# 被判为错误的陈述（供人工复核校验器精度）', ''];
const summary: Record<string, unknown> = { model: MODEL, servedModels: [...new Set(raws.map((r) => r.model))], files: raws.length };

// ---------- 1. 格式合规与一致性（baseline） ----------
const base = raws.filter((r) => r.cond === 'baseline');
const parsed = base.map((r) => ({ r, m: parseMarkers(r.content) }));
const okN = parsed.filter((x) => x.m.ok).length;
const problemCount = new Map<string, number>();
for (const x of parsed) for (const p of x.m.problems) problemCount.set(p.replace(/：.*/, ''), (problemCount.get(p.replace(/：.*/, '')) ?? 0) + 1);

const byChart = new Map<string, typeof parsed>();
for (const x of parsed) byChart.set(x.r.chart.id, [...(byChart.get(x.r.chart.id) ?? []), x]);
let personaStable = 0, scoresStable = 0, chartsN = 0;
const pairDiffs: number[] = [];
let personaAgree = 0, personaN = 0;
const engineDiffs: number[] = [];
let scoreExact = 0, scoreN = 0;
for (const [id, xs] of byChart) {
  chartsN++;
  const eng = engineOf.get(id)!;
  const ps = xs.map((x) => x.m.persona);
  if (ps.every((p) => p !== null && p === ps[0])) personaStable++;
  const ss = xs.map((x) => x.m.scores);
  if (ss.every((s) => s && JSON.stringify(SCORE_DIMS.map((d) => s[d])) === JSON.stringify(SCORE_DIMS.map((d) => ss[0]?.[d])))) scoresStable++;
  for (let i = 0; i < ss.length; i++) for (let j = i + 1; j < ss.length; j++) {
    const a = ss[i], b = ss[j];
    if (a && b) for (const d of SCORE_DIMS) pairDiffs.push(Math.abs(a[d] - b[d]));
  }
  for (const x of xs) {
    if (x.m.persona !== null) { personaN++; if (x.m.persona === eng.persona.id) personaAgree++; }
    if (x.m.scores) for (const d of SCORE_DIMS) { scoreN++; const diff = Math.abs(x.m.scores[d] - eng.scores[d as ScoreDim]); engineDiffs.push(diff); if (diff === 0) scoreExact++; }
  }
}
summary.baseline = {
  markerStrictOk: okN / base.length, problems: Object.fromEntries(problemCount),
  personaStableAcrossRuns: personaStable / chartsN, scoresIdenticalAcrossRuns: scoresStable / chartsN,
  meanPairwiseScoreDiff: mean(pairDiffs), personaAgreeWithEngine: personaAgree / (personaN || 1),
  scoreExactAgreeWithEngine: scoreExact / (scoreN || 1), meanAbsDiffVsEngine: mean(engineDiffs),
};

// ---------- 1b. LLM 自选人物，按规则表实际满足多少条件 ----------
const choiceRatios: number[] = [];
let choiceFull = 0;
const perChartRows: string[] = [];
for (const [id, xs] of byChart) {
  const c = chartOf.get(id)!;
  const names = xs.map((x) => {
    const raw = x.r.content.match(/<!--CARD:(.*?)-->/s);
    let n = '（无）';
    try { n = JSON.parse(raw?.[1] ?? '').name; } catch { /* 记为无 */ }
    if (x.m.persona !== null) {
      const rule = PERSONA_RULES.find((r) => r.id === x.m.persona)!;
      const e = evaluatePersona(c, rule);
      const ratio = e.matched.length / rule.clauses.length;
      choiceRatios.push(ratio);
      if (ratio === 1) choiceFull++;
      return `${shortName(rule.name)}（${e.matched.length}/${rule.clauses.length}）`;
    }
    return `${n}（不在表内）`;
  });
  const ep = engineOf.get(id)!.persona;
  perChartRows.push(`| ${id} | ${names.join(' / ')} | ${shortName(ep.name)}（${ep.matched.length}/${ep.matched.length + ep.unmatched.length}） |`);
}
let fullCharts = 0, fullHit = 0, fullTotal = 0;
for (const [id, xs] of byChart) {
  if (!engineOf.get(id)!.persona.fullMatch) continue;
  fullCharts++;
  for (const x of xs) {
    fullTotal++;
    if (x.m.persona === null) continue;
    const rule = PERSONA_RULES.find((r) => r.id === x.m.persona)!;
    if (evaluatePersona(chartOf.get(id)!, rule).unmatched.length === 0) fullHit++;
  }
}
(summary.baseline as Record<string, number>).fullMatchHitWhereAvailable = fullHit / (fullTotal || 1);
(summary.baseline as Record<string, number>).llmChoiceMeanRatio = mean(choiceRatios);
(summary.baseline as Record<string, number>).llmChoiceFullMatch = choiceFull / (choiceRatios.length || 1);

// ---------- 2. engine 组：是否遵守给定结果 ----------
const eng = raws.filter((r) => r.cond === 'engine');
let mentions = 0, leaked = 0, otherPersona = 0;
for (const r of eng) {
  const p = engineOf.get(r.chart.id)!.persona;
  if (r.content.includes(shortName(p.name))) mentions++;
  if (/<!--(SCORES|CARD):/.test(r.content)) leaked++;
  if (PERSONA_RULES.some((q) => q.id !== p.id && r.content.includes(shortName(q.name)))) otherPersona++;
}
summary.engine = { mentionsEnginePersona: mentions / eng.length, leakedMarkers: leaked / eng.length, mentionsOtherPersona: otherPersona / eng.length };

// ---------- 3. 引用校验（两组都做） ----------
const citation: Record<string, Record<string, { n: number; wrong: number }>> = {};
for (const r of raws) {
  const body = r.content.replace(/<!--(SCORES|CARD):.*?-->/gs, '');
  const claims = extractClaims(chartOf.get(r.chart.id)!, body);
  citation[r.cond] ??= {};
  for (const c of claims) {
    const k = (citation[r.cond][c.kind] ??= { n: 0, wrong: 0 });
    k.n++;
    if (!c.ok) {
      k.wrong++;
      const i = c.at;
      flagged.push(`- **${r.chart.id}-${r.cond}-${r.run}** \`${c.kind}\` 「${c.text}」：${c.reason}　…${body.slice(Math.max(0, i - 25), i + c.text.length + 25).replace(/\n/g, ' ')}…`);
    }
  }
}
summary.citation = citation;
summary.length = Object.fromEntries(['baseline', 'engine'].map((c) => [c, {
  chars: mean(raws.filter((r) => r.cond === c).map((r) => r.content.length)),
  completionTokens: mean(raws.filter((r) => r.cond === c).map((r) => r.usage?.completion_tokens ?? 0)),
  latencyMs: mean(raws.filter((r) => r.cond === c).map((r) => r.ms)),
  truncated: raws.filter((r) => r.cond === c && r.finish !== 'stop').length,
}]));

// ---------- 报告 ----------
const b = summary.baseline as Record<string, number>;
const e = summary.engine as Record<string, number>;
out.push('# LLM 评测结果', '');
out.push(`模型：请求 \`${MODEL}\`，服务端实际返回 \`${(summary.servedModels as string[]).join(', ')}\`。共 ${raws.length} 份报告（${byChart.size} 张盘 × 2 组 × ${base.length / (byChart.size || 1)} 次）。参数与线上一致：只设 max_tokens=4000，不设 temperature / seed。`, '');
out.push('- **baseline**：线上精简报告提示词，LLM 自己打六维分、选人物，输出 SCORES/CARD 标记。');
out.push('- **engine**：同样的报告结构，六维分与人物由确定性引擎给出，LLM 只写解读。', '');
out.push('## 1. baseline：格式合规与一致性', '', '| 指标 | 结果 |', '|---|---|');
out.push(`| SCORES/CARD 严格合规（各一个、合法 JSON、6 维 1-5、人物在表内） | ${pct(okN, base.length)}（${okN}/${base.length}） |`);
out.push(`| 同一张盘 ${base.length / (byChart.size || 1)} 次生成，人物完全一致 | ${pct(personaStable, chartsN)}（${personaStable}/${chartsN} 张盘） |`);
out.push(`| 同一张盘多次生成，六维分完全一致 | ${pct(scoresStable, chartsN)}（${scoresStable}/${chartsN}） |`);
out.push(`| 同一张盘两次生成之间，单维分平均相差 | ${b.meanPairwiseScoreDiff.toFixed(2)} 分 |`);
out.push(`| 人物与引擎一致（部分匹配的盘上可能有并列，仅供参考） | ${pct(personaAgree, personaN)} |`);
out.push(`| 单维分与引擎完全一致 | ${pct(scoreExact, scoreN)}，平均相差 ${b.meanAbsDiffVsEngine.toFixed(2)} 分 |`);
out.push(`| 在存在完全匹配人物的 ${fullCharts} 张盘上，LLM 选中完全匹配人物 | **${pct(fullHit, fullTotal)}**（${fullHit}/${fullTotal}；引擎 ${fullCharts}/${fullCharts}） |`);
out.push(`| LLM 所选人物按规则表完全满足的比例（全部盘） | ${pct(choiceFull, choiceRatios.length)} |`);
out.push(`| LLM 所选人物的平均条件满足率 | ${(100 * mean(choiceRatios)).toFixed(1)}% |`, '');
out.push('逐盘人物（括号内为按规则表满足的条件数）：', '', '| 盘 | LLM 三次选择 | 引擎 |', '|---|---|---|', ...perChartRows, '');
if (problemCount.size) out.push('不合规原因：' + [...problemCount].map(([k, v]) => `${k} ×${v}`).join('；'), '');
out.push('engine 组的人物与分数由代码给出，同一张盘多次生成**按构造 100% 一致**，不需要统计。', '');
out.push('## 2. engine：LLM 是否遵守给定结果', '', '| 指标 | 结果 |', '|---|---|');
out.push(`| 正文提到引擎给出的人物 | ${pct(mentions, eng.length)} |`);
out.push(`| 正文提到其他人物（可能是改人物，也可能只是对比，需人工看） | ${pct(otherPersona, eng.length)} |`);
out.push(`| 违规输出 SCORES/CARD 标记 | ${pct(leaked, eng.length)} |`, '');
out.push('## 3. 引用校验：正文里的盘面陈述是否与命盘一致', '', '| 陈述类型 | baseline 错误率 | engine 错误率 |', '|---|---|---|');
const KIND_CN: Record<string, string> = { 'star-in-palace': '某星在某宫', mutagen: '四化（生年/大限/流年）', brightness: '星曜亮度' };
for (const k of ['star-in-palace', 'mutagen', 'brightness']) {
  const x = citation.baseline?.[k] ?? { n: 0, wrong: 0 }, y = citation.engine?.[k] ?? { n: 0, wrong: 0 };
  out.push(`| ${KIND_CN[k]} | ${pct(x.wrong, x.n)}（${x.wrong}/${x.n}） | ${pct(y.wrong, y.n)}（${y.wrong}/${y.n}） |`);
}
out.push('', '校验器是正则启发式，会漏抽，也可能误判；所有被判错的陈述列在 [`llm/flagged-' + MODEL + '.md`](llm/flagged-' + MODEL + '.md)，可逐条人工复核。', '');
out.push('## 4. 成本', '', '| 组 | 平均字数 | 平均输出 token | 平均耗时 | 被截断 |', '|---|---|---|---|---|');
for (const [c, v] of Object.entries(summary.length as Record<string, Record<string, number>>)) out.push(`| ${c} | ${v.chars.toFixed(0)} | ${v.completionTokens.toFixed(0)} | ${(v.latencyMs / 1000).toFixed(1)}s | ${v.truncated} |`);

writeFileSync(`results/LLM_EVAL-${MODEL}.md`, out.join('\n') + '\n');
writeFileSync(`results/llm/summary-${MODEL}.json`, JSON.stringify(summary, null, 2) + '\n');
writeFileSync(`results/llm/flagged-${MODEL}.md`, flagged.join('\n') + '\n');
console.log(out.join('\n'));
void e;
