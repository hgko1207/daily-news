// 저장소의 브리핑 md를 읽어 app/public/data/*.json을 만든다.
// 구조 추출 실패는 경고만 남기고(exit 0), md 읽기 같은 진짜 오류에서만 실패한다.
import { appendFileSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildSearchDocs,
  categoryForFolder,
  extractActions,
  extractEvents,
  extractTickers,
  listSummary,
  parseEntry,
  pickHeadline,
  type Action,
  type Entry,
  type EventRow,
  type SearchDoc,
} from './parse.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const OUT = resolve(HERE, '../public/data');

const FOLDER_RE = /^\d{2}_/;
const FILE_RE = /^(\d{4}-\d{2}-\d{2})\.md$/;
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

interface TickerAgg {
  key: string;
  name: string;
  code?: string;
  lastDate: string;
  count: number;
  mentions: { date: string; text: string }[];
}

function weekday(date: string): string {
  return WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()]!;
}

function half(date: string): string {
  return `${date.slice(0, 4)}H${Number(date.slice(5, 7)) <= 6 ? 1 : 2}`;
}

function writeJson(path: string, data: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data));
}

function main() {
  const warnings: string[] = [];
  const byDate = new Map<string, Entry[]>();
  const actions: Action[] = [];
  const events: EventRow[] = [];
  const rawTickers: { date: string; name: string; code?: string; text: string }[] = [];
  const searchByHalf = new Map<string, SearchDoc[]>();

  const folders = readdirSync(ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory() && FOLDER_RE.test(d.name))
    .map((d) => d.name)
    .sort();

  for (const folder of folders) {
    const { category, known } = categoryForFolder(folder);
    if (!known) warnings.push(`매핑에 없는 폴더: ${folder} (폴더명을 라벨로 사용)`);
    const files = readdirSync(join(ROOT, folder)).filter((f) => FILE_RE.test(f)).sort();
    for (const file of files) {
      const date = FILE_RE.exec(file)![1]!;
      const markdown = readFileSync(join(ROOT, folder, file), 'utf8');
      const entry = parseEntry(markdown, date, category);
      if (!entry.title) warnings.push(`제목 없음: ${folder}/${file}`);
      if (category.slug !== 'word' && entry.highlightFallback) {
        warnings.push(`🔎 핵심 추출 실패(첫 문장 대체): ${folder}/${file}`);
      }
      const list = byDate.get(date) ?? [];
      list.push(entry);
      byDate.set(date, list);

      actions.push(...extractActions(markdown, date, category.slug));
      if (category.slug === 'invest') {
        events.push(...extractEvents(markdown, date));
        for (const t of extractTickers(markdown)) rawTickers.push({ date, ...t });
      }
      const docs = searchByHalf.get(half(date)) ?? [];
      docs.push(...buildSearchDocs(markdown, date, category.slug));
      searchByHalf.set(half(date), docs);
    }
  }

  const dates = [...byDate.keys()].sort();
  const latestDate = dates.at(-1) ?? null;
  const generatedAt = new Date().toISOString();

  rmSync(OUT, { recursive: true, force: true });

  // days/*.json + index.json
  const days = dates.map((date) => {
    const entries = byDate.get(date)!.sort((a, b) => a.slug.localeCompare(b.slug));
    const ordered = orderEntries(entries);
    const headline = pickHeadline(ordered);
    writeJson(join(OUT, 'days', `${date}.json`), { date, weekday: weekday(date), headline, entries: ordered });
    return {
      date,
      weekday: weekday(date),
      headline,
      categories: ordered.map((e) => ({ slug: e.slug, label: e.label, summary: listSummary(e, headline) })),
    };
  });

  // search-YYYYH[12].json
  const searchFiles: string[] = [];
  for (const [key, docs] of [...searchByHalf.entries()].sort()) {
    const name = `search-${key}.json`;
    docs.sort((a, b) => b.date.localeCompare(a.date));
    writeJson(join(OUT, name), docs);
    searchFiles.push(name);
  }

  writeJson(join(OUT, 'index.json'), {
    generatedAt,
    latestDate,
    searchFiles: searchFiles.reverse(),
    days: days.reverse(),
  });

  // aggregates.json
  writeJson(join(OUT, 'aggregates.json'), {
    generatedAt,
    actions: actions.sort((a, b) => b.date.localeCompare(a.date)),
    tickers: aggregateTickers(rawTickers),
    events: dedupeEvents(events, latestDate),
  });

  report(warnings, { files: [...byDate.values()].flat().length, days: dates.length, latestDate, searchFiles });
}

const SLUG_ORDER = ['economy', 'global', 'dev', 'invest', 'life', 'word'];

