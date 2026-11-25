var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  DIM_PALACES: () => DIM_PALACES,
  PALACE_NAMES: () => PALACE_NAMES,
  PERSONA_RULES: () => PERSONA_RULES,
  PERSONA_RULES_V2: () => PERSONA_RULES_V2,
  SCORE_DIMS: () => SCORE_DIMS,
  chartBySolar: () => chartBySolar,
  combine: () => combine,
  computeProfile: () => computeProfile,
  computeScores: () => computeScores,
  engineMarkers: () => engineMarkers,
  evaluatePersona: () => evaluatePersona,
  extractClaims: () => extractClaims,
  fromIztro: () => fromIztro,
  matchPersona: () => matchPersona,
  profileFromBirth: () => profileFromBirth,
  rulesFor: () => rulesFor,
  scorePalace: () => scorePalace,
  scorePalaceV2: () => scorePalaceV2,
  validateBirth: () => validateBirth
});
module.exports = __toCommonJS(index_exports);

// src/types.ts
var PALACE_NAMES = [
  "\u547D\u5BAB",
  "\u5144\u5F1F",
  "\u592B\u59BB",
  "\u5B50\u5973",
  "\u8D22\u5E1B",
  "\u75BE\u5384",
  "\u8FC1\u79FB",
  "\u4EA4\u53CB",
  "\u5B98\u7984",
  "\u7530\u5B85",
  "\u798F\u5FB7",
  "\u7236\u6BCD"
];
var SCORE_DIMS = [
  "\u81EA\u6211\u89C9\u5BDF",
  "\u60C5\u7EEA\u8C03\u8282",
  "\u5EF6\u8FDF\u6EE1\u8DB3",
  "\u5173\u7CFB\u6A21\u5F0F",
  "\u4E0D\u786E\u5B9A\u6027\u5BB9\u5FCD",
  "\u81EA\u6211\u53D9\u4E8B"
];

// src/chart.ts
var STRONG_BRIGHT = ["\u5E99", "\u65FA"];
var FOUR_SHA = ["\u64CE\u7F8A", "\u9640\u7F57", "\u706B\u661F", "\u94C3\u661F"];
var SIX_SHA = [...FOUR_SHA, "\u5730\u7A7A", "\u5730\u52AB"];
var AUX_GOOD = ["\u6587\u660C", "\u6587\u66F2", "\u5DE6\u8F85", "\u53F3\u5F3C", "\u5929\u9B41", "\u5929\u94BA", "\u7984\u5B58"];
function palace(chart, name) {
  const p = chart.palaces.find((x) => x.name === name);
  if (!p) throw new Error(`\u547D\u76D8\u7F3A\u5C11\u5BAB\u4F4D\uFF1A${name}`);
  return p;
}
function bodyPalace(chart) {
  const p = chart.palaces.find((x) => x.isBodyPalace);
  if (!p) throw new Error("\u547D\u76D8\u7F3A\u5C11\u8EAB\u5BAB\u6807\u8BB0");
  return p;
}
function atPosition(chart, pos) {
  const p = chart.palaces.find((x) => x.position === (pos % 12 + 12) % 12);
  if (!p) throw new Error(`\u547D\u76D8\u7F3A\u5C11\u4F4D\u7F6E ${pos}`);
  return p;
}
function opposite(chart, p) {
  return atPosition(chart, p.position + 6);
}
function trines(chart, p) {
  return [atPosition(chart, p.position + 4), atPosition(chart, p.position + 8)];
}
function sanFangSiZheng(chart, p) {
  return [p, opposite(chart, p), ...trines(chart, p)];
}
function matchStar(s, names, f = {}) {
  if (!names.includes(s.name)) return false;
  if (f.brightness && !f.brightness.includes(s.brightness)) return false;
  if (f.mutagen && s.mutagen !== f.mutagen) return false;
  return true;
}
function findStars(palaces, names, f = {}) {
  const out = [];
  for (const p of palaces) for (const s of p.stars) if (matchStar(s, names, f)) out.push({ palace: p, star: s });
  return out;
}
function hasStar(palaces, names, f = {}) {
  return findStars(palaces, names, f).length > 0;
}
function findMutagen(palaces, m) {
  const out = [];
  for (const p of palaces) for (const s of p.stars) if (s.mutagen === m) out.push({ palace: p, star: s });
  return out;
}
function hasMutagen(palaces, m) {
  return findMutagen(palaces, m).length > 0;
}
function majors(p) {
  return p.stars.filter((s) => s.type === "major");
}
function isStrongPalace(p) {
  return majors(p).some((s) => STRONG_BRIGHT.includes(s.brightness));
}
function isWeakPalace(p) {
  const m = majors(p);
  return m.length === 0 || m.every((s) => ["\u5E73", "\u4E0D", "\u9677"].includes(s.brightness));
}

