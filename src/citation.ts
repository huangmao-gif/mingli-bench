// 引用校验：从 LLM 报告正文里抽出可核对的盘面陈述，与命盘逐条比对。
// 这是基于正则的启发式抽取，有漏抽也可能误判；评测时会人工抽查被判错的陈述来估计精度。
import type { Chart, Mutagen, PalaceName } from './types.ts';
import { opposite, palace } from './chart.ts';

export const STARS = [
  '紫微', '天机', '太阳', '武曲', '天同', '廉贞', '天府', '太阴', '贪狼', '巨门', '天相', '天梁', '七杀', '破军',
  '文昌', '文曲', '左辅', '右弼', '天魁', '天钺', '禄存', '天马', '擎羊', '陀罗', '火星', '铃星', '地空', '地劫',
];

const PALACE_ALIAS: Record<string, PalaceName> = {
  命: '命宫', 兄弟: '兄弟', 夫妻: '夫妻', 子女: '子女', 财帛: '财帛', 疾厄: '疾厄', 迁移: '迁移',
  交友: '交友', 仆役: '交友', 奴仆: '交友', 官禄: '官禄', 事业: '官禄', 田宅: '田宅', 福德: '福德', 父母: '父母',
};

const S = STARS.join('|');
const P = Object.keys(PALACE_ALIAS).join('|');

export type ClaimKind = 'star-in-palace' | 'mutagen' | 'brightness';
export interface Claim {
  kind: ClaimKind;
  text: string;
  star: string;
  palace?: PalaceName;
  value?: string;
  ok: boolean;
  reason: string;
  /** 陈述在正文中的位置 */
  at: number;
}

/** 非本命语境（用于「星在宫」）：所在分句出现这些词时，陈述可能指流年/大限的宫位，不按本命盘核对 */
const NON_NATAL = /(流年|流月|大限|小限|飞|宫干|自化|若|如果|假如|行运|今年|明年|当年|年内|20\d\d|[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]?年)/;
/** 否定语境：「贪狼化禄未成」「并无太阳化忌」 */
/** 四化陈述只在这些语境下跳过（飞化、流月、假设无法核对）；流年、大限四化改为直接核对 */
const UNCHECKABLE_MUTAGEN = /(流月|流日|飞|宫干|自化|若|如果|假如)/;
const NEGATED_AFTER = /^.{0,4}(未|不成|不满足|条件)/u;
const NEGATED_BEFORE = /(无|非|未|没有|并非|缺)$/u;

function clauseAround(text: string, idx: number): string {
  const start = Math.max(text.lastIndexOf('。', idx), text.lastIndexOf('\n', idx), text.lastIndexOf('；', idx)) + 1;
  const ends = ['。', '\n', '；'].map((c) => text.indexOf(c, idx)).filter((x) => x >= 0);
  return text.slice(start, ends.length ? Math.min(...ends) : text.length);
}

const STEMS = '甲乙丙丁戊己庚辛壬癸';
/** 本段（上一个换行之后）中、陈述之前最近一次写明的年份或天干：「2027年」「丁未年」「丁干」 */
function explicitStem(text: string, idx: number): string | null {
  const para = text.slice(text.lastIndexOf('\n', idx) + 1, idx);
  let last: { at: number; stem: string } | null = null;
  for (const m of para.matchAll(/(20\d\d)年?|([甲乙丙丁戊己庚辛壬癸])(?:[子丑寅卯辰巳午未申酉戌亥]年|年|干)/gu)) {
    const stem = m[1] ? STEMS[(Number(m[1]) - 4) % 10] : m[2];
    last = { at: m.index!, stem };
  }
  return last?.stem ?? null;
}

function isNegated(text: string, idx: number, len: number): boolean {
  return NEGATED_AFTER.test(text.slice(idx + len, idx + len + 8)) || NEGATED_BEFORE.test(text.slice(Math.max(0, idx - 3), idx));
}

function starIn(chart: Chart, star: string, p: PalaceName): boolean {
  return palace(chart, p).stars.some((s) => s.name === star);
}

