// 排盘交叉验证：不依赖 iztro，用 lunar-javascript 换算农历 + 按安星诀独立安星，再与 iztro 逐项比对。
// 这不是文墨天机对照，但两套独立实现一致时，可以排除排盘库自身的实现错误。
// 运行：node scripts/crosscheck.ts   输出：results/CROSSCHECK.md
import { writeFileSync } from 'node:fs';
import iztro from 'iztro';
import lunarJs from 'lunar-javascript';

const { Solar } = lunarJs as any;
const GAN = '甲乙丙丁戊己庚辛壬癸';
const ZHI = '子丑寅卯辰巳午未申酉戌亥';
const mod = (x: number, n = 12) => ((x % n) + n) % n;

// 六十甲子纳音五行（每两组一个纳音）
const NAYIN_ELEM = '金火木土金火水土金木水土火木水金火木土金火水土金木水土火木水';
const JU: Record<string, number> = { 水: 2, 木: 3, 金: 4, 土: 5, 火: 6 };
const nayinElem = (g: number, z: number) => {
  for (let n = 0; n < 60; n++) if (n % 10 === g && n % 12 === z) return NAYIN_ELEM[Math.floor(n / 2)];
  throw new Error('干支不合法');
};

// 生年四化（禄权科忌）
const SIHUA: Record<string, string[]> = {
  甲: ['廉贞', '破军', '武曲', '太阳'], 乙: ['天机', '天梁', '紫微', '太阴'], 丙: ['天同', '天机', '文昌', '廉贞'],
  丁: ['太阴', '天同', '天机', '巨门'], 戊: ['贪狼', '太阴', '右弼', '天机'], 己: ['武曲', '贪狼', '天梁', '文曲'],
  庚: ['太阳', '武曲', '太阴', '天同'], 辛: ['巨门', '太阳', '文曲', '文昌'], 壬: ['天梁', '紫微', '左辅', '武曲'],
  癸: ['破军', '巨门', '太阴', '贪狼'],
};
const LUCUN = [2, 3, 5, 6, 5, 6, 8, 9, 11, 0]; // 甲寅 乙卯 丙巳 丁午 戊巳 己午 庚申 辛酉 壬亥 癸子
const KUI_YUE: [number, number][] = [[1, 7], [0, 8], [11, 9], [11, 9], [1, 7], [0, 8], [1, 7], [6, 2], [3, 5], [3, 5]]; // 甲戊庚牛羊，乙己鼠猴，丙丁猪鸡，六辛逢马虎，壬癸兔蛇
const HUO_LING_START = (yz: number): [number, number] => {
  if ([2, 6, 10].includes(yz)) return [1, 3];   // 寅午戌：火丑 铃卯
  if ([8, 0, 4].includes(yz)) return [2, 10];   // 申子辰：火寅 铃戌
  if ([5, 9, 1].includes(yz)) return [3, 10];   // 巳酉丑：火卯 铃戌
  return [9, 10];                                // 亥卯未：火酉 铃戌
};

/** 独立安星：返回 星名 → 地支序号（子=0），以及命宫、身宫、五行局、生年四化 */
function place(yg: number, yz: number, m: number, d: number, h: number) {
  const pos: Record<string, number> = {};
  const ming = mod(2 + (m - 1) - h);
  const shen = mod(2 + (m - 1) + h);
  const yinStem = [2, 4, 6, 8, 0][yg % 5];
  const stemOf = (b: number) => mod(yinStem + mod(b - 2), 10);
  const ju = JU[nayinElem(stemOf(ming), ming)];
  // 紫微：找最小 x 使 (d + x) 能被局数整除，商为 q；自寅起数 q，x 奇数逆退 x、偶数顺进 x
  let x = 0;
  while ((d + x) % ju !== 0) x++;
  const q = (d + x) / ju;
  const zw = mod(2 + q - 1 + (x % 2 ? -x : x));
  Object.assign(pos, { 紫微: zw, 天机: mod(zw - 1), 太阳: mod(zw - 3), 武曲: mod(zw - 4), 天同: mod(zw - 5), 廉贞: mod(zw - 8) });
  const tf = mod(4 - zw);
  Object.assign(pos, { 天府: tf, 太阴: mod(tf + 1), 贪狼: mod(tf + 2), 巨门: mod(tf + 3), 天相: mod(tf + 4), 天梁: mod(tf + 5), 七杀: mod(tf + 6), 破军: mod(tf + 10) });
  Object.assign(pos, { 文昌: mod(10 - h), 文曲: mod(4 + h), 左辅: mod(4 + m - 1), 右弼: mod(10 - (m - 1)) });
  const lc = LUCUN[yg];
  Object.assign(pos, { 禄存: lc, 擎羊: mod(lc + 1), 陀罗: mod(lc - 1), 天魁: KUI_YUE[yg][0], 天钺: KUI_YUE[yg][1] });
  Object.assign(pos, { 地劫: mod(11 + h), 地空: mod(11 - h) });
  const [hs, ls] = HUO_LING_START(yz);
  Object.assign(pos, { 火星: mod(hs + h), 铃星: mod(ls + h) });
  return { pos, ming, shen, ju, sihua: SIHUA[GAN[yg]] };
}

