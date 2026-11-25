// 引擎内部的标准化命盘结构：与排盘库解耦，测试可以直接手写。

export type Brightness = '庙' | '旺' | '得' | '利' | '平' | '不' | '陷' | '';
export type Mutagen = '禄' | '权' | '科' | '忌';

export const PALACE_NAMES = [
  '命宫', '兄弟', '夫妻', '子女', '财帛', '疾厄',
  '迁移', '交友', '官禄', '田宅', '福德', '父母',
] as const;
export type PalaceName = (typeof PALACE_NAMES)[number];

export interface Star {
  name: string;
  /** 'major' 主星；其余沿用 iztro 的分类（soft / tough / lucun / tianma / adjective …） */
  type: string;
  brightness: Brightness;
  mutagen: Mutagen | null;
}

export interface Palace {
  name: PalaceName;
  /** 地支位置 0-11（寅=0 … 丑=11），用于计算对宫与三方 */
  position: number;
  isBodyPalace: boolean;
  /** 长生十二神，如 '长生' '帝旺' */
  changsheng: string;
  stars: Star[];
}

/** 某一层四化（大限 / 流年）：禄权科忌分别落在哪颗星 */
export interface MutagenLayer {
  label: string;
  stem: string;
  stars: Record<Mutagen, string>;
}

export interface Chart {
  palaces: Palace[];
  /** 参考时点的大限、流年四化（可选；引用校验用来核对非生年的四化陈述） */
  layers?: MutagenLayer[];
  /** 十天干四化表（取自排盘库），用于核对写明了年份/天干的四化陈述 */
  stemTable?: Record<string, Record<Mutagen, string>>;
}

/** 规则表版本：v1 = 线上提示词原文的忠实实现；v2 = 修订提案（见 docs/RULES-v2.md） */
export type RulesVersion = 'v1' | 'v2';

export const SCORE_DIMS = [
  '自我觉察', '情绪调节', '延迟满足', '关系模式', '不确定性容忍', '自我叙事',
] as const;
export type ScoreDim = (typeof SCORE_DIMS)[number];

/** 一条可被 LLM 引用的事实依据 */
export interface Evidence {
  palace: PalaceName;
  detail: string;
}

export interface DimScore {
  score: 1 | 2 | 3 | 4 | 5;
  palaces: PalaceName[];
  /** 每个参与宫位的原始分（合并前） */
  perPalace: { palace: PalaceName; score: number; positive: Evidence[]; negative: Evidence[] }[];
}

export interface PersonaResult {
  id: number;
  name: string;
  /** 满足的条件数 / 总条件数 */
  matchRatio: number;
  fullMatch: boolean;
  /** v2：核心条件（星曜组合）是否全部满足；v1 不提供 */
  coreMatch?: boolean;
  matched: string[];
  unmatched: string[];
  /** 得分最高的前几名，便于解释与排查 */
  runnersUp: { id: number; name: string; matchRatio: number }[];
}
