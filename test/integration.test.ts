// 用 iztro 真实排盘做集成测试。注意：这里的期望值是对照 iztro 的宫位数据人工核对的，
// 不是对照文墨天机；文墨天机对照用例待补（见 README）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chartBySolar, computeProfile } from '../src/index.ts';
import { PALACE_NAMES } from '../src/types.ts';

test('标准化后 12 宫齐全、恰有一个身宫', () => {
  const c = chartBySolar('2000-8-16', 2, '女');
  assert.deepEqual([...c.palaces.map((p) => p.name)].sort(), [...PALACE_NAMES].sort());
  assert.equal(c.palaces.filter((p) => p.isBodyPalace).length, 1);
});

test('确定性：同一输入两次计算结果完全一致', () => {
  const a = computeProfile(chartBySolar('1995-3-7', 6, '男'));
  const b = computeProfile(chartBySolar('1995-3-7', 6, '男'));
  assert.deepEqual(a, b);
});

test('样例盘 2000-8-16 寅时 女：逐项人工核对', () => {
  // 盘面（iztro）：命宫午 紫微庙、文曲陷；迁移子 贪狼旺、铃星陷；福德申 破军得、文昌、禄存；
  // 夫妻辰 七杀庙、右弼、火星陷；交友亥 太阴庙化科；身宫在官禄戌（廉贞利、天府庙、左辅）。
  const r = computeProfile(chartBySolar('2000-8-16', 2, '女'));
  assert.deepEqual(r.scores, {
    自我觉察: 3, // 命宫：文曲 +1，铃星冲照 −1 → 3；官禄：左辅 +1，火星冲照 −1 → 3
    情绪调节: 4, // 福德：文昌、禄存 +1
    延迟满足: 3,
    关系模式: 3, // 夫妻：右弼 +1、火星坐 −2 → 2；交友：太阴庙化科 +2 → 5；均值 3.5 → 3
    不确定性容忍: 1, // 迁移：铃星坐宫
    自我叙事: 3, // (3 + 4) / 2 = 3.5 → 3
  });
  // 人物：徐庶 4 条中满足 3 条（文昌在福德，不在命宫三方四正）
  assert.equal(r.persona.name, '徐庶·孝义');
  assert.equal(r.persona.fullMatch, false);
  assert.deepEqual(r.persona.unmatched, ['命宫三方四正见文昌']);
});

test('性质测试：200 张真实盘，分数都在 1-5，人物编号都在 1-24', () => {
  for (let i = 0; i < 200; i++) {
    const y = 1960 + (i % 50);
    const m = 1 + ((i * 7) % 12);
    const d = 1 + ((i * 11) % 28);
    const c = chartBySolar(`${y}-${m}-${d}`, i % 12, i % 2 ? '男' : '女');
    const r = computeProfile(c);
    for (const v of Object.values(r.scores)) assert.ok(Number.isInteger(v) && v >= 1 && v <= 5);
    assert.ok(r.persona.id >= 1 && r.persona.id <= 24);
  }
});

test('刘备规则不可满足：紫微与太阴/天同的位置差恒为奇数（docs/RULES.md 第三节）', async () => {
  const { PERSONA_RULES, evaluatePersona } = await import('../src/persona.ts');
  const liubei = PERSONA_RULES.find((r) => r.id === 7)!;
  const mod = (x: number) => ((x % 12) + 12) % 12;
  for (let y = 1970; y < 1990; y++)
    for (let mo = 1; mo <= 12; mo += 2) {
      const c = chartBySolar(`${y}-${mo}-5`, (y + mo) % 12, '女');
      const pos = (n: string) => c.palaces.find((p) => p.stars.some((s) => s.name === n))!.position;
      const z = pos('紫微');
      assert.equal(pos('天府'), mod(-z));
      assert.equal(pos('太阴'), mod(1 - z));
      assert.equal(pos('天同'), mod(z - 5));
      assert.notEqual(evaluatePersona(c, liubei).unmatched.length, 0);
    }
});

test('参考时点四化：1973-2-27 巳时女，2026 年走甲干大限、丙年流年', () => {
  const c = chartBySolar('1973-2-27', 5, '女', '2026-6-1');
  assert.deepEqual(c.layers, [
    { label: '大限', stem: '甲', stars: { 禄: '廉贞', 权: '破军', 科: '武曲', 忌: '太阳' } },
    { label: '流年', stem: '丙', stars: { 禄: '天同', 权: '天机', 科: '文昌', 忌: '廉贞' } },
  ]);
});
