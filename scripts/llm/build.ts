// 拼装每份报告的 system / user 消息（API 跑法与子代理跑法共用）
import iztro from 'iztro';
import { fromIztro, computeProfile } from '../../src/index.ts';
import { BASELINE_SYSTEM, ENGINE_SYSTEM } from './prompts.ts';
import { CHARTS } from './charts.ts';

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

export interface Job { chart: (typeof CHARTS)[number]; cond: 'baseline' | 'engine'; run: number; system: string; user: string }

/** baseline 跑 runs 次；engine 结果由引擎确定，默认也跑 runs 次（engineRuns 可单独指定） */
export function buildJobs(runs: number, engineRuns = runs): Job[] {
  const jobs: Job[] = [];
  for (const c of CHARTS) {
    const a = iztro.astro.bySolar(c.date, c.hour, c.gender, true, 'zh-CN');
    const text = chartText(a);
    const profile = computeProfile(fromIztro(a));
    const facts = JSON.stringify({
      六维分: profile.scores,
      六维依据: Object.fromEntries(Object.entries(profile.scoreDetail).map(([k, v]) => [k, v.perPalace.map((p) => ({ 宫位: p.palace, 分: p.score, 加分: p.positive.map((e) => e.detail), 减分: p.negative.map((e) => e.detail) }))])),
      人物: { name: profile.persona.name, fullMatch: profile.persona.fullMatch, 满足: profile.persona.matched, 未满足: profile.persona.unmatched },
    });
    for (let run = 1; run <= runs; run++) jobs.push({ chart: c, cond: 'baseline', run, system: BASELINE_SYSTEM, user: `【命盘数据】\n${text}` });
    for (let run = 1; run <= engineRuns; run++) jobs.push({ chart: c, cond: 'engine', run, system: ENGINE_SYSTEM, user: `【命盘数据】\n${text}\n\n【规则引擎结果】\n${facts}` });
  }
  return jobs;
}