// src/scores.ts
var DIM_PALACES = {
  \u81EA\u6211\u89C9\u5BDF: ["\u547D\u5BAB", "\u8EAB\u5BAB"],
  \u60C5\u7EEA\u8C03\u8282: ["\u798F\u5FB7"],
  \u5EF6\u8FDF\u6EE1\u8DB3: ["\u8D22\u5E1B", "\u5B98\u7984"],
  \u5173\u7CFB\u6A21\u5F0F: ["\u592B\u59BB", "\u4EA4\u53CB"],
  \u4E0D\u786E\u5B9A\u6027\u5BB9\u5FCD: ["\u8FC1\u79FB"],
  \u81EA\u6211\u53D9\u4E8B: ["\u547D\u5BAB", "\u798F\u5FB7"]
};
var ev = (p, detail) => ({ palace: p.name, detail });
function scorePalace(chart, p) {
  const positive = [];
  const negative = [];
  const strongMajors = majors(p).filter((s) => STRONG_BRIGHT.includes(s.brightness));
  const luKe = p.stars.filter((s) => s.mutagen === "\u7984" || s.mutagen === "\u79D1");
  const posStrong = strongMajors.length > 0 && luKe.length > 0;
  if (posStrong) {
    positive.push(ev(p, `\u4E3B\u661F${strongMajors.map((s) => s.name + s.brightness).join("\u3001")} + ${luKe.map((s) => s.name + "\u5316" + s.mutagen).join("\u3001")}`));
  }
  const aux = findStars([p], AUX_GOOD);
  if (aux.length > 0) positive.push(ev(p, `\u8F85\u661F${aux.map((x) => x.star.name).join("\u3001")}`));
  const pos = posStrong ? 2 : aux.length > 0 ? 1 : 0;
  const opp = opposite(chart, p);
  const jiIn = findMutagen([p], "\u5FCC");
  const jiOpp = findMutagen([opp], "\u5FCC");
  const shaIn = findStars([p], FOUR_SHA);
  for (const x of jiIn) negative.push(ev(p, `${x.star.name}\u5316\u5FCC\u5750\u5BAB`));
  for (const x of jiOpp) negative.push(ev(p, `${x.star.name}\u5316\u5FCC\u5728${opp.name}\u51B2\u7167`));
  for (const x of shaIn) negative.push(ev(p, `${x.star.name}\u5750\u5BAB`));
  const negStrong = jiIn.length + jiOpp.length + shaIn.length > 0;
  const kongJie = findStars([p], ["\u5730\u7A7A", "\u5730\u52AB"]);
  const shaOpp = findStars([opp], FOUR_SHA);
  const jiTrine = findMutagen(trines(chart, p), "\u5FCC");
  for (const x of kongJie) negative.push(ev(p, `${x.star.name}\u5750\u5BAB`));
  for (const x of shaOpp) negative.push(ev(p, `${x.star.name}\u5728${opp.name}\u51B2\u7167`));
  for (const x of jiTrine) negative.push(ev(p, `${x.star.name}\u5316\u5FCC\u5728\u4E09\u5408\u5BAB${x.palace.name}`));
  const neg = negStrong ? 2 : kongJie.length + shaOpp.length + jiTrine.length > 0 ? 1 : 0;
  const score = Math.max(1, Math.min(5, 3 + pos - neg));
  return { score, positive, negative };
}
function scorePalaceV2(chart, p) {
  const positive = [];
  const negative = [];
  const opp = opposite(chart, p);
  const sha = findStars([p], FOUR_SHA);
  if (sha.length) negative.push(ev(p, `${sha.map((x) => x.star.name).join("\u3001")}\u5750\u5BAB`));
  const ji = findMutagen([p], "\u5FCC");
  if (ji.length) negative.push(ev(p, `${ji.map((x) => x.star.name).join("\u3001")}\u5316\u5FCC\u5750\u5BAB`));
  const kj = findStars([p], ["\u5730\u7A7A", "\u5730\u52AB"]);
  if (kj.length) negative.push(ev(p, `${kj.map((x) => x.star.name).join("\u3001")}\u5750\u5BAB`));
  const jiOpp = findMutagen([opp], "\u5FCC");
  if (jiOpp.length) negative.push(ev(p, `${jiOpp.map((x) => x.star.name).join("\u3001")}\u5316\u5FCC\u5728${opp.name}\u51B2\u7167`));
  const neg = Math.min(2, negative.length);
  const huaGood = p.stars.filter((s) => s.mutagen === "\u7984" || s.mutagen === "\u6743" || s.mutagen === "\u79D1");
  if (huaGood.length) positive.push(ev(p, huaGood.map((s) => s.name + "\u5316" + s.mutagen).join("\u3001")));
  const aux = findStars([p], AUX_GOOD);
  if (aux.length) positive.push(ev(p, `\u8F85\u661F${aux.map((x) => x.star.name).join("\u3001")}`));
  const strongMajors = majors(p).filter((s) => STRONG_BRIGHT.includes(s.brightness));
  if (strongMajors.length && negative.length === 0) positive.push(ev(p, `\u4E3B\u661F${strongMajors.map((s) => s.name + s.brightness).join("\u3001")}\u4E14\u65E0\u715E\u5FCC`));
  const pos = Math.min(2, positive.length);
  return { score: Math.max(1, Math.min(5, 3 + pos - neg)), positive, negative };
}
function combine(scores) {
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const floor = Math.floor(mean);
  let r;
  if (mean - floor === 0.5) r = mean > 3 ? floor : floor + 1;
  else r = Math.round(mean);
  return Math.max(1, Math.min(5, r));
}
function computeScores(chart, version = "v1") {
  const scoreOne = version === "v2" ? scorePalaceV2 : scorePalace;
  const out = {};
  for (const dim of SCORE_DIMS) {
    const ps = [];
    for (const n of DIM_PALACES[dim]) {
      const p = n === "\u8EAB\u5BAB" ? bodyPalace(chart) : palace(chart, n);
      if (!ps.includes(p)) ps.push(p);
    }
    const perPalace = ps.map((p) => ({ palace: p.name, ...scoreOne(chart, p) }));
    out[dim] = {
      score: combine(perPalace.map((x) => x.score)),
      palaces: ps.map((p) => p.name),
      perPalace
    };
  }
  return out;
}

