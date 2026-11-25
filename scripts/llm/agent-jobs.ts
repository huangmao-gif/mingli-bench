// 子代理跑法：为每份报告写一个任务文件（系统设定 + 用户消息），由指定模型的子代理按文件生成报告。
// 运行：node scripts/llm/agent-jobs.ts <模型标签>   例：node scripts/llm/agent-jobs.ts claude-haiku-subagent
// 子代理把报告原文写到 results/llm/agent-out/<模型标签>/<盘>-<组>-<次>.md，再用 agent-import.ts 转成标准格式。
import { mkdirSync, writeFileSync } from 'node:fs';
import { buildJobs } from './build.ts';

const label = process.argv[2];
if (!label) throw new Error('用法：node scripts/llm/agent-jobs.ts <模型标签>');
const dir = `results/llm/agent-jobs`;
mkdirSync(dir, { recursive: true });
mkdirSync(`results/llm/agent-out/${label}`, { recursive: true });
for (const j of buildJobs(3, 1)) {
  const id = `${j.chart.id}-${j.cond}-${j.run}`;
  writeFileSync(`${dir}/${j.chart.id}-${j.cond}.md`, `# 系统设定\n\n${j.system}\n\n# 用户消息\n\n${j.user}\n`);
  void id;
}
console.log('ok');
