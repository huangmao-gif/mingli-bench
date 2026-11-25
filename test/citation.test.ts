import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractClaims } from '../src/citation.ts';
import { makeChart } from './helpers.ts';

const chart = makeChart({
  命宫: ['紫微庙', '文曲陷'],
  迁移: ['贪狼旺', '铃星'],
  交友: ['太阴庙科'],
  疾厄: ['天同不忌'],
});

const verdicts = (t: string) => extractClaims(chart, t).map((c) => `${c.kind}:${c.text}:${c.ok}`);

test('星在宫：正确与错误都能识别', () => {
  assert.deepEqual(verdicts('命宫紫微坐守。'), ['star-in-palace:命宫紫微:true']);
  assert.deepEqual(verdicts('福德宫有紫微。'), ['star-in-palace:福德宫有紫微:false']);
  assert.deepEqual(verdicts('贪狼坐迁移宫。'), ['star-in-palace:贪狼坐迁移宫:true']);
});

test('宫名别名：仆役宫等同交友宫', () => {
  assert.deepEqual(verdicts('仆役宫太阴。'), ['star-in-palace:仆役宫太阴:true']);
});

test('对宫借星：在借/冲照语境下判为正确', () => {
  assert.deepEqual(verdicts('命宫借迁移贪狼，命宫贪狼主欲望。').slice(-1), ['star-in-palace:命宫贪狼:true']);
  assert.deepEqual(verdicts('命宫贪狼主欲望。'), ['star-in-palace:命宫贪狼:false']);
});

test('生年四化：一致、不一致、非生年语境跳过', () => {
  assert.deepEqual(verdicts('太阴化科。'), ['mutagen:太阴化科:true']);
  assert.deepEqual(verdicts('太阳化忌。'), ['mutagen:太阳化忌:false']);
  assert.deepEqual(verdicts('流年太阳化忌。'), []);
});

test('亮度：一致、不一致，旺盛/陷入不算', () => {
  assert.deepEqual(verdicts('紫微庙。'), ['brightness:紫微庙:true']);
  assert.deepEqual(verdicts('紫微落陷。'), ['brightness:紫微落陷:false']);
  assert.deepEqual(verdicts('贪狼旺盛，文曲陷入困境。'), []);
});

test('否定语境、流年/今年语境跳过；并列星的四化归属任一颗即可', () => {
  assert.deepEqual(verdicts('贪狼化禄未成，爆发力弱。'), []);
  assert.deepEqual(verdicts('今年廉贞化忌入财帛。'), []);
  assert.deepEqual(verdicts('流年子女宫逢紫微。'), []);
  assert.deepEqual(verdicts('太阴天梁化科给你口碑。'), ['mutagen:天梁化科:true']);
});
