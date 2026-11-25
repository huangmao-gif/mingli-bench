import { test } from 'node:test';
import assert from 'node:assert/strict';
import { combine, computeScores, scorePalace } from '../src/scores.ts';
import { palace } from '../src/chart.ts';
import { makeChart } from './helpers.ts';

const ming = (stars: Parameters<typeof makeChart>[0]) => {
  const c = makeChart(stars);
  return scorePalace(c, palace(c, '命宫')).score;
};

test('无任何信号 → 3（原规则：不确定时一律 3）', () => {
  assert.equal(ming({}), 3);
});

test('主星庙旺 + 化禄/化科落入 → 5', () => {
  assert.equal(ming({ 命宫: ['紫微庙禄'] }), 5);
  assert.equal(ming({ 命宫: ['天府旺', '文昌科'] }), 5);
});

test('主星不庙旺，即使化禄也不到 5', () => {
  assert.equal(ming({ 命宫: ['天同平禄'] }), 3);
});

test('辅星正面支持 → 4', () => {
  assert.equal(ming({ 命宫: ['左辅'] }), 4);
  assert.equal(ming({ 命宫: ['禄存'] }), 4);
});

test('四煞坐宫 / 化忌坐宫 / 化忌冲照 → 1', () => {
  assert.equal(ming({ 命宫: ['擎羊'] }), 1);
  assert.equal(ming({ 命宫: ['巨门陷忌'] }), 1);
  assert.equal(ming({ 迁移: ['太阳陷忌'] }), 1);
});

test('空劫坐宫 / 四煞在对宫 / 化忌在三合宫 → 2', () => {
  assert.equal(ming({ 命宫: ['地空'] }), 2);
  assert.equal(ming({ 迁移: ['陀罗'] }), 2);
  assert.equal(ming({ 官禄: ['廉贞忌'] }), 2);
});

test('强正面与强负面同时出现 → 相互抵消为 3', () => {
  assert.equal(ming({ 命宫: ['紫微庙禄', '擎羊'] }), 3);
});

test('分数始终截断在 1-5', () => {
  assert.equal(ming({ 命宫: ['紫微庙禄', '左辅', '右弼'] }), 5);
  assert.equal(ming({ 命宫: ['擎羊', '地空', '巨门忌'], 迁移: ['陀罗忌'] }), 1);
});

test('多宫合并：恰好 .5 时向 3 靠拢', () => {
  assert.equal(combine([4, 5]), 4);
  assert.equal(combine([1, 2]), 2);
  assert.equal(combine([2, 3]), 3);
  assert.equal(combine([3, 4]), 3);
  assert.equal(combine([1, 5]), 3);
  assert.equal(combine([5, 5]), 5);
});

test('身命同宫时自我觉察只计一个宫', () => {
  const s = computeScores(makeChart({ 命宫: ['紫微庙禄'] }, { body: '命宫' }));
  assert.deepEqual(s.自我觉察.palaces, ['命宫']);
  assert.equal(s.自我觉察.score, 5);
});

test('身宫在别处时，自我觉察合并命宫与身宫', () => {
  const s = computeScores(makeChart({ 命宫: ['紫微庙禄'], 官禄: ['擎羊'] }, { body: '官禄' }));
  assert.deepEqual(s.自我觉察.palaces, ['命宫', '官禄']);
  assert.equal(s.自我觉察.score, 3); // (5 + 1) / 2
});

test('每个分数都附带可引用的依据', () => {
  const s = computeScores(makeChart({ 福德: ['天同庙禄'], 财帛: ['陀罗'] }));
  const fu = s.情绪调节.perPalace[0];
  assert.equal(fu.score, 4); // 正面强 +2；财帛是福德的对宫，陀罗冲照 −1
  assert.ok(fu.positive.some((e) => e.detail.includes('天同庙')));
  assert.ok(fu.negative.some((e) => e.detail.includes('陀罗')));
});
