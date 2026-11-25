// 把子代理写出的 .md 报告转成与 API 跑法相同的 JSON，供 analyze.ts 使用。
// 运行：node scripts/llm/agent-import.ts <模型标签>
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { CHARTS } from './charts.ts';

const label = process.argv[2];
const src = `results/llm/agent-out/${label}`;
const out = `results/llm/raw/${label}`;
mkdirSync(out, { recursive: true });
let n = 0;
for (const f of readdirSync(src).filter((x) => x.endsWith('.md'))) {
  const m = f.match(/^(c\d+)-(baseline|engine)-(\d+)\.md$/);
  if (!m) continue;
  const content = readFileSync(`${src}/${f}`, 'utf8').trim();
  const chart = CHARTS.find((c) => c.id === m[1])!;
  writeFileSync(`${out}/${m[1]}-${m[2]}-${m[3]}.json`, JSON.stringify({ chart, cond: m[2], run: Number(m[3]), requestedModel: label, model: label, content, usage: { completion_tokens: 0 }, finish: 'stop', ms: 0 }, null, 2) + '\n');
  n++;
}
console.log(`导入 ${n} 份`);
