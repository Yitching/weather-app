import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createReport } from '../../test/fixtures';
import { WeatherSummary } from './WeatherSummary';

describe('WeatherSummary', () => {
  it('always shows the "Today\'s Weather" heading', () => {
    render(<WeatherSummary state={{ status: 'idle' }} />);

    expect(screen.getByRole('heading', { level: 1, name: "Today's Weather" })).toBeInTheDocument();
  });

  it('prompts the user to search before any result is shown', () => {
    render(<WeatherSummary state={{ status: 'idle' }} />);

    expect(screen.getByText(/search for a city or country/i)).toBeInTheDocument();
  });

  it('shows a loading status', () => {
    render(<WeatherSummary state={{ status: 'loading' }} />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading weather…');
  });

  it('shows all weather details from the mockup', () => {
    render(<WeatherSummary state={{ status: 'success', report: createReport() }} />);

    expect(screen.getByText('31°')).toBeInTheDocument();
    expect(screen.getByText('H: 32° L: 29°')).toBeInTheDocument();
    expect(screen.getByText('Johor Bahru, MY')).toBeInTheDocument();
    expect(screen.getByText('01-09-2022 09:41am')).toBeInTheDocument();
    expect(screen.getByText('Humidity: 58%')).toBeInTheDocument();
    expect(screen.getByText('Clouds')).toBeInTheDocument();
    expect(screen.getByText('scattered clouds')).toBeInTheDocument();
  });
});
