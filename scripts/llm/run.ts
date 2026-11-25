// LLM 评测·生成：每张盘 × 两组提示词 × 多次重复，原始输出全部落盘到 results/llm/raw/。
// 运行：DEEPSEEK_API_KEY=... NODE_USE_ENV_PROXY=1 node scripts/llm/run.ts [--runs 3] [--model deepseek-chat]
// 已存在的输出文件会跳过，可断点续跑。
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import iztro from 'iztro';
import { fromIztro, computeProfile } from '../../src/index.ts';
import { BASELINE_SYSTEM, ENGINE_SYSTEM } from './prompts.ts';
import { CHARTS } from './charts.ts';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const RUNS = Number(arg('--runs', '3'));
const MODEL = arg('--model', 'deepseek-chat');
const KEY = process.env.DEEPSEEK_API_KEY;
if (!KEY) throw new Error('需要环境变量 DEEPSEEK_API_KEY');
const OUT = `results/llm/raw/${MODEL}`;
mkdirSync(OUT, { recursive: true });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function chartText(a: any): string {
  const star = (s: any) => s.name + (s.brightness || '') + (s.mutagen ? '化' + s.mutagen : '');
  const lines = [
    `性别：${a.gender}　公历：${a.solarDate}　农历：${a.lunarDate}　干支：${a.chineseDate}`,
    `五行局：${a.fiveElementsClass}　命主：${a.soul}　身主：${a.body}　当前年份：2026`,
    '',
  ];
  for (const p of a.palaces) {
    const name = p.name === '仆役' ? '交友' : p.name;
    lines.push(
      `【${name}${p.isBodyPalace ? '（身宫）' : ''}】${p.heavenlyStem}${p.earthlyBranch}　大限${p.decadal.range[0]}-${p.decadal.range[1]}岁　${p.changsheng12}`,
      `  主星：${p.majorStars.map(star).join('、') || '无（空宫）'}`,
      `  辅煞：${p.minorStars.map(star).join('、') || '无'}`,
      `  杂曜：${p.adjectiveStars.map((s: any) => s.name).join('、') || '无'}`,
    );
  }
  return lines.join('\n');
}

async function call(system: string, user: string) {
  const t0 = Date.now();
  for (let attempt = 1; ; attempt++) {
    try {
      const r = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
        // 与线上一致：只设 max_tokens（精简档 4000），不设 temperature / seed
        body: JSON.stringify({ model: MODEL, max_tokens: 4000, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
        signal: AbortSignal.timeout(300_000),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(`HTTP ${r.status} ${JSON.stringify(j).slice(0, 200)}`);
      return { content: j.choices[0].message.content as string, model: j.model, usage: j.usage, finish: j.choices[0].finish_reason, ms: Date.now() - t0 };
    } catch (e) {
      if (attempt >= 3) throw e;
      await new Promise((res) => setTimeout(res, 3000 * attempt));
    }
  }
}

const sha = (s: string) => createHash('sha256').update(s).digest('hex').slice(0, 12);
const jobs: (() => Promise<void>)[] = [];
for (const c of CHARTS) {
  const a = iztro.astro.bySolar(c.date, c.hour, c.gender, true, 'zh-CN');
  const text = chartText(a);
  const profile = computeProfile(fromIztro(a));
  const facts = JSON.stringify({
    六维分: profile.scores,
    六维依据: Object.fromEntries(Object.entries(profile.scoreDetail).map(([k, v]) => [k, v.perPalace.map((p) => ({ 宫位: p.palace, 分: p.score, 加分: p.positive.map((e) => e.detail), 减分: p.negative.map((e) => e.detail) }))])),
    人物: { name: profile.persona.name, fullMatch: profile.persona.fullMatch, 满足: profile.persona.matched, 未满足: profile.persona.unmatched },
  });
  const conds = {
    baseline: { system: BASELINE_SYSTEM, user: `【命盘数据】\n${text}` },
    engine: { system: ENGINE_SYSTEM, user: `【命盘数据】\n${text}\n\n【规则引擎结果】\n${facts}` },
  };
  for (const [cond, msg] of Object.entries(conds))
    for (let run = 1; run <= RUNS; run++) {
      const file = `${OUT}/${c.id}-${cond}-${run}.json`;
      if (existsSync(file)) continue;
      jobs.push(async () => {
        const res = await call(msg.system, msg.user);
        writeFileSync(file, JSON.stringify({ chart: c, cond, run, requestedModel: MODEL, systemSha: sha(msg.system), userSha: sha(msg.user), ...res }, null, 2) + '\n');
        console.log(`done ${file} ${res.ms}ms ${res.usage?.completion_tokens}tok ${res.finish}`);
      });
    }
}

console.log(`待生成 ${jobs.length} 份`);
let next = 0;
await Promise.all(Array.from({ length: 6 }, async () => { while (next < jobs.length) await jobs[next++](); }));
