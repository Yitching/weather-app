# Today's Weather

A responsive React + TypeScript app that shows today's weather for a city and/or
country using OpenWeather's [Geocoding API](https://openweathermap.org/api/geocoding-api)
(to find places) and [Current Weather API](https://openweathermap.org/current) (to get
their weather), with a search history that survives page refreshes and a light/dark
theme switcher.

| Desktop — light                                            | Desktop — dark                                           |
| ---------------------------------------------------------- | -------------------------------------------------------- |
| ![Desktop light theme](docs/screenshots/desktop-light.png) | ![Desktop dark theme](docs/screenshots/desktop-dark.png) |

| Mobile — light                                           | Mobile — dark                                          | Invalid search                                   |
| -------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------ |
| ![Mobile light theme](docs/screenshots/mobile-light.png) | ![Mobile dark theme](docs/screenshots/mobile-dark.png) | ![Not found message](docs/screenshots/error.png) |

| City suggestions                                                   |
| ------------------------------------------------------------------ |
| ![City suggestions while typing](docs/screenshots/suggestions.png) |

## Quick start

**Requirements:** Node.js 20.19+ (or 22.12+) and npm.

```bash
# 1. Install dependencies
npm install

# 2. Add your OpenWeather API key
cp .env.example .env
#    then edit .env:  VITE_OPENWEATHER_API_KEY=<your key>

# 3. Start the dev server
npm run dev
#    → open http://localhost:5173
```

Get a free API key at <https://home.openweathermap.org/api_keys>.
**Note:** a newly created key can take up to ~2 hours to activate. Until then the
app shows _"The weather service rejected the API key"_, with a **Use demo data** button.

**No API key? Use demo data.** Switch on **Demo data** (top right) to try the whole
app with built-in sample weather: no key and no network needed. It is on by default
when no key is configured. Sample places include Tokyo, Osaka, Seoul, Singapore,
Kuala Lumpur, Johor Bahru, Bangkok, Jakarta, Mumbai, Dubai, Sydney, London (GB and
CA), Paris, Berlin, Reykjavik, New York, Toronto, São Paulo and Cairo. Any other city
shows the "not found" message.

## Scripts

| Command                    | What it does                                                 |
| -------------------------- | ------------------------------------------------------------ |
| `npm run dev`              | Start the dev server with hot reload                         |
| `npm run build`            | Type-check and build for production into `dist/`             |
| `npm run preview`          | Serve the production build locally                           |
| `npm run lint`             | ESLint (TypeScript, React Hooks and accessibility rules)     |
| `npm run typecheck`        | TypeScript strict type-check                                 |
| `npm test`                 | Run all unit and integration tests once                      |
| `npm run test:watch`       | Run tests in watch mode                                      |
| `npm run test:coverage`    | Tests with a coverage report                                 |
| `npm run test:e2e:install` | One-time: download the browser for end-to-end tests          |
| `npm run test:e2e`         | End-to-end tests in a real browser (desktop + mobile)        |
| `npm run format`           | Format all files with Prettier                               |
| `npm run check`            | lint → typecheck → test → build (no browser download needed) |

## Features

- **One search box for a city, a country, or both:**
  - `Osaka` → Osaka
  - `Osaka, Japan` → Osaka, narrowed to Japan (`London, Canada` → London, Ontario)
  - `Japan` → the weather in its capital, Tokyo

  The country can be a name (`Japan`, `south korea`, `Côte d'Ivoire`), an ISO code
  after a comma (`Osaka, JP`) or a common alias (`UK`, `USA`, `UAE`). Press
  <kbd>Enter</kbd> or click the search button.

