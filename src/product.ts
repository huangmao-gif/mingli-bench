// 产品侧一站式入口：出生信息 → 命盘文本 + 确定性结果 + 交给 LLM 的事实 JSON + 最终 SCORES/CARD 标记
import iztro from 'iztro';
import type { RulesVersion } from './types.ts';
import { fromIztro } from './normalize.ts';
import { computeScores } from './scores.ts';
import { matchPersona } from './persona.ts';

export interface BirthInput {
  /** 公历日期 'YYYY-M-D' 或 'YYYY-MM-DD'（已按真太阳时校正） */
  date: string;
  /** iztro 时辰序号 0-12（0=早子，12=晚子） */
  hourIndex: number;
  gender: '男' | '女';
}

export function validateBirth(b: unknown): BirthInput {
  const x = b as Record<string, unknown>;
  if (!x || typeof x !== 'object') throw new Error('birth 缺失');
  const date = String(x.date ?? '');
  const m = date.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!m || +m[1] < 1900 || +m[1] > 2100 || +m[2] < 1 || +m[2] > 12 || +m[3] < 1 || +m[3] > 31) throw new Error('birth.date 不合法');
  const hourIndex = Number(x.hourIndex);
  if (!Number.isInteger(hourIndex) || hourIndex < 0 || hourIndex > 12) throw new Error('birth.hourIndex 不合法');
  const gender = x.gender;
  if (gender !== '男' && gender !== '女') throw new Error('birth.gender 不合法');
  return { date, hourIndex, gender };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function chartText(a: any, refYear: number): string {
  // 亮度放在方括号里，避免「太阴不化忌」被读成「太阴不化忌（没有化忌）」
  const star = (s: any) => s.name + (s.brightness ? `[${s.brightness}]` : '') + (s.mutagen ? '化' + s.mutagen : '');
  const lines = [
    `性别：${a.gender}　公历：${a.solarDate}　农历：${a.lunarDate}　干支：${a.chineseDate}`,
    `五行局：${a.fiveElementsClass}　命主：${a.soul}　身主：${a.body}　当前年份：${refYear}`,
    '（星曜后方括号内为亮度：庙、旺、得、利、平、不、陷）',
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

export function profileFromBirth(birth: BirthInput, opts: { rules?: RulesVersion; refDate?: string } = {}) {
  const b = validateBirth(birth);
  const rules = opts.rules ?? 'v1';
  const refDate = opts.refDate ?? `${new Date().getFullYear()}-6-1`;
  const a = iztro.astro.bySolar(b.date, b.hourIndex, b.gender, true, 'zh-CN');
  const chart = fromIztro(a, refDate);
  const scoreDetail = computeScores(chart, rules);
  const scores = Object.fromEntries(Object.entries(scoreDetail).map(([k, v]) => [k, v.score]));
  const persona = matchPersona(chart, rules);
  const facts = {
    规则版本: rules,
    六维分: scores,
    六维依据: Object.fromEntries(Object.entries(scoreDetail).map(([k, v]) => [k, v.perPalace.map((p) => ({ 宫位: p.palace, 分: p.score, 加分: p.positive.map((e) => e.detail), 减分: p.negative.map((e) => e.detail) }))])),
    人物: { name: persona.name, fullMatch: persona.fullMatch, 满足: persona.matched, 未满足: persona.unmatched },
  };
  return { birth: b, rules, chart, scores, persona, facts, chartText: chartText(a, Number(refDate.slice(0, 4))) };
}

/** 生成最终的 SCORES/CARD 标记：分数与人物以引擎为准，主/副签名取 LLM 写的（缺省时用默认文案） */
export function engineMarkers(p: { scores: Record<string, number>; persona: { name: string } }, card: { title?: string; subtitle?: string } = {}): string {
  const name = p.persona.name.split('·')[0];
  return `<!--SCORES:${JSON.stringify(p.scores)}-->\n<!--CARD:${JSON.stringify({ name, label: name, title: card.title || p.persona.name.split('·')[1] || name, subtitle: card.subtitle || '命盘定骨架 · 问卷定血肉' })}-->`;
}