// src/persona.ts
var inSF = (stars, opt = {}) => ({
  desc: `\u547D\u5BAB\u4E09\u65B9\u56DB\u6B63\u89C1${stars.join("/")}${opt.bright ? "\uFF08\u5E99\u65FA\uFF09" : ""}${opt.mut ? "\u5316" + opt.mut : ""}`,
  test: (c) => hasStar(c.sf, stars, { brightness: opt.bright ? STRONG_BRIGHT : void 0, mutagen: opt.mut })
});
var inPalaces = (ps, stars) => ({
  desc: `${ps.join("\u6216")}\u6709${stars.join("/")}`,
  test: (c) => hasStar(ps.map(c.p), stars)
});
var mutIn = (ps, m) => ({
  desc: `\u5316${m}\u5728${ps.join("\u6216")}`,
  test: (c) => hasMutagen(ps.map(c.p), m)
});
var any = (desc, ...cs) => ({ desc, test: (c) => cs.some((x) => x.test(c)) });
var strong = (n) => ({ desc: `${n}\u5BAB\u65FA\uFF08\u4E3B\u661F\u5E99\u65FA\uFF09`, test: (c) => isStrongPalace(c.p(n)) });
var PERSONA_RULES = [
  { id: 1, name: "\u8BF8\u845B\u4EAE\xB7\u5929\u673A", source: "\u5929\u673A+\u6587\u660C\u6587\u66F2\u5316\u79D1\uFF0C\u798F\u5FB7\u6709\u9640\u7F57/\u5316\u5FCC", clauses: [
    inSF(["\u5929\u673A"]),
    inSF(["\u6587\u660C", "\u6587\u66F2"], { mut: "\u79D1" }),
    any("\u798F\u5FB7\u6709\u9640\u7F57\u6216\u5316\u5FCC", inPalaces(["\u798F\u5FB7"], ["\u9640\u7F57"]), mutIn(["\u798F\u5FB7"], "\u5FCC"))
  ] },
  { id: 2, name: "\u66F9\u64CD\xB7\u67AD\u96C4", source: "\u7D2B\u5FAE+\u4E03\u6740/\u7834\u519B\uFF0C\u5316\u6743\u5165\u547D\u6216\u8FC1\u79FB", clauses: [
    inSF(["\u7D2B\u5FAE"]),
    inSF(["\u4E03\u6740", "\u7834\u519B"]),
    mutIn(["\u547D\u5BAB", "\u8FC1\u79FB"], "\u6743")
  ] },
  { id: 3, name: "\u5173\u7FBD\xB7\u6B66\u66F2", source: "\u6B66\u66F2+\u5929\u5E9C/\u5929\u76F8\u5E99\u65FA\uFF0C\u64CE\u7F8A\u5728\u547D\u6216\u798F\u5FB7", clauses: [
    inSF(["\u6B66\u66F2"]),
    inSF(["\u5929\u5E9C", "\u5929\u76F8"], { bright: true }),
    inPalaces(["\u547D\u5BAB", "\u798F\u5FB7"], ["\u64CE\u7F8A"])
  ] },
  { id: 4, name: "\u53F8\u9A6C\u61FF\xB7\u6F5C\u4F0F", source: "\u592A\u9634/\u5929\u6881+\u5730\u7A7A\u5730\u52AB\uFF0C\u5316\u5FCC\u85CF\u547D\u5BAB\u6216\u75BE\u5384", clauses: [
    inSF(["\u592A\u9634", "\u5929\u6881"]),
    inSF(["\u5730\u7A7A", "\u5730\u52AB"]),
    mutIn(["\u547D\u5BAB", "\u75BE\u5384"], "\u5FCC")
  ] },
  { id: 5, name: "\u5468\u745C\xB7\u98CE\u6D41", source: "\u7834\u519B+\u8D2A\u72FC/\u5EC9\u8D1E\u5316\u7984\uFF0C\u798F\u5FB7\u89C1\u706B\u661F\u94C3\u661F", clauses: [
    inSF(["\u7834\u519B"]),
    inSF(["\u8D2A\u72FC", "\u5EC9\u8D1E"], { mut: "\u7984" }),
    inPalaces(["\u798F\u5FB7"], ["\u706B\u661F", "\u94C3\u661F"])
  ] },
  { id: 6, name: "\u8D75\u4E91\xB7\u5C06\u661F", source: "\u4E03\u6740+\u5929\u76F8\uFF0C\u547D\u5BAB\u6709\u7984\u5B58\u6216\u5316\u7984\uFF0C\u65E0\u715E\u51B2\u7834", clauses: [
    inSF(["\u4E03\u6740"]),
    inSF(["\u5929\u76F8"]),
    any("\u547D\u5BAB\u6709\u7984\u5B58\u6216\u5316\u7984", inPalaces(["\u547D\u5BAB"], ["\u7984\u5B58"]), mutIn(["\u547D\u5BAB"], "\u7984")),
    { desc: "\u547D\u5BAB\u3001\u8FC1\u79FB\u65E0\u516D\u715E", test: (c) => !hasStar([c.p("\u547D\u5BAB"), c.p("\u8FC1\u79FB")], SIX_SHA) }
  ] },
  { id: 7, name: "\u5218\u5907\xB7\u4EC1\u5FB7", source: "\u7D2B\u5FAE+\u5929\u540C/\u592A\u9634\u5316\u79D1\uFF0C\u5144\u5F1F\u6216\u4EA4\u53CB\u5BAB\u65FA", clauses: [
    inSF(["\u7D2B\u5FAE"]),
    inSF(["\u5929\u540C", "\u592A\u9634"], { mut: "\u79D1" }),
    any("\u5144\u5F1F\u6216\u4EA4\u53CB\u5BAB\u65FA", strong("\u5144\u5F1F"), strong("\u4EA4\u53CB"))
  ] },
  { id: 8, name: "\u5415\u5E03\xB7\u8D2A\u72FC", source: "\u8D2A\u72FC+\u706B\u661F/\u94C3\u661F\u5316\u7984\uFF0C\u592B\u59BB\u5BAB\u89C1\u6843\u82B1\u661F\u715E", clauses: [
    inSF(["\u8D2A\u72FC"], { mut: "\u7984" }),
    inSF(["\u706B\u661F", "\u94C3\u661F"]),
    inPalaces(["\u592B\u59BB"], ["\u8D2A\u72FC", "\u5EC9\u8D1E", "\u7EA2\u9E3E", "\u5929\u559C", "\u54B8\u6C60", "\u5929\u59DA"]),
    inPalaces(["\u592B\u59BB"], SIX_SHA)
  ] },
  { id: 9, name: "\u5F20\u98DE\xB7\u70C8\u5203", source: "\u706B\u661F/\u94C3\u661F+\u4E03\u6740/\u6B66\u66F2\uFF0C\u798F\u5FB7\u6709\u715E", clauses: [
    inSF(["\u706B\u661F", "\u94C3\u661F"]),
    inSF(["\u4E03\u6740", "\u6B66\u66F2"]),
    inPalaces(["\u798F\u5FB7"], SIX_SHA)
  ] },
  { id: 10, name: "\u90ED\u5609\xB7\u5929\u5992", source: "\u6587\u660C+\u6587\u66F2\u5316\u79D1+\u5929\u673A\uFF0C\u75BE\u5384\u89C1\u5316\u5FCC/\u9640\u7F57", clauses: [
    inSF(["\u6587\u660C"]),
    inSF(["\u6587\u66F2"], { mut: "\u79D1" }),
    inSF(["\u5929\u673A"]),
    any("\u75BE\u5384\u89C1\u5316\u5FCC\u6216\u9640\u7F57", mutIn(["\u75BE\u5384"], "\u5FCC"), inPalaces(["\u75BE\u5384"], ["\u9640\u7F57"]))
  ] },
  { id: 11, name: "\u5B59\u6743\xB7\u5B88\u6210", source: "\u7D2B\u5FAE+\u5929\u76F8\u5728\u547D\u6216\u8EAB\u5BAB\uFF0C\u592A\u9634/\u5929\u5E9C\u4E09\u65B9\u62F1", clauses: [
    { desc: "\u547D\u5BAB\u6216\u8EAB\u5BAB\u7D2B\u5FAE\u3001\u5929\u76F8\u540C\u5BAB", test: (c) => [c.p("\u547D\u5BAB"), bodyPalace(c.chart)].some((p) => hasStar([p], ["\u7D2B\u5FAE"]) && hasStar([p], ["\u5929\u76F8"])) },
    { desc: "\u592A\u9634\u6216\u5929\u5E9C\u5728\u547D\u5BAB\u4E09\u65B9\uFF08\u8FC1\u79FB/\u8D22\u5E1B/\u5B98\u7984\uFF09", test: (c) => hasStar([c.p("\u8FC1\u79FB"), c.p("\u8D22\u5E1B"), c.p("\u5B98\u7984")], ["\u592A\u9634", "\u5929\u5E9C"]) }
  ] },
  { id: 12, name: "\u8D3E\u8BE9\xB7\u7AA5\u5FC3", source: "\u5DE8\u95E8+\u5929\u673A+\u9640\u7F57\uFF0C\u5316\u79D1\u5165\u798F\u5FB7", clauses: [
    inSF(["\u5DE8\u95E8"]),
    inSF(["\u5929\u673A"]),
    inSF(["\u9640\u7F57"]),
    mutIn(["\u798F\u5FB7"], "\u79D1")
  ] },
  { id: 13, name: "\u5B59\u7B56\xB7\u9738\u738B", source: "\u4E03\u6740+\u7834\u519B+\u706B\u661F\u5E99\u65FA\uFF0C\u75BE\u5384\u89C1\u5316\u5FCC\u51B2\u7167", clauses: [
    inSF(["\u4E03\u6740"]),
    inSF(["\u7834\u519B"]),
    inSF(["\u706B\u661F"], { bright: true }),
    { desc: "\u5316\u5FCC\u5728\u75BE\u5384\u6216\u5176\u5BF9\u5BAB", test: (c) => hasMutagen([c.p("\u75BE\u5384"), opposite(c.chart, c.p("\u75BE\u5384"))], "\u5FCC") }
  ] },
  { id: 14, name: "\u8340\u5F67\xB7\u5929\u6881", source: "\u5929\u6881+\u6587\u660C\u5E99\u65FA\uFF0C\u5B98\u7984\u5BAB\u89C1\u5316\u5FCC", clauses: [
    inSF(["\u5929\u6881"]),
    inSF(["\u6587\u660C"], { bright: true }),
    mutIn(["\u5B98\u7984"], "\u5FCC")
  ] },
  { id: 15, name: "\u9C81\u8083\xB7\u539A\u5FB7", source: "\u5929\u540C+\u5929\u673A\uFF0C\u547D\u5BAB\u6709\u7984\u5B58", clauses: [
    inSF(["\u5929\u540C"]),
    inSF(["\u5929\u673A"]),
    inPalaces(["\u547D\u5BAB"], ["\u7984\u5B58"])
  ] },
  { id: 16, name: "\u9EC4\u5FE0\xB7\u5EC9\u8D1E", source: "\u5EC9\u8D1E+\u4E03\u6740/\u6B66\u66F2\uFF0C\u75BE\u5384\u957F\u751F/\u5E1D\u65FA", clauses: [
    inSF(["\u5EC9\u8D1E"]),
    inSF(["\u4E03\u6740", "\u6B66\u66F2"]),
    { desc: "\u75BE\u5384\u957F\u751F\u6216\u5E1D\u65FA", test: (c) => ["\u957F\u751F", "\u5E1D\u65FA"].includes(c.p("\u75BE\u5384").changsheng) }
  ] },
  { id: 17, name: "\u59DC\u7EF4\xB7\u5B64\u5FE0", source: "\u6B66\u66F2+\u8D2A\u72FC+\u9640\u7F57\uFF0C\u5B98\u7984\u65FA\u4F46\u4E09\u65B9\u89C1\u5316\u5FCC", clauses: [
    inSF(["\u6B66\u66F2"]),
    inSF(["\u8D2A\u72FC"]),
    inSF(["\u9640\u7F57"]),
    strong("\u5B98\u7984"),
    { desc: "\u5B98\u7984\u4E09\u65B9\u56DB\u6B63\u89C1\u5316\u5FCC", test: (c) => hasMutagen(sanFangSiZheng(c.chart, c.p("\u5B98\u7984")), "\u5FCC") }
  ] },
  { id: 18, name: "\u9B4F\u5EF6\xB7\u53CD\u9AA8", source: "\u4E03\u6740+\u64CE\u7F8A/\u706B\u661F\u5728\u547D\u6216\u8FC1\u79FB", clauses: [
    inPalaces(["\u547D\u5BAB", "\u8FC1\u79FB"], ["\u4E03\u6740"]),
    inPalaces(["\u547D\u5BAB", "\u8FC1\u79FB"], ["\u64CE\u7F8A", "\u706B\u661F"])
  ] },
  { id: 19, name: "\u5E9E\u7EDF\xB7\u51E4\u96CF", source: "\u5929\u673A+\u6587\u66F2+\u9640\u7F57\uFF0C\u547D\u5F31\u5B98\u7984\u65FA", clauses: [
    inSF(["\u5929\u673A"]),
    inSF(["\u6587\u66F2"]),
    inSF(["\u9640\u7F57"]),
    { desc: "\u547D\u5BAB\u5F31\uFF08\u65E0\u4E3B\u661F\u6216\u4E3B\u661F\u5E73/\u4E0D/\u9677\uFF09", test: (c) => isWeakPalace(c.p("\u547D\u5BAB")) },
    strong("\u5B98\u7984")
  ] },
  { id: 20, name: "\u9648\u5BAB\xB7\u62E9\u4E3B", source: "\u5DE8\u95E8+\u5929\u673A+\u64CE\u7F8A\uFF0C\u4EA4\u53CB\u5BAB\u5316\u5FCC\u51B2\u7167", clauses: [
    inSF(["\u5DE8\u95E8"]),
    inSF(["\u5929\u673A"]),
    inSF(["\u64CE\u7F8A"]),
    mutIn(["\u4EA4\u53CB", "\u5144\u5F1F"], "\u5FCC")
  ] },
  { id: 21, name: "\u5F90\u5EB6\xB7\u5B5D\u4E49", source: "\u6587\u660C\u6587\u66F2\u5929\u76F8\uFF0C\u7236\u6BCD\u5BAB\u5316\u5FCC/\u9640\u7F57", clauses: [
    inSF(["\u6587\u660C"]),
    inSF(["\u6587\u66F2"]),
    inSF(["\u5929\u76F8"]),
    any("\u7236\u6BCD\u6709\u5316\u5FCC\u6216\u9640\u7F57", mutIn(["\u7236\u6BCD"], "\u5FCC"), inPalaces(["\u7236\u6BCD"], ["\u9640\u7F57"]))
  ] },
  { id: 22, name: "\u5F20\u8FBD\xB7\u6B62\u557C", source: "\u4E03\u6740+\u6B66\u66F2\u5E99\u65FA\uFF0C\u8FC1\u79FB\u7984\u5B58/\u5316\u7984", clauses: [
    inSF(["\u4E03\u6740"]),
    inSF(["\u6B66\u66F2"], { bright: true }),
    any("\u8FC1\u79FB\u6709\u7984\u5B58\u6216\u5316\u7984", inPalaces(["\u8FC1\u79FB"], ["\u7984\u5B58"]), mutIn(["\u8FC1\u79FB"], "\u7984"))
  ] },
  { id: 23, name: "\u7518\u5B81\xB7\u5148\u950B", source: "\u706B\u661F+\u7834\u519B+\u5929\u5211\uFF0C\u547D\u75BE\u5384\u7686\u65FA", clauses: [
    inSF(["\u706B\u661F"]),
    inSF(["\u7834\u519B"]),
    inSF(["\u5929\u5211"]),
    strong("\u547D\u5BAB"),
    strong("\u75BE\u5384")
  ] },
  { id: 24, name: "\u8340\u6538\xB7\u9690\u7B56", source: "\u5929\u673A+\u592A\u9634+\u5730\u7A7A\uFF0C\u798F\u5FB7\u89C1\u5316\u79D1", clauses: [
    inSF(["\u5929\u673A"]),
    inSF(["\u592A\u9634"]),
    inSF(["\u5730\u7A7A"]),
    mutIn(["\u798F\u5FB7"], "\u79D1")
  ] }
];
function evaluatePersona(chart, rule) {
  const ming = palace(chart, "\u547D\u5BAB");
  const ctx = { chart, sf: sanFangSiZheng(chart, ming), p: (n) => palace(chart, n) };
  const matched = [];
  const unmatched = [];
  for (const cl of rule.clauses) (cl.test(ctx) ? matched : unmatched).push(cl.desc);
  return { matched, unmatched };
}
var CORE_COUNTS = {
  1: 2,
  2: 2,
  3: 2,
  4: 2,
  5: 2,
  6: 2,
  7: 2,
  8: 2,
  9: 2,
  10: 3,
  11: 1,
  12: 3,
  13: 3,
  14: 2,
  15: 2,
  16: 2,
  17: 3,
  18: 2,
  19: 3,
  20: 3,
  21: 3,
  22: 2,
  23: 3,
  24: 3
};
var PERSONA_RULES_V2 = PERSONA_RULES.map(
  (r) => r.id === 7 ? {
    id: 7,
    name: "\u5218\u5907\xB7\u4EC1\u5FB7",
    source: "\u3010v2 \u63D0\u6848\u3011\u5929\u540C/\u592A\u9634\u5316\u79D1\u5750\u547D\u6216\u8EAB + \u5DE6\u8F85/\u53F3\u5F3C\uFF0C\u5144\u5F1F\u6216\u4EA4\u53CB\u5BAB\u65FA",
    core: 2,
    clauses: [
      { desc: "\u5929\u540C\u6216\u592A\u9634\u5316\u79D1\u5750\u547D\u5BAB\u6216\u8EAB\u5BAB", test: (c) => hasStar([c.p("\u547D\u5BAB"), bodyPalace(c.chart)], ["\u5929\u540C", "\u592A\u9634"], { mutagen: "\u79D1" }) },
      inSF(["\u5DE6\u8F85", "\u53F3\u5F3C"]),
      any("\u5144\u5F1F\u6216\u4EA4\u53CB\u5BAB\u65FA", strong("\u5144\u5F1F"), strong("\u4EA4\u53CB"))
    ]
  } : { ...r, core: CORE_COUNTS[r.id] }
);
function rulesFor(version) {
  return version === "v2" ? PERSONA_RULES_V2 : PERSONA_RULES;
}
function matchPersona(chart, version = "v1") {
  const rules = rulesFor(version);
  const ranked = rules.map((r) => {
    const e = evaluatePersona(chart, r);
    const coreN = r.core ?? 0;
    const coreOk = version === "v2" ? r.clauses.slice(0, coreN).every((cl) => e.matched.includes(cl.desc)) : false;
    return { rule: r, ...e, ratio: e.matched.length / r.clauses.length, coreOk };
  }).sort((a, b) => Number(b.coreOk) - Number(a.coreOk) || b.ratio - a.ratio || b.rule.clauses.length - a.rule.clauses.length || a.rule.id - b.rule.id);
  const top = ranked[0];
  return {
    id: top.rule.id,
    name: top.rule.name,
    matchRatio: Number(top.ratio.toFixed(3)),
    fullMatch: top.unmatched.length === 0,
    ...version === "v2" ? { coreMatch: top.coreOk } : {},
    matched: top.matched,
    unmatched: top.unmatched,
    runnersUp: ranked.slice(1, 4).map((x) => ({ id: x.rule.id, name: x.rule.name, matchRatio: Number(x.ratio.toFixed(3)) }))
  };
}

