import { describe, expect, it } from 'vitest';
import { getWeatherIllustration } from './weatherIllustration';

describe('getWeatherIllustration', () => {
  it('shows the sun for clear sky, few clouds and sun showers', () => {
    for (const code of ['01d', '01n', '02d', '10d']) {
      expect(getWeatherIllustration(code)).toMatch(/sun/);
    }
  });

  it('shows the cloud for overcast, rain, storms, snow and mist', () => {
    for (const code of ['03d', '04n', '09d', '11d', '13d', '50d']) {
      expect(getWeatherIllustration(code)).toMatch(/cloud/);
    }
  });
});
