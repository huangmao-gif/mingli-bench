// 24 三国人物匹配：把产品提示词里的 PERSONA_MAPPING 改写成可执行条件。
// 原文措辞的解读规则（星曜组合看命宫三方四正、「庙旺 / 化X」修饰紧邻的前一颗星等）见 docs/RULES.md。
import type { Chart, Mutagen, Palace, PalaceName, PersonaResult, RulesVersion } from './types.ts';
import {
  SIX_SHA, STRONG_BRIGHT, bodyPalace, hasMutagen, hasStar, isStrongPalace, isWeakPalace, opposite, palace,
  sanFangSiZheng,
} from './chart.ts';

interface Ctx {
  chart: Chart;
  /** 命宫三方四正 */
  sf: Palace[];
  p: (n: PalaceName) => Palace;
}

interface Clause {
  desc: string;
  test: (c: Ctx) => boolean;
}

export interface PersonaRule {
  id: number;
  name: string;
  /** 原提示词条文，保留以便对照 */
  source: string;
  clauses: Clause[];
  /** v2：前 core 条为核心条件（原文第一个逗号前的星曜组合），其余为辅助条件 */
  core?: number;
}

// ---- 条件构造器 ----
const inSF = (stars: string[], opt: { bright?: boolean; mut?: Mutagen } = {}): Clause => ({
  desc: `命宫三方四正见${stars.join('/')}${opt.bright ? '（庙旺）' : ''}${opt.mut ? '化' + opt.mut : ''}`,
  test: (c) => hasStar(c.sf, stars, { brightness: opt.bright ? STRONG_BRIGHT : undefined, mutagen: opt.mut }),
});
const inPalaces = (ps: PalaceName[], stars: string[]): Clause => ({
  desc: `${ps.join('或')}有${stars.join('/')}`,
  test: (c) => hasStar(ps.map(c.p), stars),
});
const mutIn = (ps: PalaceName[], m: Mutagen): Clause => ({
  desc: `化${m}在${ps.join('或')}`,
  test: (c) => hasMutagen(ps.map(c.p), m),
});
const any = (desc: string, ...cs: Clause[]): Clause => ({ desc, test: (c) => cs.some((x) => x.test(c)) });
const strong = (n: PalaceName): Clause => ({ desc: `${n}宫旺（主星庙旺）`, test: (c) => isStrongPalace(c.p(n)) });