// src/normalize.ts
var import_iztro = __toESM(require("iztro"), 1);
var NAME_ALIAS = { \u4EC6\u5F79: "\u4EA4\u53CB", \u4EA4\u53CB: "\u4EA4\u53CB" };
var MUTAGENS = /* @__PURE__ */ new Set(["\u7984", "\u6743", "\u79D1", "\u5FCC"]);
function toPalaceName(raw) {
  const n = NAME_ALIAS[raw] ?? raw;
  if (!PALACE_NAMES.includes(n)) throw new Error(`\u672A\u77E5\u5BAB\u540D\uFF1A${raw}`);
  return n;
}
function toStar(s) {
  return {
    name: s.name,
    type: s.type,
    brightness: s.brightness ?? "",
    mutagen: s.mutagen && MUTAGENS.has(s.mutagen) ? s.mutagen : null
  };
}
function fromIztro(astrolabe, refDate) {
  let layers;
  if (refDate) {
    const h = astrolabe.horoscope(refDate);
    const layer = (label, x) => ({
      label,
      stem: x.heavenlyStem,
      stars: { \u7984: x.mutagen[0], \u6743: x.mutagen[1], \u79D1: x.mutagen[2], \u5FCC: x.mutagen[3] }
    });
    layers = [layer("\u5927\u9650", h.decadal), layer("\u6D41\u5E74", h.yearly)];
  }
  const stemTable = {};
  for (let y = 2024; y < 2034; y++) {
    const x = astrolabe.horoscope(`${y}-6-1`).yearly;
    stemTable[x.heavenlyStem] = { \u7984: x.mutagen[0], \u6743: x.mutagen[1], \u79D1: x.mutagen[2], \u5FCC: x.mutagen[3] };
  }
  return {
    ...layers ? { layers } : {},
    stemTable,
    palaces: astrolabe.palaces.map((p, i) => ({
      name: toPalaceName(p.name),
      position: i,
      isBodyPalace: Boolean(p.isBodyPalace),
      changsheng: p.changsheng12 ?? "",
      stars: [...p.majorStars, ...p.minorStars, ...p.adjectiveStars].map(toStar)
    }))
  };
}
function chartBySolar(date, hourIndex, gender, refDate) {
  return fromIztro(import_iztro.default.astro.bySolar(date, hourIndex, gender, true, "zh-CN"), refDate);
}

