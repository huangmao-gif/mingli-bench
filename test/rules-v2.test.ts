import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PERSONA_RULES_V2, evaluatePersona, matchPersona } from '../src/persona.ts';
import { scorePalaceV2, computeScores } from '../src/scores.ts';
import { palace } from '../src/chart.ts';
import { makeChart } from './helpers.ts';

test('v2 刘备：天同化科坐命 + 左辅，兄弟宫旺 → 完全满足（v1 中不可能）', () => {
  const c = makeChart({ 命宫: ['天同庙科', '左辅'], 兄弟: ['天府庙'] });
  const e = evaluatePersona(c, PERSONA_RULES_V2.find((r) => r.id === 7)!);
  assert.deepEqual(e.unmatched, []);
  const off = evaluatePersona(makeChart({ 财帛: ['天同庙科'], 命宫: ['左辅'] }), PERSONA_RULES_V2.find((r) => r.id === 7)!);
  assert.ok(off.unmatched.includes('天同或太阴化科坐命宫或身宫'));
});

test('v2：核心条件全满足者优先于整体比例更高但核心不全者', () => {
  // 魏延（核心 2 条全满足、无辅助）vs 张飞（核心火铃+杀武满足，但福德无煞 → 2/3）
  const c = makeChart({ 命宫: ['七杀庙', '擎羊'] });
  const r = matchPersona(c, 'v2');
  assert.equal(r.coreMatch, true);
  assert.equal(r.name, '魏延·反骨');
});

test('v2 每条规则都标注了核心条件数，且不超过条件总数', () => {
  for (const r of PERSONA_RULES_V2) assert.ok(r.core! >= 1 && r.core! <= r.clauses.length, r.name);
});

const v2 = (stars: Parameters<typeof makeChart>[0]) => { const c = makeChart(stars); return scorePalaceV2(c, palace(c, '命宫')).score; };

test('v2 单宫打分：正负各自累加、各封顶 2', () => {
  assert.equal(v2({}), 3);
  assert.equal(v2({ 命宫: ['紫微庙'] }), 4);          // 庙旺无煞 +1
  assert.equal(v2({ 命宫: ['紫微庙权', '左辅'] }), 5); // 庙旺 +1、化权 +1、辅星 +1 → 封顶 +2
  assert.equal(v2({ 命宫: ['擎羊'] }), 2);            // 四煞坐 −1
  assert.equal(v2({ 迁移: ['陀罗'] }), 3);            // v2 不计对宫四煞
  assert.equal(v2({ 命宫: ['巨门陷忌', '地空'], 迁移: ['太阳忌'] }), 1); // 封顶 −2
  assert.equal(v2({ 命宫: ['紫微庙', '擎羊'] }), 2);  // 有煞时庙旺不加分，擎羊 −1
  assert.equal(v2({ 命宫: ['紫微庙禄', '擎羊'] }), 3); // 化禄 +1、擎羊 −1 抵消
});

test('computeScores 默认仍为 v1', () => {
  const c = makeChart({ 命宫: ['紫微庙'] });
  assert.equal(computeScores(c).自我觉察.score, 3);
  assert.equal(computeScores(c, 'v2').自我觉察.score, 4);
});

test('v2 性质：选中人物的核心条件满足比例是所有人物里最高的（200 张真实盘）', async () => {
  const { chartBySolar } = await import('../src/normalize.ts');
  const coreRatio = (c: Parameters<typeof evaluatePersona>[0], r: (typeof PERSONA_RULES_V2)[number]) => {
    const e = evaluatePersona(c, r);
    return r.clauses.slice(0, r.core).filter((cl) => e.matched.includes(cl.desc)).length / r.core!;
  };
  for (let i = 0; i < 200; i++) {
    const c = chartBySolar(`${1950 + (i % 60)}-${1 + ((i * 5) % 12)}-${1 + ((i * 7) % 28)}`, i % 12, '女');
    const pick = matchPersona(c, 'v2');
    const best = Math.max(...PERSONA_RULES_V2.map((r) => coreRatio(c, r)));
    assert.equal(coreRatio(c, PERSONA_RULES_V2.find((r) => r.id === pick.id)!), best);
  }
});
