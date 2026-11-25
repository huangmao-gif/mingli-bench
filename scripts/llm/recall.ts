// 校验器召回率估计：在真实报告里随机把一处主星名换成另一颗主星（人为制造错误），看校验器能抓到多少。
// 这类替换不一定都会让陈述变错（换上的星可能恰好也在那个宫），所以得到的是召回率的下界。
// 运行：node scripts/llm/recall.ts   输出：results/llm/RECALL.md
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { chartBySolar } from '../../src/index.ts';
import { extractClaims } from '../../src/citation.ts';

const MAJORS = ['紫微', '天机', '太阳', '武曲', '天同', '廉贞', '天府', '太阴', '贪狼', '巨门', '天相', '天梁', '七杀', '破军'];
const PER_REPORT = 10;
let seed = 20261125;
const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

const rows: { model: string; injected: number; caught: number; extractable: number }[] = [];
for (const model of readdirSync('results/llm/raw')) {
  const dir = `results/llm/raw/${model}`;
  if (!existsSync(dir)) continue;
  const row = { model, injected: 0, caught: 0, extractable: 0 };
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
    const r = JSON.parse(readFileSync(`${dir}/${f}`, 'utf8'));
    const chart = chartBySolar(r.chart.date, r.chart.hour, r.chart.gender, '2026-6-1');
    const body: string = r.content.replace(/<!--(SCORES|CARD):.*?-->/gs, '');
    const before = new Set(extractClaims(chart, body).filter((c) => !c.ok).map((c) => `${c.at}|${c.text}`));
    const spots: { at: number; star: string }[] = [];
    for (const s of MAJORS) for (let i = body.indexOf(s); i >= 0; i = body.indexOf(s, i + 1)) spots.push({ at: i, star: s });
    for (let k = 0; k < PER_REPORT && spots.length; k++) {
      const { at, star } = spots.splice(Math.floor(rand() * spots.length), 1)[0];
      const others = MAJORS.filter((x) => x !== star);
      const to = others[Math.floor(rand() * others.length)];
      const mutated = body.slice(0, at) + to + body.slice(at + star.length);
      row.injected++;
      const claims = extractClaims(chart, mutated);
      // 被抽取到：替换位置落在某条陈述里
      const touching = claims.filter((c) => c.at <= at && at < c.at + c.text.length + 2);
      if (touching.length) row.extractable++;
      if (touching.some((c) => !c.ok && !before.has(`${c.at}|${c.text}`))) row.caught++;
    }
  }
  rows.push(row);
}

const pct = (a: number, b: number) => `${((100 * a) / b).toFixed(1)}%（${a}/${b}）`;
const tot = rows.reduce((a, r) => ({ injected: a.injected + r.injected, caught: a.caught + r.caught, extractable: a.extractable + r.extractable }), { injected: 0, caught: 0, extractable: 0 });
const md = ['# 校验器召回率估计（随机主星替换）', '',
  `每份报告随机挑最多 ${PER_REPORT} 处主星名，各自替换成另一颗主星，看校验器是否新判出错误。`, '',
  '| 模型 | 注入 | 替换处落在可核对陈述里 | 被抓到（召回下界） | 在可核对陈述里被抓到 |', '|---|---|---|---|---|'];
for (const r of [...rows, { model: '合计', ...tot }]) md.push(`| ${r.model} | ${r.injected} | ${pct(r.extractable, r.injected)} | ${pct(r.caught, r.injected)} | ${pct(r.caught, r.extractable)} |`);
md.push('', '解读：「替换处落在可核对陈述里」衡量校验器能覆盖多少主星提及；其余提及（如「紫微的帝王气质」这类描述）本来就无法对盘核对。替换后的星有时恰好也在那个宫，此时不算错，所以「被抓到」是召回率的下界。');
writeFileSync('results/llm/RECALL.md', md.join('\n') + '\n');
console.log(md.join('\n'));
