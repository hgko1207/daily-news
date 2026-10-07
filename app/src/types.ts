// build-data.ts가 만드는 JSON의 모양.
export interface Headline {
  slug: string;
  text: string;
}

export interface IndexDay {
  date: string;
  weekday: string;
  headline: Headline | null;
  categories: { slug: string; label: string; summary: string }[];
}

export interface IndexData {
  generatedAt: string;
  latestDate: string | null;
  searchFiles: string[];
  days: IndexDay[];
}

export interface Entry {
  date: string;
  slug: string;
  label: string;
  title: string;
  highlights: string[];
  highlightFallback: boolean;
  outline: string[];
  markdown: string;
}

export interface DayData {
  date: string;
  weekday: string;
  headline: Headline | null;
  entries: Entry[];
}

export interface Action {
  id: string;
  date: string;
  slug: string;
  text: string;
}

export interface Ticker {
  key: string;
  name: string;
  code?: string;
  lastDate: string;
  count: number;
  mentions: { date: string; text: string }[];
}

export interface EventRow {
  date: string | null;
  label: string;
  sourceDate: string;
}

export interface Aggregates {
  generatedAt: string;
  actions: Action[];
  tickers: Ticker[];
  events: EventRow[];
}

export interface SearchDoc {
  id: string;
  date: string;
  slug: string;
  heading: string;
  text: string;
}
