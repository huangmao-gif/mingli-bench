import type { Brightness, Chart, Mutagen, Palace, PalaceName, Star } from './types.ts';

export const STRONG_BRIGHT: Brightness[] = ['庙', '旺'];
/** 四煞 */
export const FOUR_SHA = ['擎羊', '陀罗', '火星', '铃星'];
/** 六煞 = 四煞 + 空劫 */
export const SIX_SHA = [...FOUR_SHA, '地空', '地劫'];
/** 六吉 + 禄存（SCORES 锚点里的「辅星正面支持」） */
export const AUX_GOOD = ['文昌', '文曲', '左辅', '右弼', '天魁', '天钺', '禄存'];

export function palace(chart: Chart, name: PalaceName): Palace {
  const p = chart.palaces.find((x) => x.name === name);
  if (!p) throw new Error(`命盘缺少宫位：${name}`);
  return p;
}

export function bodyPalace(chart: Chart): Palace {
  const p = chart.palaces.find((x) => x.isBodyPalace);
  if (!p) throw new Error('命盘缺少身宫标记');
  return p;
}

function atPosition(chart: Chart, pos: number): Palace {
  const p = chart.palaces.find((x) => x.position === ((pos % 12) + 12) % 12);
  if (!p) throw new Error(`命盘缺少位置 ${pos}`);
  return p;
}

export function opposite(chart: Chart, p: Palace): Palace {
  return atPosition(chart, p.position + 6);
}

/** 三合（不含本宫与对宫） */
export function trines(chart: Chart, p: Palace): Palace[] {
  return [atPosition(chart, p.position + 4), atPosition(chart, p.position + 8)];
}

/** 三方四正：本宫 + 对宫 + 两个三合宫 */
export function sanFangSiZheng(chart: Chart, p: Palace): Palace[] {
  return [p, opposite(chart, p), ...trines(chart, p)];
}

export interface StarFilter {
  brightness?: Brightness[];
  mutagen?: Mutagen;
}

export function matchStar(s: Star, names: string[], f: StarFilter = {}): boolean {
  if (!names.includes(s.name)) return false;
  if (f.brightness && !f.brightness.includes(s.brightness)) return false;
  if (f.mutagen && s.mutagen !== f.mutagen) return false;
  return true;
}

export function findStars(palaces: Palace[], names: string[], f: StarFilter = {}): { palace: Palace; star: Star }[] {
  const out: { palace: Palace; star: Star }[] = [];
  for (const p of palaces) for (const s of p.stars) if (matchStar(s, names, f)) out.push({ palace: p, star: s });
  return out;
}

export function hasStar(palaces: Palace[], names: string[], f: StarFilter = {}): boolean {
  return findStars(palaces, names, f).length > 0;
}

export function findMutagen(palaces: Palace[], m: Mutagen): { palace: Palace; star: Star }[] {
  const out: { palace: Palace; star: Star }[] = [];
  for (const p of palaces) for (const s of p.stars) if (s.mutagen === m) out.push({ palace: p, star: s });
  return out;
}

export function hasMutagen(palaces: Palace[], m: Mutagen): boolean {
  return findMutagen(palaces, m).length > 0;
}

export function majors(p: Palace): Star[] {
  return p.stars.filter((s) => s.type === 'major');
}

/** 宫旺：至少一颗主星庙或旺 */
export function isStrongPalace(p: Palace): boolean {
  return majors(p).some((s) => STRONG_BRIGHT.includes(s.brightness));
}

/** 宫弱：无主星，或主星全部落在 平/不/陷 */
export function isWeakPalace(p: Palace): boolean {
  const m = majors(p);
  return m.length === 0 || m.every((s) => ['平', '不', '陷'].includes(s.brightness));
}
