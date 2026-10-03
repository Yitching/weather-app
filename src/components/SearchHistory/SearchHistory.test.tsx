import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createHistoryEntry } from '../../test/fixtures';
import { SearchHistory } from './SearchHistory';

const entries = [
  createHistoryEntry({ city: 'Johor', countryCode: 'MY' }),
  createHistoryEntry({ city: 'Osaka', countryCode: 'JP' }),
];

function renderHistory(props: Partial<Parameters<typeof SearchHistory>[0]> = {}) {
  const onSearchAgain = vi.fn();
  const onDelete = vi.fn();
  render(
    <SearchHistory
      entries={entries}
      onSearchAgain={onSearchAgain}
      onDelete={onDelete}
      isSearching={false}
      {...props}
    />,
  );
  return { onSearchAgain, onDelete, user: userEvent.setup() };
}

describe('SearchHistory', () => {
  it('shows "No Record" when there is no history', () => {
    renderHistory({ entries: [] });

    expect(screen.getByText('No Record')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('lists each entry with its location and time', () => {
    renderHistory();

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(within(items[0]!).getByText('Johor, MY')).toBeInTheDocument();
    expect(within(items[0]!).getByText('01-09-2022 09:41am')).toBeInTheDocument();
    expect(within(items[1]!).getByText('Osaka, JP')).toBeInTheDocument();
  });

  it('calls onSearchAgain with the entry when its search button is clicked', async () => {
    const { onSearchAgain, user } = renderHistory();

    await user.click(screen.getByRole('button', { name: 'Search Osaka, JP again' }));

    expect(onSearchAgain).toHaveBeenCalledWith(entries[1]);
  });

  it('calls onDelete with the entry id when its delete button is clicked', async () => {
    const { onDelete, user } = renderHistory();

    await user.click(screen.getByRole('button', { name: 'Delete Johor, MY from history' }));

    expect(onDelete).toHaveBeenCalledWith('johor|my');
  });

  it('disables "search again" while a search is running, but still allows delete', () => {
    renderHistory({ isSearching: true });

    expect(screen.getByRole('button', { name: 'Search Johor, MY again' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Delete Johor, MY from history' })).toBeEnabled();
  });
});
