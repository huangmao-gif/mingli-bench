// LLM 评测用的 10 张固定命盘（构造的出生信息，不对应真实用户）
export const CHARTS: { id: string; date: string; hour: number; gender: '男' | '女' }[] = [
  { id: 'c01', date: '1985-3-12', hour: 4, gender: '男' },
  { id: 'c02', date: '1990-7-25', hour: 8, gender: '女' },
  { id: 'c03', date: '1978-11-3', hour: 1, gender: '男' },
  { id: 'c04', date: '2001-1-19', hour: 10, gender: '女' },
  { id: 'c05', date: '1995-5-30', hour: 6, gender: '男' },
  { id: 'c06', date: '1968-9-9', hour: 3, gender: '女' },
  { id: 'c07', date: '2003-12-1', hour: 11, gender: '男' },
  { id: 'c08', date: '1982-4-16', hour: 7, gender: '女' },
  { id: 'c09', date: '1999-8-8', hour: 0, gender: '男' },
  { id: 'c10', date: '1973-2-27', hour: 5, gender: '女' },
];
