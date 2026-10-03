import type { ReactNode } from 'react';
import type { WeatherSearchState } from '../../hooks/useWeatherSearch';
import type { WeatherReport } from '../../types/weather';
import { formatIsoDateTime, formatTemperature, formatWindSpeed } from '../../utils/format';
import { formatLocation } from '../../utils/location';
import { getWeatherIllustration } from '../../utils/weatherIllustration';
import { DropletIcon, MapPinIcon, ThermometerIcon, WindIcon } from '../ui/Icons';
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
      // Keyed so each new result replays the entrance animation.
      return <WeatherDetails key={state.report.retrievedAt} report={state.report} />;
    default:
      return (
        <p className={styles.message}>Search for a city or country to see today&apos;s weather.</p>
      );
  }
}

function WeatherDetails({ report }: { report: WeatherReport }) {
  return (
    <div className={styles.details}>
      <img
        className={styles.icon}
        src={getWeatherIllustration(report.iconCode)}
        alt=""
        width={200}
        height={200}
      />
      <p className={styles.location}>
        <MapPinIcon className={styles.pin} />
        {formatLocation(report.city, report.countryCode)}
      </p>
      <p className={styles.time}>
        <time dateTime={report.retrievedAt}>{formatIsoDateTime(report.retrievedAt)}</time>
      </p>

      <div className={styles.hero}>
        <p className={styles.temperature}>
          {formatTemperature(report.temperature)}
          <span className="visually-hidden">C</span>
        </p>
        <div className={styles.conditions}>
          <p className={styles.description}>{report.description}</p>
          <p className={styles.range}>
            H: {formatTemperature(report.temperatureMax)} L:{' '}
            {formatTemperature(report.temperatureMin)}
          </p>
        </div>
      </div>

      <dl className={styles.stats}>
        <Stat icon={<DropletIcon />} label="Humidity" value={`${report.humidity}%`} />
        {report.feelsLike !== undefined && (
          <Stat
            icon={<ThermometerIcon />}
            label="Feels like"
            value={formatTemperature(report.feelsLike)}
          />
        )}
        {report.windSpeed !== undefined && (
          <Stat icon={<WindIcon />} label="Wind" value={formatWindSpeed(report.windSpeed)} />
        )}
      </dl>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className={styles.stat}>
      <dt className={styles.statLabel}>
        {icon}
        {label}
      </dt>
      <dd className={styles.statValue}>{value}</dd>
    </div>
  );
}