- **Suggestions while typing**, after 2 letters, from OpenWeather's
  [Geocoding API](https://openweathermap.org/api/geocoding-api) (same API key), e.g.
  "London" → _London · England, GB_, _London · Ontario, CA_, … A country after a comma
  limits them to that country, and a country on its own suggests its capital
  (_Tokyo · Capital of Japan_). Picking one fills the box and searches that exact
  place. **Only real places from OpenWeather's list are ever suggested, and every
  suggestion can be searched** (see
  [How a search finds a place](#how-a-search-finds-a-place)). Works with mouse, touch
  and keyboard (<kbd>↑</kbd>/<kbd>↓</kbd>, <kbd>Enter</kbd>, <kbd>Esc</kbd>), and
  follows the WAI-ARIA combobox pattern for screen readers.
- **Shows everything in the mockup:** temperature, high/low, location, time, humidity
  and condition (plus a description such as "scattered clouds" and a weather icon).
- **Clear** empties the search box and dismisses any error message.
- **Search history**, newest first, with **search again** and **delete** buttons per
  entry. It is saved in `localStorage`, so it survives a refresh. Shows "No Record"
  when empty.
- **Clear error messages** for: empty search, unknown country, city not found,
  invalid/missing API key, rate limiting, network failure and unexpected responses.
- **Loading state:** spinner in the search button and the weather card. Buttons that
  would start another request are disabled while one is running.
- **Demo data mode:** a switch that swaps the OpenWeather API for built-in sample
  data (search, suggestions, loading and "not found" all still work). A banner makes
  clear the weather isn't live. The choice is remembered, and switching clears the
  current result so live and sample weather are never mixed up.
- **Light/dark theme:** follows the OS setting on the first visit, then remembers
  the user's choice.
- **Responsive:** desktop and mobile layouts from the mockup, down to 320px wide.
- **Accessible:** labelled inputs, buttons with accessible names, `role="alert"` for
  errors, `role="status"` for loading, visible keyboard focus, semantic headings and
  lists, reduced-motion support.

## Project structure

```
src/
├── api/
│   ├── weatherApi.ts          # OpenWeather client: geocoding → weather by coordinates, suggestions, friendly errors
│   ├── demoWeatherApi.ts      # Same contract, answered from built-in sample data (demo mode)
│   └── weatherSource.ts       # Picks live or demo data; hooks depend on this interface
├── components/
│   ├── SearchForm/            # The search box (with suggestions), Search and Clear buttons
│   ├── WeatherSummary/        # "Today's Weather" card (idle / loading / result)
│   ├── SearchHistory/         # History list + HistoryItem row (search again / delete)
│   ├── ThemeToggle/           # Light/dark switch
│   ├── DataModeToggle/        # Live / demo data switch
│   └── ui/                    # Reusable building blocks: TextField, AutocompleteField, IconButton, Alert, Spinner, Icons
├── hooks/
│   ├── useWeatherSearch.ts    # Validation + API call + loading/error state, cancels stale requests
│   ├── useSearchHistory.ts    # Add (de-duplicated) / remove history entries, persisted
│   ├── useCitySuggestions.ts  # Debounced, cached city suggestions; failures never block searching
│   ├── useDebouncedValue.ts   # Waits for typing to pause before using a value
│   ├── useDataMode.ts         # Live vs demo data, persisted; defaults to demo without a key
│   ├── useLocalStorageState.ts# useState that survives refresh, with corrupted-data protection
│   └── useTheme.ts            # Theme state applied to <html data-theme>
├── utils/
│   ├── country.ts             # Country name/alias/code → ISO code (built-in Intl data), and capitals
│   ├── location.ts            # Reads the search text ("Osaka, Japan", "Japan") into a query
│   ├── format.ts              # Date/time and temperature formatting
│   └── storage.ts             # Safe localStorage read/write
├── types/weather.ts           # Shared TypeScript types
├── test/                      # Test setup and fixtures (unit/integration)
├── App.tsx                    # Page: wires hooks to components
└── index.css                  # Theme tokens (CSS variables) and global styles
```

End-to-end tests live outside `src/`: `e2e/weather.spec.ts` (the tests) and
`e2e/mockOpenWeather.ts` (a fake OpenWeather API used inside the browser), configured
by `playwright.config.ts`.

**Design decisions**

- **State lives in hooks, UI lives in components.** Components receive data and
  callbacks through props, so each one can be reused and tested on its own. `App`
  only connects them.
- **The API layer returns app-shaped data** (`WeatherReport`), so the rest of the
  app never depends on OpenWeather's raw response format. Switching provider means
  changing one file.
- **One source of places.** The Geocoding API decides which places exist and what
  they are called; the weather API is only asked for the weather at coordinates.
  See [How a search finds a place](#how-a-search-finds-a-place).
- **Theming uses CSS variables only.** Light and dark themes are two blocks of
  tokens in `index.css`. Components use CSS Modules, so their styles are scoped.
- **No hand-maintained data.** Places and weather come from OpenWeather, country
  names from the browser's `Intl.DisplayNames`, and capitals from the open-source
  [`countries-list`](https://www.npmjs.com/package/countries-list) package (the only
  runtime dependency besides React, about 13 KB gzipped).

## How a search finds a place

OpenWeather has two APIs that matter here, and each has one job:

| API                                                           | Question it answers                  | Used for                         |
| ------------------------------------------------------------- | ------------------------------------ | -------------------------------- |
| [Geocoding API](https://openweathermap.org/api/geocoding-api) | "Where is this place?"               | City suggestions, typed searches |
| [Current Weather API](https://openweathermap.org/current)     | "What is the weather at this point?" | The weather itself               |

```
Typed search "Jeonju-si, South Korea"
  1. Geocoding API   q=Jeonju-si,KR&limit=5   → Jeonju-si, KR at 35.82, 127.15
  2. Weather API     lat=35.82&lon=127.15     → 17°, overcast clouds, humidity 62%
  3. Shown as        "Jeonju-si, KR"

Picked suggestion, or "search again" from the history
  The place's coordinates are already known, so only step 2 runs.
```

**Why not just ask the weather API for "Jeonju-si"?** The weather API can also look
places up by name (`q=Tokyo`), but it uses its own, older list of names, which
OpenWeather has deprecated: _"API requests by city name, zip-codes and city id have
been deprecated. Although they are still available for use, bug fixing and updates
are no longer available"_ ([docs](https://openweathermap.org/current)). The two lists
disagree: the suggestions (from the Geocoding API) offered "Jeonju-si" and
"Pohang-si", which the weather API's list didn't know, so picking a suggestion could
end in "Not found". The app originally searched by name; it was switched to the
design above so that:

- **Every suggestion can be searched.** A picked suggestion is searched by its exact
  coordinates, which the weather API always accepts. Two places with the same name
  (Springfield, Illinois and Springfield, Missouri) can never be mixed up.
- **A typed search is the first suggestion.** Suggestions and typed searches use the
  same Geocoding request and the same filter, and a typed search takes the first
  place, i.e. the one at the top of the list. If there is none, the app shows
  "Not found".
- **Only places whose name starts with what was typed count.** The Geocoding API
  matches loosely: "xxx" also returns Trenta, Italy ("trenta" is Italian for thirty,
  XXX), and "Lon" returns Laon. Those loose matches are left out of both the
  suggestions and the search. Names in other languages count too, so `서울` finds
  Seoul and `Munchen` finds Munich.
- **The name shown is the name searched.** By coordinates, the weather API names the
  nearest weather station (Pohang-si comes back as "Yeonil"), so the app shows the
  Geocoding name instead.
- **"Search again" finds the same place.** History entries save their coordinates.

The weather is as accurate as before. The weather API always works from coordinates;
looking a city up by name only changes _who_ turns the name into coordinates. A
side-by-side check (Tokyo, London, Singapore, Johor Bahru, Jeonju, New York) gave the
same readings to within 0.3°.

**Trade-off:** a typed search makes two requests instead of one, well within the free
plan (60 calls a minute). Picked suggestions and "search again" still make one.

### Searching a whole country

Weather belongs to a point on the map, and OpenWeather can't say which point
represents a country: the Geocoding API only searches places _by name_ ("Japan"
returns "Japan Islands"; "France" returns villages called France), and no endpoint on
the free plan lists the cities in a country. So a country on its own shows the
weather for its **capital**, as Google does for "weather in Japan":

```
"Japan"  → capital from countries-list: Tokyo  → Geocoding q=Tokyo,JP  → Tokyo, JP
```

The capital is then looked up in OpenWeather like any typed city, so the result is
still a real place from OpenWeather's list. Some places need a fallback, all without
stored data:

1. The capital in that country (Tokyo, JP).
2. If OpenWeather doesn't know the capital, the country's own name in that country.
3. If neither is found, the capital or the name **without** a country code, keeping
   only places whose region is that country. OpenWeather files some territories under
   another country: Hong Kong's places are listed in CN with the region "Hong Kong",
   and Puerto Rico's in US with the region "Puerto Rico". So "Hong Kong" finds Hong
   Kong Island and "Puerto Rico" finds San Juan.
4. Otherwise: _"Please type a city in Macao."_

Every capital in the package was checked against the live Geocoding API: all
independent countries' capitals are found. The misses are overseas territories,
mostly covered by step 3.

**Limits of OpenWeather's place list, worth knowing when testing:**

- It matches whole words rather than prefixes, so "Lond" doesn't suggest London (it
  offers Lond, India); "London" does.
- It contains some surprising real places. There are villages named **"xxx"** in Papua
  New Guinea and Russia, so searching "xxx" shows the weather for _xxx, PG_ rather
  than "Not found". A made-up name such as "xyzzyq" shows "Not found".

## Testing

197 tests (Vitest + React Testing Library) across 19 files, 100% line coverage:

- **Unit tests** for utils (reading "city, country" text, country lookup, capitals,
  formatting, storage), the API client (place lookup then weather by coordinates, the
  name filter, capitals and their fallbacks, all HTTP error codes, network failure,
  malformed responses, missing key, abort, suggestion mapping and de-duplication) and
  every hook (including debounce timing, caching and stale-result handling for
  suggestions).
- **Component tests** for each component's rendering and buttons, including full
  keyboard and mouse coverage of the autocomplete.
- **Integration tests** (`App.test.tsx`) that drive the whole page like a user:
  search by city, by city and country, and by country (its capital), loading, not
  found, invalid country, narrowing suggestions by country, empty input, network
  error, Clear, search again, delete, persistence after refresh, theme switching,
  picking suggestions, and demo mode (including the "Use demo data" button on an API
  key error).

Only `fetch` is mocked, so the tests are fast, deterministic and need no API key.
Any request a test doesn't mock fails as if offline, so no test can reach the
real network.

### End-to-end tests (Playwright)

Eight short tests that open the real app in a real browser, and run twice: on a
desktop screen and on a mobile phone screen (Pixel 7). They cover what a simulated
browser can't:

- searching and the history **surviving a real page reload**
- the "Not found" message and the Clear button
- picking a city suggestion with the keyboard, with the list **visible above the page**,
  searching by the suggestion's own coordinates
- search again (using the saved coordinates) and delete from the history
- narrowing suggestions with ", Japan", and searching "Japan" (its capital)
- the theme choice surviving a reload
- demo data making no API calls, and the switch surviving a reload
- **no horizontal scrolling** on either screen size

```bash
npm run test:e2e:install   # first time only (~150 MB browser download)
npm run test:e2e           # starts the app automatically, then runs the tests
```

The OpenWeather API is faked inside the browser, so these tests need **no API key
and no internet**. Detailed edge cases are left to the faster Vitest tests above.

## Assumptions

1. **One search box takes a city, a country, or both**, like most weather and map
   apps. (Details in [How a search finds a place](#how-a-search-finds-a-place).)
   - `Tokyo` → Geocoding `q=Tokyo`; the best match (the first suggestion) is used
   - `Tokyo, Japan` → Geocoding `q=Tokyo,JP`
   - `Japan` → its capital, Tokyo. A bare code (`JP`) is read as a city, since it is
     too easily the start of one; aliases such as `UK` count as countries.
2. **An unknown country is caught before calling the API**, with a hint to use a full
   name or 2-letter code. A city the Geocoding API doesn't know is shown as "Not found".
3. **Units are metric (°C)**, rounded to whole degrees as in the mockup.
4. **Times are when the user searched**, in the user's local time, formatted
   `DD-MM-YYYY hh:mmam` as in the mockup.
5. **History de-duplicates by location.** Searching the same place again (including
   via "search again") moves it to the top with a new time instead of adding a
   duplicate. History keeps the 20 most recent locations. Two places that display
   the same (two "Springfield, US") count as one entry, holding the latest one's
   coordinates.
6. **Failed searches are not added to history.**
7. **"Search again" also fills the search box** with that location, so the user can see
   and tweak what was searched.
8. **Clear resets the search box and any error message** but keeps the last weather
   result on screen.
9. **The last result is not restored after a refresh.** Only history and theme are
   persisted, so stale weather is never shown as current.
10. **Starting a new search cancels the previous request**, so a slow old response
    can never overwrite a newer one.
11. **Weather illustration:** the mockup's 3D artwork (Google Drive assets) is replaced
    with OpenWeather's own condition icon, so the picture always matches the actual
    weather. The cloudy background is approximated with CSS gradients.
12. **API key handling:** the key is read from `VITE_OPENWEATHER_API_KEY` at build
    time. For a production app it should sit behind a backend proxy rather than in
    browser code. That is outside the scope of this frontend test.
13. **Browser support:** current versions of Chrome, Edge, Firefox and Safari.
14. **Suggestions:**
    - City lookups start at 2 characters and wait 300 ms after typing stops. Each
      distinct lookup is cached for the session, to save API calls.
    - Picking a suggestion searches immediately, since that is almost always the
      intent.
    - While a country is still being typed ("Osaka, Jap"), it is ignored, so the
      suggestions don't disappear.
    - If suggestions fail (offline, bad key), the list stays empty and searching
      still works. Any error is shown when the user actually searches.
    - The browser's own autofill is turned off on the search box so it doesn't
      cover the suggestion list.
