import type { Chart, RulesVersion } from './types.ts';
import { computeScores } from './scores.ts';
import { matchPersona } from './persona.ts';

export * from './types.ts';
export { chartBySolar, fromIztro } from './normalize.ts';
export { computeScores, scorePalace, scorePalaceV2, combine, DIM_PALACES } from './scores.ts';
export { matchPersona, evaluatePersona, PERSONA_RULES, PERSONA_RULES_V2, rulesFor } from './persona.ts';
export { extractClaims } from './citation.ts';
export { profileFromBirth, validateBirth, engineMarkers } from './product.ts';
export type { BirthInput } from './product.ts';

/** 产品侧唯一入口：同一张盘永远得到同一结果，LLM 只负责解释这里的事实 */
export function computeProfile(chart: Chart, opts: { rules?: RulesVersion } = {}) {
  const rules = opts.rules ?? 'v1';
  const scores = computeScores(chart, rules);
  const persona = matchPersona(chart, rules);
  return {
    rules,
    scores: Object.fromEntries(Object.entries(scores).map(([k, v]) => [k, v.score])),
    scoreDetail: scores,
    persona,
  };
}
