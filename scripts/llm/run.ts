// LLM 评测·生成：每张盘 × 两组提示词 × 多次重复，原始输出全部落盘到 results/llm/raw/。
// 运行：DEEPSEEK_API_KEY=... NODE_USE_ENV_PROXY=1 node scripts/llm/run.ts [--runs 3] [--model deepseek-chat]
// 已存在的输出文件会跳过，可断点续跑。
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { buildJobs } from './build.ts';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const RUNS = Number(arg('--runs', '3'));
const MODEL = arg('--model', 'deepseek-chat');
const KEY = process.env.DEEPSEEK_API_KEY;
if (!KEY) throw new Error('需要环境变量 DEEPSEEK_API_KEY');
const OUT = `results/llm/raw/${MODEL}`;
mkdirSync(OUT, { recursive: true });

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
for (const job of buildJobs(RUNS)) {
  const file = `${OUT}/${job.chart.id}-${job.cond}-${job.run}.json`;
  if (existsSync(file)) continue;
  jobs.push(async () => {
    const res = await call(job.system, job.user);
    writeFileSync(file, JSON.stringify({ chart: job.chart, cond: job.cond, run: job.run, requestedModel: MODEL, systemSha: sha(job.system), userSha: sha(job.user), ...res }, null, 2) + '\n');
    console.log(`done ${file} ${res.ms}ms ${res.usage?.completion_tokens}tok ${res.finish}`);
  });
}

console.log(`待生成 ${jobs.length} 份`);
let next = 0;
await Promise.all(Array.from({ length: 6 }, async () => { while (next < jobs.length) await jobs[next++](); }));
