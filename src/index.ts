import type { Chart } from './types.ts';
import { computeScores } from './scores.ts';
import { matchPersona } from './persona.ts';

export * from './types.ts';
export { chartBySolar, fromIztro } from './normalize.ts';
export { computeScores, scorePalace, combine, DIM_PALACES } from './scores.ts';
export { matchPersona, evaluatePersona, PERSONA_RULES } from './persona.ts';

/** 产品侧唯一入口：同一张盘永远得到同一结果，LLM 只负责解释这里的事实 */
export function computeProfile(chart: Chart) {
  const scores = computeScores(chart);
  const persona = matchPersona(chart);
  return {
    scores: Object.fromEntries(Object.entries(scores).map(([k, v]) => [k, v.score])),
    scoreDetail: scores,
    persona,
  };
}
