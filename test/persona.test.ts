import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PERSONA_RULES, evaluatePersona, matchPersona } from '../src/persona.ts';
import { makeChart } from './helpers.ts';

test('规则表共 24 条，编号连续、名称不重复', () => {
  assert.equal(PERSONA_RULES.length, 24);
  assert.deepEqual(PERSONA_RULES.map((r) => r.id), Array.from({ length: 24 }, (_, i) => i + 1));
  assert.equal(new Set(PERSONA_RULES.map((r) => r.name)).size, 24);
});

test('曹操：紫微 + 七杀，化权入命 → 完全匹配', () => {
  const r = matchPersona(makeChart({ 命宫: ['紫微旺', '七杀平权'] }));
  assert.equal(r.name, '曹操·枭雄');
  assert.equal(r.fullMatch, true);
});

test('星曜组合按命宫三方四正判断（不要求同宫）', () => {
  // 七杀与天相在真实命盘里永远不同宫；按同宫解读，赵云这条规则永远无法满足
  const c = makeChart({ 命宫: ['七杀庙', '禄存'], 财帛: ['天相得'] });
  const e = evaluatePersona(c, PERSONA_RULES.find((r) => r.id === 6)!);
  assert.deepEqual(e.unmatched, []);
});

test('赵云：命宫或迁移见煞 → 「无煞冲破」不满足', () => {
  const c = makeChart({ 命宫: ['七杀庙', '禄存'], 财帛: ['天相得'], 迁移: ['擎羊'] });
  const e = evaluatePersona(c, PERSONA_RULES.find((r) => r.id === 6)!);
  assert.deepEqual(e.unmatched, ['命宫、迁移无六煞']);
});

test('「庙旺」只修饰紧邻的前一颗星：关羽的天府落陷则不满足', () => {
  const rule = PERSONA_RULES.find((r) => r.id === 3)!;
  const ok = evaluatePersona(makeChart({ 命宫: ['武曲平', '天府庙', '擎羊'] }), rule);
  const bad = evaluatePersona(makeChart({ 命宫: ['武曲庙', '天府陷', '擎羊'] }), rule);
  assert.equal(ok.unmatched.length, 0);
  assert.equal(bad.unmatched.length, 1);
});

test('同为完全匹配时，条件更多（更具体）的人物优先', () => {
  // 同时满足 魏延（2 条）与 张飞（3 条）
  const c = makeChart({ 命宫: ['七杀庙', '火星'], 福德: ['陀罗'] });
  const r = matchPersona(c);
  assert.equal(r.fullMatch, true);
  assert.equal(r.name, '张飞·烈刃');
});

test('没有完全匹配时，仍返回比例最高者，并列出未满足条件', () => {
  const r = matchPersona(makeChart({}));
  assert.equal(r.fullMatch, false);
  assert.ok(r.unmatched.length > 0);
  assert.equal(r.runnersUp.length, 3);
});
