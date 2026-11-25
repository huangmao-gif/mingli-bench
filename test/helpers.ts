import type { Brightness, Chart, Mutagen, PalaceName, Star } from '../src/types.ts';
import { PALACE_NAMES } from '../src/types.ts';

const MAJOR = new Set(['紫微', '天机', '太阳', '武曲', '天同', '廉贞', '天府', '太阴', '贪狼', '巨门', '天相', '天梁', '七杀', '破军']);

/** 星曜简写：'紫微庙禄' = 紫微、庙、化禄；'擎羊' = 擎羊、无亮度、无四化 */
export function star(spec: string): Star {
  const m = spec.match(/^(.+?)(庙|旺|得|利|平|不|陷)?(禄|权|科|忌)?$/u)!;
  const name = m[1];
  return {
    name,
    type: MAJOR.has(name) ? 'major' : 'minor',
    brightness: (m[2] ?? '') as Brightness,
    mutagen: (m[3] ?? null) as Mutagen | null,
  };
}

/**
 * 构造标准化命盘。宫位排布与 iztro 一致：命宫位置 m，第 k 个宫在 (m - k) mod 12。
 * 对宫 = 第 k+6 个宫；命宫三合 = 财帛、官禄。
 */
export function makeChart(
  stars: Partial<Record<PalaceName, string[]>>,
  opts: { body?: PalaceName; changsheng?: Partial<Record<PalaceName, string>> } = {},
): Chart {
  const ming = 4;
  return {
    palaces: PALACE_NAMES.map((name, k) => ({
      name,
      position: (((ming - k) % 12) + 12) % 12,
      isBodyPalace: name === (opts.body ?? '命宫'),
      changsheng: opts.changsheng?.[name] ?? '',
      stars: (stars[name] ?? []).map(star),
    })),
  };
}
