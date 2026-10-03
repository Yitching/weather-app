import { useNow } from '../../hooks/useNow';
import type { SearchHistoryEntry } from '../../types/weather';
import { HistoryItem } from './HistoryItem';
import styles from './SearchHistory.module.css';

interface SearchHistoryProps {
  entries: SearchHistoryEntry[];
  onSearchAgain: (entry: SearchHistoryEntry) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  /** Disables "search again" while a request is running. */
  isSearching: boolean;
}

/** List of previous searches, newest first, or "No Record" when empty. */
export function SearchHistory({
  entries,
  onSearchAgain,
  onDelete,
  onClearAll,
  isSearching,
}: SearchHistoryProps) {
  const now = useNow();

  return (
    <section className={styles.panel} aria-labelledby="search-history-title">
      <div className={styles.header}>
        <h2 id="search-history-title" className={styles.title}>
          Search History
        </h2>
        {entries.length > 0 && (
          <button type="button" className={styles.clearAll} onClick={onClearAll}>
            Clear all
          </button>
        )}
      </div>
      {entries.length === 0 ? (
        <p className={styles.empty}>No Record</p>
      ) : (
        <ul className={styles.list}>
          {entries.map((entry) => (
            <HistoryItem
              key={entry.id}
              entry={entry}
              onSearchAgain={onSearchAgain}
              onDelete={onDelete}
              isSearching={isSearching}
              now={now}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