// src/citation.ts
var STARS = [
  "\u7D2B\u5FAE",
  "\u5929\u673A",
  "\u592A\u9633",
  "\u6B66\u66F2",
  "\u5929\u540C",
  "\u5EC9\u8D1E",
  "\u5929\u5E9C",
  "\u592A\u9634",
  "\u8D2A\u72FC",
  "\u5DE8\u95E8",
  "\u5929\u76F8",
  "\u5929\u6881",
  "\u4E03\u6740",
  "\u7834\u519B",
  "\u6587\u660C",
  "\u6587\u66F2",
  "\u5DE6\u8F85",
  "\u53F3\u5F3C",
  "\u5929\u9B41",
  "\u5929\u94BA",
  "\u7984\u5B58",
  "\u5929\u9A6C",
  "\u64CE\u7F8A",
  "\u9640\u7F57",
  "\u706B\u661F",
  "\u94C3\u661F",
  "\u5730\u7A7A",
  "\u5730\u52AB"
];
var PALACE_ALIAS = {
  \u547D: "\u547D\u5BAB",
  \u5144\u5F1F: "\u5144\u5F1F",
  \u592B\u59BB: "\u592B\u59BB",
  \u5B50\u5973: "\u5B50\u5973",
  \u8D22\u5E1B: "\u8D22\u5E1B",
  \u75BE\u5384: "\u75BE\u5384",
  \u8FC1\u79FB: "\u8FC1\u79FB",
  \u4EA4\u53CB: "\u4EA4\u53CB",
  \u4EC6\u5F79: "\u4EA4\u53CB",
  \u5974\u4EC6: "\u4EA4\u53CB",
  \u5B98\u7984: "\u5B98\u7984",
  \u4E8B\u4E1A: "\u5B98\u7984",
  \u7530\u5B85: "\u7530\u5B85",
  \u798F\u5FB7: "\u798F\u5FB7",
  \u7236\u6BCD: "\u7236\u6BCD"
};
var S = STARS.join("|");
var P = Object.keys(PALACE_ALIAS).join("|");
var NON_NATAL = /(流年|流月|大限|小限|飞|宫干|自化|若|如果|假如|行运|今年|明年|当年|年内|20\d\d|[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]?年)/;
var UNCHECKABLE_MUTAGEN = /(流月|流日|飞|宫干|自化|若|如果|假如)/;
var NEGATED_AFTER = /^.{0,4}(未|不成|不满足|条件)/u;
var NEGATED_BEFORE = /(无|非|未|没有|并非|缺)$/u;
function clauseAround(text, idx) {
  const start = Math.max(text.lastIndexOf("\u3002", idx), text.lastIndexOf("\n", idx), text.lastIndexOf("\uFF1B", idx)) + 1;
  const ends = ["\u3002", "\n", "\uFF1B"].map((c) => text.indexOf(c, idx)).filter((x) => x >= 0);
  return text.slice(start, ends.length ? Math.min(...ends) : text.length);
}
var STEMS = "\u7532\u4E59\u4E19\u4E01\u620A\u5DF1\u5E9A\u8F9B\u58EC\u7678";
function explicitStem(text, idx) {
  const para = text.slice(text.lastIndexOf("\n", idx) + 1, idx);
  let last = null;
  for (const m of para.matchAll(/(20\d\d)年?|([甲乙丙丁戊己庚辛壬癸])(?:[子丑寅卯辰巳午未申酉戌亥]年|年|干)/gu)) {
    const stem = m[1] ? STEMS[(Number(m[1]) - 4) % 10] : m[2];
    last = { at: m.index, stem };
  }
  return last?.stem ?? null;
}
function isNegated(text, idx, len) {
  return NEGATED_AFTER.test(text.slice(idx + len, idx + len + 8)) || NEGATED_BEFORE.test(text.slice(Math.max(0, idx - 3), idx));
}
function starIn(chart, star, p) {
  return palace(chart, p).stars.some((s) => s.name === star);
}
function extractClaims(chart, text) {
  const claims = [];
  const seen = /* @__PURE__ */ new Set();
  const push = (c0, at) => {
    const c = { ...c0, at };
    const key = `${c.kind}|${c.star}|${c.palace ?? ""}|${c.value ?? ""}|${at}`;
    if (!seen.has(key)) {
      seen.add(key);
      claims.push(c);
    }
  };
  const placeChecks = [
    [new RegExp(`(${P})\u5BAB[\u6709\u89C1\u5750\u4E3A\u662F\u4E4B\u7684\u5185\u4E2D\u4E3B\u661F\uFF1A:\uFF08(\u3001\\s]{0,4}(${S})`, "gu"), (m) => [m[2], m[1]]],
    [new RegExp(`(${S})(?:\u5316[\u7984\u6743\u79D1\u5FCC])?(?:\u5E99\u65FA|\u5E99|\u65FA|\u5F97\u5730|\u843D\u9677|\u9677)?\u661F?(?:\u5750|\u5728|\u843D|\u5165|\u5C45|\u5B88|\u4F4D\u4E8E)\u4E8E?(${P})\u5BAB`, "gu"), (m) => [m[1], m[2]]]
  ];
  for (const [re, pick] of placeChecks) {
    for (let m; m = re.exec(text); ) {
      const [star, rawP] = pick(m);
      const p = PALACE_ALIAS[rawP];
      const clause = clauseAround(text, m.index);
      if (NON_NATAL.test(clause) || isNegated(text, m.index, m[0].length)) continue;
      let ok = starIn(chart, star, p);
      let reason = ok ? "\u5728\u8BE5\u5BAB" : "\u8BE5\u5BAB\u65E0\u6B64\u661F";
      if (!ok && starIn(chart, star, opposite(chart, palace(chart, p)).name) && /(借|对宫|冲|照)/.test(clause)) {
        ok = true;
        reason = "\u5728\u5BF9\u5BAB\uFF08\u501F\u661F/\u51B2\u7167\u8BED\u5883\uFF09";
      }
      push({ kind: "star-in-palace", text: m[0], star, palace: p, ok, reason }, m.index);
    }
  }
  const mutRe = new RegExp(`(${S})\u5316(\u7984|\u6743|\u79D1|\u5FCC)`, "gu");
  const all = chart.palaces.flatMap((p) => p.stars);
  for (let m; m = mutRe.exec(text); ) {
    if (UNCHECKABLE_MUTAGEN.test(clauseAround(text, m.index)) || isNegated(text, m.index, m[0].length)) continue;
    const star = m[1];
    const mut = m[2];
    const prev = STARS.find((n) => text.slice(0, m.index).endsWith(n));
    const owners = prev ? [star, prev] : [star];
    let reason = "";
    const stem = explicitStem(text, m.index);
    if (owners.some((o) => all.find((s) => s.name === o)?.mutagen === mut)) reason = "\u751F\u5E74\u56DB\u5316\u4E00\u81F4";
    else if (stem && chart.stemTable?.[stem] && owners.includes(chart.stemTable[stem][mut])) reason = `${stem}\u5E72\u56DB\u5316\u4E00\u81F4\uFF08\u6587\u4E2D\u5199\u660E\uFF09`;
    else {
      const hit = (chart.layers ?? []).find((l) => owners.includes(l.stars[mut]));
      if (hit) reason = `${hit.label}\u56DB\u5316\u4E00\u81F4\uFF08${hit.stem}\u5E72\uFF09`;
    }
    const ok = reason !== "";
    if (!ok) {
      const natal = all.find((s) => s.name === star)?.mutagen ?? "\u65E0";
      const layerDesc = (chart.layers ?? []).map((l) => `${l.label}${l.stem}\u5E72\u5316${mut}\u4E3A${l.stars[mut]}`).join("\uFF0C");
      const stemDesc = stem && chart.stemTable?.[stem] ? `\uFF1B\u6587\u4E2D\u6240\u6307${stem}\u5E72\u5316${mut}\u4E3A${chart.stemTable[stem][mut]}` : "";
      reason = `\u751F\u5E74\u56DB\u5316\u4E3A${natal}${layerDesc ? "\uFF1B" + layerDesc : ""}${stemDesc}`;
    }
    push({ kind: "mutagen", text: m[0], star, value: mut, ok, reason }, m.index);
  }
  const brRe = new RegExp(`(${S})(\u5E99\u65FA|\u5E99|\u65FA(?!\u76DB)|\u5F97\u5730|\u843D\u9677|\u9677(?!\u5165))`, "gu");
  const ACCEPT = { \u5E99\u65FA: ["\u5E99", "\u65FA"], \u5E99: ["\u5E99"], \u65FA: ["\u65FA"], \u5F97\u5730: ["\u5F97"], \u843D\u9677: ["\u9677"], \u9677: ["\u9677"] };
  for (let m; m = brRe.exec(text); ) {
    const star = m[1];
    const hit = chart.palaces.flatMap((p) => p.stars).find((s) => s.name === star);
    if (!hit || !hit.brightness) continue;
    const ok = ACCEPT[m[2]].includes(hit.brightness);
    push({ kind: "brightness", text: m[0], star, value: m[2], ok, reason: ok ? "\u4EAE\u5EA6\u4E00\u81F4" : `\u76D8\u4E0A\u4E3A${hit.brightness}` }, m.index);
  }
  return claims;
}

