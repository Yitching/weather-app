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

  it('shows the place, time, temperature and conditions', () => {
    render(<WeatherSummary state={{ status: 'success', report: createReport() }} />);

    expect(screen.getByText('31°')).toBeInTheDocument();
    expect(screen.getByText('H: 32° L: 29°')).toBeInTheDocument();
    expect(screen.getByText('Johor Bahru, MY')).toBeInTheDocument();
    expect(screen.getByText('Thu, 1 Sep 2022 · 9:41 AM')).toBeInTheDocument();
    expect(screen.getByText('scattered clouds')).toBeInTheDocument();
  });

  it('shows humidity, feels like and wind as labelled stats', () => {
    render(<WeatherSummary state={{ status: 'success', report: createReport() }} />);

    expect(screen.getByText('Humidity')).toBeInTheDocument();
    expect(screen.getByText('58%')).toBeInTheDocument();
    expect(screen.getByText('35°')).toBeInTheDocument();
    expect(screen.getByText('11 km/h')).toBeInTheDocument();
  });

  it('leaves out stats the API did not provide', () => {
    const report = createReport({ feelsLike: undefined, windSpeed: undefined });
    render(<WeatherSummary state={{ status: 'success', report }} />);

    expect(screen.getByText('58%')).toBeInTheDocument();
    expect(screen.queryByText('Feels like')).not.toBeInTheDocument();
    expect(screen.queryByText('Wind')).not.toBeInTheDocument();
  });
});
