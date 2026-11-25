// iztro 排盘结果 → 引擎标准结构
import iztro from 'iztro';
import type { Brightness, Chart, Mutagen, MutagenLayer, PalaceName, Star } from './types.ts';
import { PALACE_NAMES } from './types.ts';

const NAME_ALIAS: Record<string, PalaceName> = { 仆役: '交友', 交友: '交友' };
const MUTAGENS = new Set(['禄', '权', '科', '忌']);

function toPalaceName(raw: string): PalaceName {
  const n = NAME_ALIAS[raw] ?? (raw as PalaceName);
  if (!(PALACE_NAMES as readonly string[]).includes(n)) throw new Error(`未知宫名：${raw}`);
  return n;
}

function toStar(s: { name: string; type: string; brightness?: string; mutagen?: string | null }): Star {
  return {
    name: s.name,
    type: s.type,
    brightness: (s.brightness ?? '') as Brightness,
    mutagen: s.mutagen && MUTAGENS.has(s.mutagen) ? (s.mutagen as Mutagen) : null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function fromIztro(astrolabe: any, refDate?: string): Chart {
  let layers: MutagenLayer[] | undefined;
  if (refDate) {
    const h = astrolabe.horoscope(refDate);
    const layer = (label: string, x: { heavenlyStem: string; mutagen: string[] }): MutagenLayer => ({
      label, stem: x.heavenlyStem, stars: { 禄: x.mutagen[0], 权: x.mutagen[1], 科: x.mutagen[2], 忌: x.mutagen[3] },
    });
    layers = [layer('大限', h.decadal), layer('流年', h.yearly)];
  }
  // 十年覆盖全部十个天干，用排盘库自己的四化表
  const stemTable: Record<string, Record<Mutagen, string>> = {};
  for (let y = 2024; y < 2034; y++) {
    const x = astrolabe.horoscope(`${y}-6-1`).yearly;
    stemTable[x.heavenlyStem] = { 禄: x.mutagen[0], 权: x.mutagen[1], 科: x.mutagen[2], 忌: x.mutagen[3] };
  }
  return {
    ...(layers ? { layers } : {}),
    stemTable,
    palaces: astrolabe.palaces.map((p: any, i: number) => ({
      name: toPalaceName(p.name),
      position: i,
      isBodyPalace: Boolean(p.isBodyPalace),
      changsheng: p.changsheng12 ?? '',
      stars: [...p.majorStars, ...p.minorStars, ...p.adjectiveStars].map(toStar),
    })),
  };
}

/**
 * 按公历生日排盘。
 * @param date 'YYYY-M-D'
 * @param hourIndex iztro 时辰序号 0-12（0=早子，12=晚子）
 * @param refDate 参考日期（如 '2026-6-1'），给出时附带该时点的大限、流年四化
 */
export function chartBySolar(date: string, hourIndex: number, gender: '男' | '女', refDate?: string): Chart {
  return fromIztro(iztro.astro.bySolar(date, hourIndex, gender, true, 'zh-CN'), refDate);
}