export const PERSONA_RULES: PersonaRule[] = [
  { id: 1, name: '诸葛亮·天机', source: '天机+文昌文曲化科，福德有陀罗/化忌', clauses: [
    inSF(['天机']), inSF(['文昌', '文曲'], { mut: '科' }),
    any('福德有陀罗或化忌', inPalaces(['福德'], ['陀罗']), mutIn(['福德'], '忌')),
  ] },
  { id: 2, name: '曹操·枭雄', source: '紫微+七杀/破军，化权入命或迁移', clauses: [
    inSF(['紫微']), inSF(['七杀', '破军']), mutIn(['命宫', '迁移'], '权'),
  ] },
  { id: 3, name: '关羽·武曲', source: '武曲+天府/天相庙旺，擎羊在命或福德', clauses: [
    inSF(['武曲']), inSF(['天府', '天相'], { bright: true }), inPalaces(['命宫', '福德'], ['擎羊']),
  ] },
  { id: 4, name: '司马懿·潜伏', source: '太阴/天梁+地空地劫，化忌藏命宫或疾厄', clauses: [
    inSF(['太阴', '天梁']), inSF(['地空', '地劫']), mutIn(['命宫', '疾厄'], '忌'),
  ] },
  { id: 5, name: '周瑜·风流', source: '破军+贪狼/廉贞化禄，福德见火星铃星', clauses: [
    inSF(['破军']), inSF(['贪狼', '廉贞'], { mut: '禄' }), inPalaces(['福德'], ['火星', '铃星']),
  ] },
  { id: 6, name: '赵云·将星', source: '七杀+天相，命宫有禄存或化禄，无煞冲破', clauses: [
    inSF(['七杀']), inSF(['天相']),
    any('命宫有禄存或化禄', inPalaces(['命宫'], ['禄存']), mutIn(['命宫'], '禄')),
    { desc: '命宫、迁移无六煞', test: (c) => !hasStar([c.p('命宫'), c.p('迁移')], SIX_SHA) },
  ] },
  { id: 7, name: '刘备·仁德', source: '紫微+天同/太阴化科，兄弟或交友宫旺', clauses: [
    inSF(['紫微']), inSF(['天同', '太阴'], { mut: '科' }),
    any('兄弟或交友宫旺', strong('兄弟'), strong('交友')),
  ] },
  { id: 8, name: '吕布·贪狼', source: '贪狼+火星/铃星化禄，夫妻宫见桃花星煞', clauses: [
    inSF(['贪狼'], { mut: '禄' }), inSF(['火星', '铃星']),
    inPalaces(['夫妻'], ['贪狼', '廉贞', '红鸾', '天喜', '咸池', '天姚']),
    inPalaces(['夫妻'], SIX_SHA),
  ] },
  { id: 9, name: '张飞·烈刃', source: '火星/铃星+七杀/武曲，福德有煞', clauses: [
    inSF(['火星', '铃星']), inSF(['七杀', '武曲']), inPalaces(['福德'], SIX_SHA),
  ] },
  { id: 10, name: '郭嘉·天妒', source: '文昌+文曲化科+天机，疾厄见化忌/陀罗', clauses: [
    inSF(['文昌']), inSF(['文曲'], { mut: '科' }), inSF(['天机']),
    any('疾厄见化忌或陀罗', mutIn(['疾厄'], '忌'), inPalaces(['疾厄'], ['陀罗'])),
  ] },
  { id: 11, name: '孙权·守成', source: '紫微+天相在命或身宫，太阴/天府三方拱', clauses: [
    { desc: '命宫或身宫紫微、天相同宫', test: (c) => [c.p('命宫'), bodyPalace(c.chart)].some((p) => hasStar([p], ['紫微']) && hasStar([p], ['天相'])) },
    { desc: '太阴或天府在命宫三方（迁移/财帛/官禄）', test: (c) => hasStar([c.p('迁移'), c.p('财帛'), c.p('官禄')], ['太阴', '天府']) },
  ] },
  { id: 12, name: '贾诩·窥心', source: '巨门+天机+陀罗，化科入福德', clauses: [
    inSF(['巨门']), inSF(['天机']), inSF(['陀罗']), mutIn(['福德'], '科'),
  ] },
  { id: 13, name: '孙策·霸王', source: '七杀+破军+火星庙旺，疾厄见化忌冲照', clauses: [
    inSF(['七杀']), inSF(['破军']), inSF(['火星'], { bright: true }),
    { desc: '化忌在疾厄或其对宫', test: (c) => hasMutagen([c.p('疾厄'), opposite(c.chart, c.p('疾厄'))], '忌') },
  ] },
  { id: 14, name: '荀彧·天梁', source: '天梁+文昌庙旺，官禄宫见化忌', clauses: [
    inSF(['天梁']), inSF(['文昌'], { bright: true }), mutIn(['官禄'], '忌'),
  ] },
  { id: 15, name: '鲁肃·厚德', source: '天同+天机，命宫有禄存', clauses: [
    inSF(['天同']), inSF(['天机']), inPalaces(['命宫'], ['禄存']),
  ] },
  { id: 16, name: '黄忠·廉贞', source: '廉贞+七杀/武曲，疾厄长生/帝旺', clauses: [
    inSF(['廉贞']), inSF(['七杀', '武曲']),
    { desc: '疾厄长生或帝旺', test: (c) => ['长生', '帝旺'].includes(c.p('疾厄').changsheng) },
  ] },
  { id: 17, name: '姜维·孤忠', source: '武曲+贪狼+陀罗，官禄旺但三方见化忌', clauses: [
    inSF(['武曲']), inSF(['贪狼']), inSF(['陀罗']), strong('官禄'),
    { desc: '官禄三方四正见化忌', test: (c) => hasMutagen(sanFangSiZheng(c.chart, c.p('官禄')), '忌') },
  ] },
  { id: 18, name: '魏延·反骨', source: '七杀+擎羊/火星在命或迁移', clauses: [
    inPalaces(['命宫', '迁移'], ['七杀']), inPalaces(['命宫', '迁移'], ['擎羊', '火星']),
  ] },
  { id: 19, name: '庞统·凤雏', source: '天机+文曲+陀罗，命弱官禄旺', clauses: [
    inSF(['天机']), inSF(['文曲']), inSF(['陀罗']),
    { desc: '命宫弱（无主星或主星平/不/陷）', test: (c) => isWeakPalace(c.p('命宫')) }, strong('官禄'),
  ] },
  { id: 20, name: '陈宫·择主', source: '巨门+天机+擎羊，交友宫化忌冲照', clauses: [
    inSF(['巨门']), inSF(['天机']), inSF(['擎羊']), mutIn(['交友', '兄弟'], '忌'),
  ] },
  { id: 21, name: '徐庶·孝义', source: '文昌文曲天相，父母宫化忌/陀罗', clauses: [
    inSF(['文昌']), inSF(['文曲']), inSF(['天相']),
    any('父母有化忌或陀罗', mutIn(['父母'], '忌'), inPalaces(['父母'], ['陀罗'])),
  ] },
  { id: 22, name: '张辽·止啼', source: '七杀+武曲庙旺，迁移禄存/化禄', clauses: [
    inSF(['七杀']), inSF(['武曲'], { bright: true }),
    any('迁移有禄存或化禄', inPalaces(['迁移'], ['禄存']), mutIn(['迁移'], '禄')),
  ] },
  { id: 23, name: '甘宁·先锋', source: '火星+破军+天刑，命疾厄皆旺', clauses: [
    inSF(['火星']), inSF(['破军']), inSF(['天刑']), strong('命宫'), strong('疾厄'),
  ] },
  { id: 24, name: '荀攸·隐策', source: '天机+太阴+地空，福德见化科', clauses: [
    inSF(['天机']), inSF(['太阴']), inSF(['地空']), mutIn(['福德'], '科'),
  ] },
];

