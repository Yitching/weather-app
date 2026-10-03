import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ThemeToggle } from './ThemeToggle';

describe('ThemeToggle', () => {
  it('offers the dark theme when light is active', async () => {
    const onToggle = vi.fn();
    render(<ThemeToggle theme="light" onToggle={onToggle} />);

    await userEvent.click(screen.getByRole('button', { name: 'Switch to dark theme' }));

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('offers the light theme when dark is active', () => {
    render(<ThemeToggle theme="dark" onToggle={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Switch to light theme' })).toBeInTheDocument();
  });
});
