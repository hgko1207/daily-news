import { useToast } from '@wanteddev/wds';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { fetchAggregates, fetchDay, fetchIndex, fetchSearchFile, hasNewBriefing } from './data.ts';
import type { Aggregates, DayData, IndexData, SearchDoc } from './types.ts';

type Load<T> = { status: 'loading' } | { status: 'ready'; data: T } | { status: 'error'; error: string };

interface Store {
  index: Load<IndexData>;
  online: boolean;
  reloadIndex: () => Promise<void>;
  aggregates: () => Promise<Aggregates>;
  day: (date: string) => Promise<DayData>;
  searchDocs: () => Promise<SearchDoc[]>;
}

const Ctx = createContext<Store | null>(null);

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('StoreProvider 밖에서 사용됨');
  return s;
}

/** 비동기 로더를 Load 상태로 바꾸는 훅. key가 바뀌면 다시 불러온다. */
export function useLoad<T>(loader: () => Promise<T>, key: unknown): Load<T> & { retry: () => void } {
  const [state, setState] = useState<Load<T>>({ status: 'loading' });
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    let alive = true;
    setState({ status: 'loading' });
    loader().then(
      (data) => alive && setState({ status: 'ready', data }),
      (e: unknown) => alive && setState({ status: 'error', error: String(e) }),
    );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, nonce]);
  return { ...state, retry: () => setNonce((n) => n + 1) };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [index, setIndex] = useState<Load<IndexData>>({ status: 'loading' });
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const current = useRef<IndexData | null>(null);
  const dayCache = useRef(new Map<string, Promise<DayData>>());
  const aggCache = useRef<Promise<Aggregates> | null>(null);
  const searchCache = useRef<Promise<SearchDoc[]> | null>(null);

  const reloadIndex = useCallback(async () => {
    try {
      const next = await fetchIndex();
      const prev = current.current;
      if (prev && prev.generatedAt === next.generatedAt) return;
      if (hasNewBriefing(prev, next)) toast({ content: '새 브리핑이 도착했어요', variant: 'positive' });
      if (prev) {
        // 데이터가 다시 만들어졌으면 파생 캐시를 비운다. 날짜 파일은 SW가 재검증한다.
        aggCache.current = null;
        searchCache.current = null;
        dayCache.current.clear();
      }
      current.current = next;
      setIndex({ status: 'ready', data: next });
    } catch (e) {
      if (!current.current) setIndex({ status: 'error', error: String(e) });
    }
  }, [toast]);

  useEffect(() => {
    void reloadIndex();
    // 앱으로 돌아올 때마다 새 브리핑 확인(Eng Review D4, Design Review D6)
    const onVisible = () => document.visibilityState === 'visible' && void reloadIndex();
    const onOnline = () => {
      setOnline(true);
      void reloadIndex();
    };
    const onOffline = () => setOnline(false);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [reloadIndex]);

  const store: Store = {
    index,
    online,
    reloadIndex,
    aggregates: () => {
      aggCache.current ??= fetchAggregates().catch((e) => {
        aggCache.current = null;
        throw e;
      });
      return aggCache.current;
    },
    day: (date) => {
      let p = dayCache.current.get(date);
      if (!p) {
        p = fetchDay(date).catch((e) => {
          dayCache.current.delete(date);
          throw e;
        });
        dayCache.current.set(date, p);
      }
      return p;
    },
    searchDocs: () => {
      // index가 오기 전에는 검색 파일 목록을 모른다. 빈 결과를 캐시하지 않도록 거절한다.
      if (!current.current) return Promise.reject(new Error('index not loaded'));
      const files = current.current.searchFiles;
      searchCache.current ??= Promise.all(files.map(fetchSearchFile))
        .then((parts) => parts.flat())
        .catch((e) => {
          searchCache.current = null;
          throw e;
        });
      return searchCache.current;
    },
  };

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}
