import { getWeatherIconUrl } from '../../api/weatherApi';
import type { WeatherSearchState } from '../../hooks/useWeatherSearch';
import type { WeatherReport } from '../../types/weather';
import { formatIsoDateTime, formatTemperature } from '../../utils/format';
import { formatLocation } from '../../utils/location';
import { Spinner } from '../ui/Spinner';
import styles from './WeatherSummary.module.css';

interface WeatherSummaryProps {
  state: WeatherSearchState;
}

/** "Today's Weather" section: shows the latest result, a loading state or a prompt. */
export function WeatherSummary({ state }: WeatherSummaryProps) {
  return (
    <section
      className={styles.summary}
      aria-labelledby="todays-weather-title"
      aria-busy={state.status === 'loading'}
    >
      <h1 id="todays-weather-title" className={styles.title}>
        Today&apos;s Weather
      </h1>
      {renderContent(state)}
    </section>
  );
}

function renderContent(state: WeatherSearchState) {
  switch (state.status) {
    case 'loading':
      return (
        <p className={styles.message} role="status">
          <Spinner /> Loading weather…
        </p>
      );
    case 'success':
      return <WeatherDetails report={state.report} />;
    default:
      return (
        <p className={styles.message}>Search for a city or country to see today&apos;s weather.</p>
      );
  }
}

function WeatherDetails({ report }: { report: WeatherReport }) {
  return (
    <>
      <img
        className={styles.icon}
        src={getWeatherIconUrl(report.iconCode)}
        alt=""
        width={200}
        height={200}
      />
      <p className={styles.temperature}>
        {formatTemperature(report.temperature)}
        <span className="visually-hidden">C</span>
      </p>
      <p className={styles.range}>
        H: {formatTemperature(report.temperatureMax)} L: {formatTemperature(report.temperatureMin)}
      </p>
      <p className={styles.location}>{formatLocation(report.city, report.countryCode)}</p>
      <p className={styles.time}>
        <time dateTime={report.retrievedAt}>{formatIsoDateTime(report.retrievedAt)}</time>
      </p>
      <p className={styles.humidity}>Humidity: {report.humidity}%</p>
      <p className={styles.condition}>
        {report.condition}
        <span className={styles.description}>{report.description}</span>
      </p>
    </>
  );
}