function orderEntries(entries: Entry[]): Entry[] {
  const rank = (slug: string) => {
    const i = SLUG_ORDER.indexOf(slug);
    return i === -1 ? SLUG_ORDER.length : i;
  };
  return [...entries].sort((a, b) => rank(a.slug) - rank(b.slug) || a.slug.localeCompare(b.slug));
}

/** 이름→코드 매핑을 먼저 만들어 코드 없는 언급도 같은 종목으로 합친다. 최근 언급일 내림차순(D17). */
export function aggregateTickers(raw: { date: string; name: string; code?: string; text: string }[]): TickerAgg[] {
  // 이름별로 가장 많이 쓰인 코드를 대표 코드로 삼는다.
  const pairCount = new Map<string, number>();
  for (const t of raw) if (t.code) pairCount.set(`${t.name}|${t.code}`, (pairCount.get(`${t.name}|${t.code}`) ?? 0) + 1);
  const codeByName = new Map<string, string>();
  const countOf = (name: string, code: string) => pairCount.get(`${name}|${code}`) ?? 0;
  for (const key of pairCount.keys()) {
    const [name, code] = key.split('|') as [string, string];
    const cur = codeByName.get(name);
    if (!cur || countOf(name, code) > countOf(name, cur)) codeByName.set(name, code);
  }
  // "TSMC(TSM)"과 "TSM(TSMC)"처럼 서로를 가리키면 더 많이 쓰인 쪽만 남긴다(동률이면 이름이 더 긴 쪽).
  for (const [name, code] of [...codeByName]) {
    if (codeByName.get(code) !== name) continue;
    const mine = countOf(name, code);
    const theirs = countOf(code, name);
    const keepMine = mine > theirs || (mine === theirs && name.length > code.length);
    codeByName.delete(keepMine ? code : name);
  }
  const knownCodes = new Set(codeByName.values());
  const map = new Map<string, TickerAgg>();
  for (const t of raw) {
    // "TSM (TSMC)"처럼 이름 자리에 코드가 온 표기는 그 코드로 합친다.
    const code = knownCodes.has(t.name) ? t.name : (codeByName.get(t.name) ?? t.code);
    const key = code ?? t.name;
    const agg = map.get(key) ?? { key, name: t.name, lastDate: t.date, count: 0, mentions: [] };
    if (code) agg.code = code;
    agg.count += 1;
    if (t.date >= agg.lastDate) agg.lastDate = t.date;
    if (t.date >= agg.lastDate && !knownCodes.has(t.name)) agg.name = t.name;
    agg.mentions.push({ date: t.date, text: t.text });
    map.set(key, agg);
  }
  for (const agg of map.values()) agg.mentions.sort((a, b) => b.date.localeCompare(a.date));
  return [...map.values()].sort((a, b) => b.lastDate.localeCompare(a.lastDate) || b.count - a.count);
}

/** 다가오는 일정과 날짜 미정은 최신 캘린더 파일 것만, 지난 일정은 날짜별로 가장 최근 파일 것만 남긴다. */
export function dedupeEvents(events: EventRow[], latestDate: string | null): EventRow[] {
  if (!events.length || !latestDate) return [];
  const latestSource = events.reduce((m, e) => (e.sourceDate > m ? e.sourceDate : m), '');
  const upcoming = events.filter((e) => (e.date === null || e.date >= latestDate) && e.sourceDate === latestSource);
  const past = events.filter((e) => e.date !== null && e.date < latestDate);
  const newestByDate = new Map<string, string>();
  for (const e of past) {
    const cur = newestByDate.get(e.date!);
    if (!cur || e.sourceDate > cur) newestByDate.set(e.date!, e.sourceDate);
  }
  const pastKept = past.filter((e) => newestByDate.get(e.date!) === e.sourceDate);
  return [...upcoming, ...pastKept].sort((a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999'));
}

function report(warnings: string[], stats: { files: number; days: number; latestDate: string | null; searchFiles: string[] }) {
  const sizes = readdirSync(OUT)
    .filter((f) => f.endsWith('.json'))
    .map((f) => `${f} ${(readFileSync(join(OUT, f)).length / 1024).toFixed(0)}KB`);
  const lines = [
    `## 브리핑 데이터 빌드`,
    `- 파일 ${stats.files}개, 날짜 ${stats.days}일, 최신 ${stats.latestDate}`,
    `- 출력: ${sizes.join(', ')}`,
    `- 경고 ${warnings.length}건`,
    ...warnings.map((w) => `  - ${w}`),
  ];
  console.log(lines.join('\n'));
  for (const w of warnings) if (process.env.GITHUB_ACTIONS) console.log(`::warning::${w}`);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${lines.join('\n')}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