const JU_NAME: Record<number, string> = { 2: '水二局', 3: '木三局', 4: '金四局', 5: '土五局', 6: '火六局' };
const mismatch = new Map<string, number>();
const examples = new Map<string, string>();
const bump = (k: string, ex: string) => { mismatch.set(k, (mismatch.get(k) ?? 0) + 1); if (!examples.has(k)) examples.set(k, ex); };
let n = 0, skippedLeap = 0, lunarMismatch = 0, checks = 0;

for (let i = 0; i < 2160; i++) {
  // 取 simulate.ts 样本网格中的每第 10 张：1960-2009 年，每月 1/11/21 日，12 时辰
  const k = i * 10;
  const h = k % 12, dIdx = Math.floor(k / 12) % 3, mIdx = Math.floor(k / 36) % 12, y = 1960 + Math.floor(k / 432);
  const date = `${y}-${mIdx + 1}-${[1, 11, 21][dIdx]}`;
  const lunar = Solar.fromYmd(y, mIdx + 1, [1, 11, 21][dIdx]).getLunar();
  if (lunar.getMonth() < 0) { skippedLeap++; continue; } // 闰月：iztro 的 fixLeap 处理规则不同，跳过
  const a = iztro.astro.bySolar(date, h, '女', true, 'zh-CN');
  const ex = `${date} ${ZHI[h]}时`;
  n++;
  // 1) 农历与年干支
  const raw = a.rawDates.lunarDate;
  checks++;
  if (raw.lunarYear !== lunar.getYear() || raw.lunarMonth !== lunar.getMonth() || raw.lunarDay !== lunar.getDay() || !a.chineseDate.startsWith(lunar.getYearGan() + lunar.getYearZhi())) {
    lunarMismatch++; bump('农历/年干支', ex);
    continue;
  }
  const yg = GAN.indexOf(lunar.getYearGan()), yz = ZHI.indexOf(lunar.getYearZhi());
  const mine = place(yg, yz, lunar.getMonth(), lunar.getDay(), h);
  // 2) 命宫、身宫、五行局
  checks += 3;
  if (ZHI.indexOf(a.earthlyBranchOfSoulPalace) !== mine.ming) bump('命宫', ex);
  if (ZHI.indexOf(a.earthlyBranchOfBodyPalace) !== mine.shen) bump('身宫', ex);
  if (a.fiveElementsClass !== JU_NAME[mine.ju]) bump('五行局', `${ex}（iztro ${a.fiveElementsClass}，独立 ${JU_NAME[mine.ju]}）`);
  // 3) 各星落宫
  const iz: Record<string, number> = {};
  const muts: Record<string, string> = {};
  for (const p of a.palaces) for (const s of [...p.majorStars, ...p.minorStars]) {
    iz[s.name] = ZHI.indexOf(p.earthlyBranch);
    if (s.mutagen) muts[s.name] = s.mutagen;
  }
  for (const [star, b] of Object.entries(mine.pos)) {
    checks++;
    if (iz[star] !== b) bump(star, `${ex}（iztro ${ZHI[iz[star]] ?? '无'}，独立 ${ZHI[b]}）`);
  }
  // 4) 生年四化
  ['禄', '权', '科', '忌'].forEach((mu, j) => {
    checks++;
    if (muts[mine.sihua[j]] !== mu) bump(`生年化${mu}`, `${ex}（独立：${mine.sihua[j]}化${mu}）`);
  });
}

const md = ['# 排盘交叉验证（iztro vs 独立实现）', '',
  `样本：${n} 张盘（simulate.ts 网格中每第 10 张；另有 ${skippedLeap} 张闰月盘跳过）。农历换算用 lunar-javascript，安星按安星诀独立实现（见 scripts/crosscheck.ts）。`, '',
  `共比对 ${checks.toLocaleString()} 项，不一致 ${[...mismatch.values()].reduce((a, b) => a + b, 0)} 项。`, '',
  '| 项目 | 不一致次数 | 首个例子 |', '|---|---|---|'];
const items = ['农历/年干支', '命宫', '身宫', '五行局', '紫微', '天机', '太阳', '武曲', '天同', '廉贞', '天府', '太阴', '贪狼', '巨门', '天相', '天梁', '七杀', '破军',
  '文昌', '文曲', '左辅', '右弼', '天魁', '天钺', '禄存', '擎羊', '陀罗', '火星', '铃星', '地空', '地劫', '生年化禄', '生年化权', '生年化科', '生年化忌'];
for (const it of items) md.push(`| ${it} | ${mismatch.get(it) ?? 0} | ${examples.get(it) ?? ''} |`);
writeFileSync('results/CROSSCHECK.md', md.join('\n') + '\n');
console.log(md.join('\n'));