// src/product.ts
var import_iztro2 = __toESM(require("iztro"), 1);
function validateBirth(b) {
  const x = b;
  if (!x || typeof x !== "object") throw new Error("birth \u7F3A\u5931");
  const date = String(x.date ?? "");
  const m = date.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!m || +m[1] < 1900 || +m[1] > 2100 || +m[2] < 1 || +m[2] > 12 || +m[3] < 1 || +m[3] > 31) throw new Error("birth.date \u4E0D\u5408\u6CD5");
  const hourIndex = Number(x.hourIndex);
  if (!Number.isInteger(hourIndex) || hourIndex < 0 || hourIndex > 12) throw new Error("birth.hourIndex \u4E0D\u5408\u6CD5");
  const gender = x.gender;
  if (gender !== "\u7537" && gender !== "\u5973") throw new Error("birth.gender \u4E0D\u5408\u6CD5");
  return { date, hourIndex, gender };
}
function chartText(a, refYear) {
  const star = (s) => s.name + (s.brightness ? `[${s.brightness}]` : "") + (s.mutagen ? "\u5316" + s.mutagen : "");
  const lines = [
    `\u6027\u522B\uFF1A${a.gender}\u3000\u516C\u5386\uFF1A${a.solarDate}\u3000\u519C\u5386\uFF1A${a.lunarDate}\u3000\u5E72\u652F\uFF1A${a.chineseDate}`,
    `\u4E94\u884C\u5C40\uFF1A${a.fiveElementsClass}\u3000\u547D\u4E3B\uFF1A${a.soul}\u3000\u8EAB\u4E3B\uFF1A${a.body}\u3000\u5F53\u524D\u5E74\u4EFD\uFF1A${refYear}`,
    "\uFF08\u661F\u66DC\u540E\u65B9\u62EC\u53F7\u5185\u4E3A\u4EAE\u5EA6\uFF1A\u5E99\u3001\u65FA\u3001\u5F97\u3001\u5229\u3001\u5E73\u3001\u4E0D\u3001\u9677\uFF09",
    ""
  ];
  for (const p of a.palaces) {
    const name = p.name === "\u4EC6\u5F79" ? "\u4EA4\u53CB" : p.name;
    lines.push(
      `\u3010${name}${p.isBodyPalace ? "\uFF08\u8EAB\u5BAB\uFF09" : ""}\u3011${p.heavenlyStem}${p.earthlyBranch}\u3000\u5927\u9650${p.decadal.range[0]}-${p.decadal.range[1]}\u5C81\u3000${p.changsheng12}`,
      `  \u4E3B\u661F\uFF1A${p.majorStars.map(star).join("\u3001") || "\u65E0\uFF08\u7A7A\u5BAB\uFF09"}`,
      `  \u8F85\u715E\uFF1A${p.minorStars.map(star).join("\u3001") || "\u65E0"}`,
      `  \u6742\u66DC\uFF1A${p.adjectiveStars.map((s) => s.name).join("\u3001") || "\u65E0"}`
    );
  }
  return lines.join("\n");
}
function profileFromBirth(birth, opts = {}) {
  const b = validateBirth(birth);
  const rules = opts.rules ?? "v1";
  const refDate = opts.refDate ?? `${(/* @__PURE__ */ new Date()).getFullYear()}-6-1`;
  const a = import_iztro2.default.astro.bySolar(b.date, b.hourIndex, b.gender, true, "zh-CN");
  const chart = fromIztro(a, refDate);
  const scoreDetail = computeScores(chart, rules);
  const scores = Object.fromEntries(Object.entries(scoreDetail).map(([k, v]) => [k, v.score]));
  const persona = matchPersona(chart, rules);
  const facts = {
    \u89C4\u5219\u7248\u672C: rules,
    \u516D\u7EF4\u5206: scores,
    \u516D\u7EF4\u4F9D\u636E: Object.fromEntries(Object.entries(scoreDetail).map(([k, v]) => [k, v.perPalace.map((p) => ({ \u5BAB\u4F4D: p.palace, \u5206: p.score, \u52A0\u5206: p.positive.map((e) => e.detail), \u51CF\u5206: p.negative.map((e) => e.detail) }))])),
    \u4EBA\u7269: { name: persona.name, fullMatch: persona.fullMatch, \u6EE1\u8DB3: persona.matched, \u672A\u6EE1\u8DB3: persona.unmatched }
  };
  return { birth: b, rules, chart, scores, persona, facts, chartText: chartText(a, Number(refDate.slice(0, 4))) };
}
function engineMarkers(p, card = {}) {
  const name = p.persona.name.split("\xB7")[0];
  return `<!--SCORES:${JSON.stringify(p.scores)}-->
<!--CARD:${JSON.stringify({ name, label: name, title: card.title || p.persona.name.split("\xB7")[1] || name, subtitle: card.subtitle || "\u547D\u76D8\u5B9A\u9AA8\u67B6 \xB7 \u95EE\u5377\u5B9A\u8840\u8089" })}-->`;
}

// src/index.ts
function computeProfile(chart, opts = {}) {
  const rules = opts.rules ?? "v1";
  const scores = computeScores(chart, rules);
  const persona = matchPersona(chart, rules);
  return {
    rules,
    scores: Object.fromEntries(Object.entries(scores).map(([k, v]) => [k, v.score])),
    scoreDetail: scores,
    persona
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  DIM_PALACES,
  PALACE_NAMES,
  PERSONA_RULES,
  PERSONA_RULES_V2,
  SCORE_DIMS,
  chartBySolar,
  combine,
  computeProfile,
  computeScores,
  engineMarkers,
  evaluatePersona,
  extractClaims,
  fromIztro,
  matchPersona,
  profileFromBirth,
  rulesFor,
  scorePalace,
  scorePalaceV2,
  validateBirth
});