export function extractClaims(chart: Chart, text: string): Claim[] {
  const claims: Claim[] = [];
  const seen = new Set<string>();
  const push = (c0: Omit<Claim, 'at'>, at: number) => {
    const c: Claim = { ...c0, at };
    const key = `${c.kind}|${c.star}|${c.palace ?? ''}|${c.value ?? ''}|${at}`;
    if (!seen.has(key)) { seen.add(key); claims.push(c); }
  };

  // 1) 星在宫：「命宫紫微」「福德宫有文昌」「贪狼坐迁移宫」「天同化忌在疾厄宫」
  const placeChecks: [RegExp, (m: RegExpExecArray) => [string, string]][] = [
    [new RegExp(`(${P})宫[有见坐为是之的内中主星：:（(、\\s]{0,4}(${S})`, 'gu'), (m) => [m[2], m[1]]],
    [new RegExp(`(${S})(?:化[禄权科忌])?(?:庙旺|庙|旺|得地|落陷|陷)?星?(?:坐|在|落|入|居|守|位于)于?(${P})宫`, 'gu'), (m) => [m[1], m[2]]],
  ];
  for (const [re, pick] of placeChecks) {
    for (let m; (m = re.exec(text)); ) {
      const [star, rawP] = pick(m);
      const p = PALACE_ALIAS[rawP];
      const clause = clauseAround(text, m.index);
      if (NON_NATAL.test(clause) || isNegated(text, m.index, m[0].length)) continue;
      let ok = starIn(chart, star, p);
      let reason = ok ? '在该宫' : '该宫无此星';
      if (!ok && starIn(chart, star, opposite(chart, palace(chart, p)).name) && /(借|对宫|冲|照)/.test(clause)) {
        ok = true; reason = '在对宫（借星/冲照语境）';
      }
      push({ kind: 'star-in-palace', text: m[0], star, palace: p, ok, reason }, m.index);
    }
  }

  // 2) 四化：先对生年四化，再对参考时点的大限、流年四化（chart.layers）
  const mutRe = new RegExp(`(${S})化(禄|权|科|忌)`, 'gu');
  const all = chart.palaces.flatMap((p) => p.stars);
  for (let m; (m = mutRe.exec(text)); ) {
    if (UNCHECKABLE_MUTAGEN.test(clauseAround(text, m.index)) || isNegated(text, m.index, m[0].length)) continue;
    const star = m[1];
    const mut = m[2] as Mutagen;
    // 「太阳天梁化禄」：紧挨着的前一颗星也可能是四化的主人
    const prev = STARS.find((n) => text.slice(0, m!.index).endsWith(n));
    const owners = prev ? [star, prev] : [star];
    let reason = '';
    const stem = explicitStem(text, m.index);
    if (owners.some((o) => all.find((s) => s.name === o)?.mutagen === mut)) reason = '生年四化一致';
    else if (stem && chart.stemTable?.[stem] && owners.includes(chart.stemTable[stem][mut])) reason = `${stem}干四化一致（文中写明）`;
    else {
      const hit = (chart.layers ?? []).find((l) => owners.includes(l.stars[mut]));
      if (hit) reason = `${hit.label}四化一致（${hit.stem}干）`;
    }
    const ok = reason !== '';
    if (!ok) {
      const natal = all.find((s) => s.name === star)?.mutagen ?? '无';
      const layerDesc = (chart.layers ?? []).map((l) => `${l.label}${l.stem}干化${mut}为${l.stars[mut]}`).join('，');
      const stemDesc = stem && chart.stemTable?.[stem] ? `；文中所指${stem}干化${mut}为${chart.stemTable[stem][mut]}` : '';
      reason = `生年四化为${natal}${layerDesc ? '；' + layerDesc : ''}${stemDesc}`;
    }
    push({ kind: 'mutagen', text: m[0], star, value: mut, ok, reason }, m.index);
  }

  // 3) 亮度：「紫微庙」「文曲落陷」（只核对盘上有亮度标注的星）
  const brRe = new RegExp(`(${S})(庙旺|庙|旺(?!盛)|得地|落陷|陷(?!入))`, 'gu');
  const ACCEPT: Record<string, string[]> = { 庙旺: ['庙', '旺'], 庙: ['庙'], 旺: ['旺'], 得地: ['得'], 落陷: ['陷'], 陷: ['陷'] };
  for (let m; (m = brRe.exec(text)); ) {
    const star = m[1];
    const hit = chart.palaces.flatMap((p) => p.stars).find((s) => s.name === star);
    if (!hit || !hit.brightness) continue;
    const ok = ACCEPT[m[2]].includes(hit.brightness);
    push({ kind: 'brightness', text: m[0], star, value: m[2], ok, reason: ok ? '亮度一致' : `盘上为${hit.brightness}` }, m.index);
  }

  return claims;
}
