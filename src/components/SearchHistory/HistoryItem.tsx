import type { SearchHistoryEntry } from '../../types/weather';
import { formatIsoDateTime } from '../../utils/format';
import { formatLocation } from '../../utils/location';
import { IconButton } from '../ui/IconButton';
import { SearchIcon, TrashIcon } from '../ui/Icons';
import styles from './SearchHistory.module.css';

interface HistoryItemProps {
  entry: SearchHistoryEntry;
  onSearchAgain: (entry: SearchHistoryEntry) => void;
  onDelete: (id: string) => void;
  isSearching: boolean;
}

/** One search history row with "search again" and "delete" actions. */
export function HistoryItem({ entry, onSearchAgain, onDelete, isSearching }: HistoryItemProps) {
  const location = formatLocation(entry.city, entry.countryCode);

  return (
    <li className={styles.item}>
      <div className={styles.info}>
        <span className={styles.location}>{location}</span>
        <time className={styles.time} dateTime={entry.searchedAt}>
          {formatIsoDateTime(entry.searchedAt)}
        </time>
      </div>
      <div className={styles.actions}>
        <IconButton
          label={`Search ${location} again`}
          icon={<SearchIcon />}
          onClick={() => onSearchAgain(entry)}
          disabled={isSearching}
        />
        <IconButton
          label={`Delete ${location} from history`}
          icon={<TrashIcon />}
          onClick={() => onDelete(entry.id)}
        />
      </div>
    </li>
  );
}