export function evaluatePersona(chart: Chart, rule: PersonaRule): { matched: string[]; unmatched: string[] } {
  const ming = palace(chart, '命宫');
  const ctx: Ctx = { chart, sf: sanFangSiZheng(chart, ming), p: (n) => palace(chart, n) };
  const matched: string[] = [];
  const unmatched: string[] = [];
  for (const cl of rule.clauses) (cl.test(ctx) ? matched : unmatched).push(cl.desc);
  return { matched, unmatched };
}

// ---------------- v2 修订提案 ----------------
// 1) 每条规则拆成「核心条件」（原文第一个逗号前的星曜组合）与「辅助条件」；先比核心是否全满足，再比整体满足率。
// 2) 刘备：原条件「紫微+天同/太阴化科」在三方四正内不可能同时成立（docs/RULES.md 第三节），改为
//    「天同或太阴化科坐命/身 + 左辅或右弼（人和）」为核心，「兄弟或交友宫旺」为辅助。
const CORE_COUNTS: Record<number, number> = {
  1: 2, 2: 2, 3: 2, 4: 2, 5: 2, 6: 2, 7: 2, 8: 2, 9: 2, 10: 3, 11: 1, 12: 3,
  13: 3, 14: 2, 15: 2, 16: 2, 17: 3, 18: 2, 19: 3, 20: 3, 21: 3, 22: 2, 23: 3, 24: 3,
};

export const PERSONA_RULES_V2: PersonaRule[] = PERSONA_RULES.map((r) =>
  r.id === 7
    ? {
        id: 7, name: '刘备·仁德', source: '【v2 提案】天同/太阴化科坐命或身 + 左辅/右弼，兄弟或交友宫旺', core: 2,
        clauses: [
          { desc: '天同或太阴化科坐命宫或身宫', test: (c) => hasStar([c.p('命宫'), bodyPalace(c.chart)], ['天同', '太阴'], { mutagen: '科' }) },
          inSF(['左辅', '右弼']),
          any('兄弟或交友宫旺', strong('兄弟'), strong('交友')),
        ],
      }
    : { ...r, core: CORE_COUNTS[r.id] },
);

export function rulesFor(version: RulesVersion): PersonaRule[] {
  return version === 'v2' ? PERSONA_RULES_V2 : PERSONA_RULES;
}

/**
 * 选人物。
 * v1：按「满足条件比例」降序；比例相同按条件数多者优先（更具体）；再相同按编号小者优先。
 * v2：先按「核心条件是否全满足」，再按「核心条件满足比例」（没有人物核心全满足时，避免条件少的规则凭辅助条件胜出），再按 v1 的顺序。
 * 永远返回一个人物，并给出未满足的条件，便于判断是否「勉强匹配」。
 */
export function matchPersona(chart: Chart, version: RulesVersion = 'v1'): PersonaResult {
  const rules = rulesFor(version);
  const ranked = rules.map((r) => {
    const e = evaluatePersona(chart, r);
    const coreN = r.core ?? 0;
    const coreHit = version === 'v2' ? r.clauses.slice(0, coreN).filter((cl) => e.matched.includes(cl.desc)).length : 0;
    const coreOk = version === 'v2' && coreHit === coreN;
    const coreRatio = version === 'v2' ? coreHit / coreN : 0;
    return { rule: r, ...e, ratio: e.matched.length / r.clauses.length, coreOk, coreRatio };
  }).sort((a, b) => Number(b.coreOk) - Number(a.coreOk) || b.coreRatio - a.coreRatio || b.ratio - a.ratio || b.rule.clauses.length - a.rule.clauses.length || a.rule.id - b.rule.id);
  const top = ranked[0];
  return {
    id: top.rule.id,
    name: top.rule.name,
    matchRatio: Number(top.ratio.toFixed(3)),
    fullMatch: top.unmatched.length === 0,
    ...(version === 'v2' ? { coreMatch: top.coreOk } : {}),
    matched: top.matched,
    unmatched: top.unmatched,
    runnersUp: ranked.slice(1, 4).map((x) => ({ id: x.rule.id, name: x.rule.name, matchRatio: Number(x.ratio.toFixed(3)) })),
  };
}
