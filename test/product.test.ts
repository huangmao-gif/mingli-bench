import { test } from 'node:test';
import assert from 'node:assert/strict';
import { profileFromBirth, validateBirth, engineMarkers } from '../src/product.ts';

test('profileFromBirth：同一输入结果完全一致，并给出命盘文本与事实', () => {
  const a = profileFromBirth({ date: '2000-08-16', hourIndex: 2, gender: '女' }, { refDate: '2026-6-1' });
  const b = profileFromBirth({ date: '2000-8-16', hourIndex: 2, gender: '女' }, { refDate: '2026-6-1' });
  assert.deepEqual(a.scores, b.scores);
  assert.equal(a.persona.name, '徐庶·孝义');
  assert.match(a.chartText, /文曲\[陷\]/);
  assert.match(a.chartText, /当前年份：2026/);
  assert.equal(a.facts.人物.name, '徐庶·孝义');
});

test('validateBirth 拒绝不合法输入', () => {
  assert.throws(() => validateBirth({ date: '2000/8/16', hourIndex: 2, gender: '女' }));
  assert.throws(() => validateBirth({ date: '2000-8-16', hourIndex: 13, gender: '女' }));
  assert.throws(() => validateBirth({ date: '2000-8-16', hourIndex: 2, gender: 'x' }));
});

test('engineMarkers：分数与人物取引擎结果，签名取 LLM 的', () => {
  const m = engineMarkers({ scores: { 自我觉察: 3 }, persona: { name: '徐庶·孝义' } }, { title: '甲·乙', subtitle: '丙·丁' });
  assert.equal(m, '<!--SCORES:{"自我觉察":3}-->\n<!--CARD:{"name":"徐庶","label":"徐庶","title":"甲·乙","subtitle":"丙·丁"}-->');
});
