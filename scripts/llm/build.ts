// 拼装每份报告的 system / user 消息（API 跑法与子代理跑法共用）
import iztro from 'iztro';
import { fromIztro, computeProfile } from '../../src/index.ts';
import { BASELINE_SYSTEM, ENGINE_SYSTEM } from './prompts.ts';
import { CHARTS } from './charts.ts';
import { FREE_PREVIEW_PROMPT_PROD, NO_QUESTIONNAIRE_NOTE } from './prompt-free-prod.ts';

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

/**
 * 线上前端实际发送的命盘文本（照搬 minglijinxin/src/components/AnalysisView.tsx + BirthModal.tsx）：
 * 只有星名与四化，没有亮度、杂曜、长生十二神、大限、出生日期与性别。
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function prodChartText(a: any): string {
  let t = '## 命盘信息\n';
  for (const p of a.palaces) {
    const st: string[] = [], fs: string[] = [], sh: string[] = [];
    for (const s of p.majorStars || []) { st.push(s.name); if (s.mutagen) sh.push(s.name + '化' + s.mutagen); }
    for (const s of p.minorStars || []) { fs.push(s.name); if (s.mutagen) sh.push(s.name + '化' + s.mutagen); }
    t += `### ${p.name}（${p.earthlyBranch}）`;
    if (p.isDestinyPalace || p.name === '命宫') t += ' [命宫]';
    if (p.isBodyPalace || p.name === '身宫') t += ' [身宫]';
    t += '\n';
    if (st.length) t += '主星：' + st.join('、') + '\n';
    if (fs.length) t += '辅星：' + fs.join('、') + '\n';
    if (sh.length) t += '四化：' + sh.join('、') + '\n';
  }
  const cd = (a.chineseDate || '').split(' ');
  t += `\n四柱：${cd[0] || ''} ${cd[1] || ''} ${cd[2] || ''} ${cd[3] || ''}\n五行局：${a.fiveElementsClass}\n纳音：${a.fiveElementsClass || ''}\n`;
  return t;
}

export interface Job { chart: (typeof CHARTS)[number]; cond: 'baseline' | 'engine'; run: number; system: string; user: string }

/** baseline 跑 runs 次；engine 结果由引擎确定，默认也跑 runs 次（engineRuns 可单独指定） */
export function buildJobs(runs: number, engineRuns = runs, opts: { prodText?: boolean } = {}): Job[] {
  const jobs: Job[] = [];
  for (const c of CHARTS) {
    const a = iztro.astro.bySolar(c.date, c.hour, c.gender, true, 'zh-CN');
    const text = opts.prodText ? prodChartText(a) : chartText(a);
    const profile = computeProfile(fromIztro(a));
    const facts = JSON.stringify({
      六维分: profile.scores,
      六维依据: Object.fromEntries(Object.entries(profile.scoreDetail).map(([k, v]) => [k, v.perPalace.map((p) => ({ 宫位: p.palace, 分: p.score, 加分: p.positive.map((e) => e.detail), 减分: p.negative.map((e) => e.detail) }))])),
      人物: { name: profile.persona.name, fullMatch: profile.persona.fullMatch, 满足: profile.persona.matched, 未满足: profile.persona.unmatched },
    });
    // 线上复现：免费档系统提示词 + 线上前端的命盘文本 + 未填问卷提示，与 lib/report-gen.js 免费档完全一致
    if (opts.prodText) { for (let run = 1; run <= runs; run++) jobs.push({ chart: c, cond: 'baseline', run, system: FREE_PREVIEW_PROMPT_PROD, user: text + NO_QUESTIONNAIRE_NOTE }); continue; }
    for (let run = 1; run <= runs; run++) jobs.push({ chart: c, cond: 'baseline', run, system: BASELINE_SYSTEM, user: `【命盘数据】\n${text}` });
    for (let run = 1; run <= engineRuns; run++) jobs.push({ chart: c, cond: 'engine', run, system: ENGINE_SYSTEM, user: `【命盘数据】\n${text}\n\n【规则引擎结果】\n${facts}` });
  }
  return jobs;
}
