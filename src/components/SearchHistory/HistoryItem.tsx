import type { SearchHistoryEntry } from '../../types/weather';
import { formatIsoDateTime, formatRelativeTime } from '../../utils/format';
import { formatLocation } from '../../utils/location';
import { IconButton } from '../ui/IconButton';
import { ChevronRightIcon, TrashIcon } from '../ui/Icons';
import styles from './SearchHistory.module.css';

interface HistoryItemProps {
  entry: SearchHistoryEntry;
  onSearchAgain: (entry: SearchHistoryEntry) => void;
  onDelete: (id: string) => void;
  isSearching: boolean;
  /** The current time, for "5 min ago". */
  now: Date;
}

/**
 * One search history row. The whole row searches again (the chevron button's
 * hit area is stretched over it); the delete button sits on top.
 */
export function HistoryItem({
  entry,
  onSearchAgain,
  onDelete,
  isSearching,
  now,
}: HistoryItemProps) {
  const location = formatLocation(entry.city, entry.countryCode);

  return (
    <li className={styles.item}>
      <div className={styles.info}>
        <span className={styles.location}>{location}</span>
        <time
          className={styles.time}
          dateTime={entry.searchedAt}
          title={formatIsoDateTime(entry.searchedAt, now)}
        >
          {formatRelativeTime(entry.searchedAt, now)}
        </time>
      </div>
      <div className={styles.actions}>
        <IconButton
          className={styles.deleteButton}
          label={`Delete ${location} from history`}
          icon={<TrashIcon />}
          onClick={() => onDelete(entry.id)}
        />
        <IconButton
          className={styles.searchAgainButton}
          label={`Search ${location} again`}
          icon={<ChevronRightIcon />}
          onClick={() => onSearchAgain(entry)}
          disabled={isSearching}
        />
      </div>
    </li>
  );
}
