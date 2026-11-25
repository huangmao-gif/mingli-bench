// 跨模型对比：每个模型只取 baseline 第 1 次运行，在相同的盘上比较。
// 运行：node scripts/llm/compare.ts deepseek-chat claude-haiku-subagent claude-sonnet-subagent
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { chartBySolar, computeProfile, evaluatePersona, PERSONA_RULES, SCORE_DIMS } from '../../src/index.ts';
import { extractClaims } from '../../src/citation.ts';
import { CHARTS } from './charts.ts';

const models = process.argv.slice(2);
const short = (n: string) => n.split('·')[0];
const pct = (a: number, b: number) => (b ? `${((100 * a) / b).toFixed(0)}%（${a}/${b}）` : '—');

interface Row { model: string; n: number; ok: number; inTable: number; fullWhereAvail: number; availN: number; ratioSum: number; zero: number; scoreExact: number; scoreN: number; diffSum: number; claims: number; wrong: number; chars: number; overLen: number; picks: Record<string, string> }
const rows: Row[] = [];
const wrongList: string[] = [];

for (const model of models) {
  const r: Row = { model, n: 0, ok: 0, inTable: 0, fullWhereAvail: 0, availN: 0, ratioSum: 0, zero: 0, scoreExact: 0, scoreN: 0, diffSum: 0, claims: 0, wrong: 0, chars: 0, overLen: 0, picks: {} };
  for (const c of CHARTS) {
    const f = `results/llm/raw/${model}/${c.id}-baseline-1.json`;
    if (!existsSync(f)) continue;
    const text: string = JSON.parse(readFileSync(f, 'utf8')).content;
    const chart = chartBySolar(c.date, c.hour, c.gender);
    const eng = computeProfile(chart);
    r.n++;
    const body = text.replace(/<!--(SCORES|CARD):.*?-->/gs, '').trim();
    r.chars += body.length;
    if (body.length > 1800 * 1.2) r.overLen++;
    const S = [...text.matchAll(/<!--SCORES:(.*?)-->/gs)], K = [...text.matchAll(/<!--CARD:(.*?)-->/gs)];
    let scores: Record<string, number> | null = null, name = '';
    try { const o = JSON.parse(S[0][1]); if (SCORE_DIMS.every((d) => Number.isInteger(o[d]) && o[d] >= 1 && o[d] <= 5)) scores = o; } catch { /* 不合规 */ }
    try { name = JSON.parse(K[0][1]).name; } catch { /* 不合规 */ }
    const rule = PERSONA_RULES.find((p) => p.name === name || short(p.name) === short(name || '?'));
    if (S.length === 1 && K.length === 1 && scores && rule) r.ok++;
    if (rule) {
      r.inTable++;
      const e = evaluatePersona(chart, rule);
      const ratio = e.matched.length / rule.clauses.length;
      r.ratioSum += ratio;
      if (ratio === 0) r.zero++;
      if (eng.persona.fullMatch) { r.availN++; if (ratio === 1) r.fullWhereAvail++; }
      r.picks[c.id] = `${short(rule.name)} ${e.matched.length}/${rule.clauses.length}`;
    } else {
      if (eng.persona.fullMatch) r.availN++;
      r.picks[c.id] = `${name || '无'}（表外）`;
    }
    if (scores) for (const d of SCORE_DIMS) { r.scoreN++; const df = Math.abs(scores[d] - eng.scores[d]); r.diffSum += df; if (df === 0) r.scoreExact++; }
    for (const cl of extractClaims(chart, body)) {
      r.claims++;
      if (!cl.ok) { r.wrong++; const i = body.indexOf(cl.text); wrongList.push(`- **${model} ${c.id}** \`${cl.kind}\` 「${cl.text}」：${cl.reason}　…${body.slice(Math.max(0, i - 25), i + cl.text.length + 25).replace(/\n/g, ' ')}…`); }
    }
  }
  rows.push(r);
}

const md: string[] = ['# 跨模型对比（baseline 第 1 次运行）', '', '同一批 10 张盘、同一份线上精简提示词。DeepSeek 通过 API 调用；Claude 两个模型通过 Claude Code 子代理生成（带子代理自身的系统提示，条件与 API 调用不完全相同，见 README）。', ''];
md.push(`| 指标 | ${rows.map((r) => r.model).join(' | ')} |`, `|---|${rows.map(() => '---').join('|')}|`);
const line = (label: string, f: (r: Row) => string) => md.push(`| ${label} | ${rows.map(f).join(' | ')} |`);
line('报告数', (r) => String(r.n));
line('SCORES/CARD 严格合规', (r) => pct(r.ok, r.n));
line('存在完全匹配人物时选中它', (r) => pct(r.fullWhereAvail, r.availN));
line('所选人物平均条件满足率', (r) => `${(100 * r.ratioSum / (r.inTable || 1)).toFixed(0)}%`);
line('所选人物零条件满足', (r) => pct(r.zero, r.n));
line('单维分与引擎完全一致', (r) => pct(r.scoreExact, r.scoreN));
line('单维分与引擎平均相差', (r) => (r.diffSum / (r.scoreN || 1)).toFixed(2));
line('盘面陈述判错率', (r) => pct(r.wrong, r.claims));
line('平均正文字数（要求 1200-1800）', (r) => (r.chars / (r.n || 1)).toFixed(0));
line('超长 20% 以上', (r) => pct(r.overLen, r.n));
md.push('', '## 逐盘人物选择（按规则表满足的条件数）', '', `| 盘 | 引擎 | ${rows.map((r) => r.model).join(' | ')} |`, `|---|---|${rows.map(() => '---').join('|')}|`);
for (const c of CHARTS) {
  const e = computeProfile(chartBySolar(c.date, c.hour, c.gender)).persona;
  md.push(`| ${c.id} | ${short(e.name)} ${e.matched.length}/${e.matched.length + e.unmatched.length} | ${rows.map((r) => r.picks[c.id] ?? '—').join(' | ')} |`);
}
md.push('', '## 被判错的陈述（逐条人工复核用）', '', ...wrongList);
writeFileSync('results/LLM_COMPARE.md', md.join('\n') + '\n');
console.log(md.join('\n'));
