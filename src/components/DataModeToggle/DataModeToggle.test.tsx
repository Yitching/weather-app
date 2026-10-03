import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DataModeToggle } from './DataModeToggle';

describe('DataModeToggle', () => {
  it('is an unchecked switch in live mode and calls onToggle when clicked', async () => {
    const onToggle = vi.fn();
    render(<DataModeToggle mode="live" onToggle={onToggle} />);

    const toggle = screen.getByRole('switch', { name: 'Demo data' });
    expect(toggle).not.toBeChecked();

    await userEvent.click(toggle);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('is checked in demo mode', () => {
    render(<DataModeToggle mode="demo" onToggle={vi.fn()} />);

    expect(screen.getByRole('switch', { name: 'Demo data' })).toBeChecked();
  });
});
