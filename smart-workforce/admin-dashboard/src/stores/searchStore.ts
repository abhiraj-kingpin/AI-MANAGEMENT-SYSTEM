import { create } from 'zustand';

/** Backs the Topbar's global search input. Each list page reads `query` and
 *  filters its own currently-loaded rows (Employees additionally forwards it
 *  into its existing server-side search, since that already covers the full
 *  dataset rather than just the current page). Reset on route change by
 *  AppShell so a query typed on one section doesn't silently keep filtering
 *  the next one you navigate to. */
interface SearchState {
  query: string;
  setQuery: (query: string) => void;
  clear: () => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  query: '',
  setQuery: (query) => set({ query }),
  clear: () => set({ query: '' }),
}));
