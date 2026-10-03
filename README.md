# Today's Weather

A responsive React + TypeScript app that shows today's weather for a city and/or
country using the [OpenWeather Current Weather API](https://openweathermap.org/current),
with a search history that survives page refreshes and a light/dark theme switcher.

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
app shows _"The weather service rejected the API key"_.

## Scripts

| Command                 | What it does                                             |
| ----------------------- | -------------------------------------------------------- |
| `npm run dev`           | Start the dev server with hot reload                     |
| `npm run build`         | Type-check and build for production into `dist/`         |
| `npm run preview`       | Serve the production build locally                       |
| `npm run lint`          | ESLint (TypeScript, React Hooks and accessibility rules) |
| `npm run typecheck`     | TypeScript strict type-check                             |
| `npm test`              | Run all unit and integration tests once                  |
| `npm run test:watch`    | Run tests in watch mode                                  |
| `npm run test:coverage` | Tests with a coverage report                             |
| `npm run format`        | Format all files with Prettier                           |
| `npm run check`         | lint → typecheck → test → build (everything a CI would)  |

## Features

- **Search by city, by country, or both.** The country can be a name
  (`Japan`, `south korea`, `Côte d'Ivoire`), an ISO code (`JP`) or a common alias
  (`UK`, `USA`, `UAE`). Press <kbd>Enter</kbd> or click the search button.
- **Suggestions while typing.**
  - **City:** after 2 letters, matching places appear from OpenWeather's
    [Geocoding API](https://openweathermap.org/api/geocoding-api) (same API key), e.g.
    "Joh" → _Johor Bahru · Johor, MY_. Picking one fills City and Country and searches
    straight away. If the Country field holds a country, suggestions are limited to it.
  - **Country:** instant matches from the built-in country list (no network call),
    e.g. "kor" → _North Korea, South Korea_. Aliases and codes work too ("uk", "jp").
  - Works with mouse, touch and keyboard (<kbd>↑</kbd>/<kbd>↓</kbd>, <kbd>Enter</kbd>,
    <kbd>Esc</kbd>), and follows the WAI-ARIA combobox pattern for screen readers.
- **Shows everything in the mockup:** temperature, high/low, location, time, humidity
  and condition (plus a description such as "scattered clouds" and a weather icon).
- **Clear** empties both inputs and dismisses any error message.
- **Search history**, newest first, with **search again** and **delete** buttons per
  entry. It is saved in `localStorage`, so it survives a refresh. Shows "No Record"
  when empty.
- **Clear error messages** for: empty search, unknown country, city not found,
  invalid/missing API key, rate limiting, network failure and unexpected responses.
- **Loading state:** spinner in the search button and the weather card. Buttons that
  would start another request are disabled while one is running.
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
│   └── weatherApi.ts          # OpenWeather client: current weather + city suggestions, friendly errors
├── components/
│   ├── SearchForm/            # City + country inputs, Search and Clear buttons
│   ├── WeatherSummary/        # "Today's Weather" card (idle / loading / result)
│   ├── SearchHistory/         # History list + HistoryItem row (search again / delete)
│   ├── ThemeToggle/           # Light/dark switch
│   └── ui/                    # Reusable building blocks: TextField, AutocompleteField, IconButton, Alert, Spinner, Icons
├── hooks/
│   ├── useWeatherSearch.ts    # Validation + API call + loading/error state, cancels stale requests
│   ├── useSearchHistory.ts    # Add (de-duplicated) / remove history entries, persisted
│   ├── useCitySuggestions.ts  # Debounced, cached city suggestions; failures never block searching
│   ├── useDebouncedValue.ts   # Waits for typing to pause before using a value
│   ├── useLocalStorageState.ts# useState that survives refresh, with corrupted-data protection
│   └── useTheme.ts            # Theme state applied to <html data-theme>
├── utils/
│   ├── country.ts             # Country name/alias/code → ISO code, and country search (built-in Intl data)
│   ├── location.ts            # Form input validation and API query building
│   ├── format.ts              # Date/time and temperature formatting
│   └── storage.ts             # Safe localStorage read/write
├── types/weather.ts           # Shared TypeScript types
├── test/                      # Test setup and fixtures
├── App.tsx                    # Page: wires hooks to components
└── index.css                  # Theme tokens (CSS variables) and global styles
```

**Design decisions**

- **State lives in hooks, UI lives in components.** Components receive data and
  callbacks through props, so each one can be reused and tested on its own. `App`
  only connects them.
- **The API layer returns app-shaped data** (`WeatherReport`), so the rest of the
  app never depends on OpenWeather's raw response format. Switching provider means
  changing one file.
- **Theming uses CSS variables only.** Light and dark themes are two blocks of
  tokens in `index.css`. Components use CSS Modules, so their styles are scoped.
- **No extra runtime dependencies.** Only React itself. Country names come from the
  browser's `Intl.DisplayNames`, so no country list needs maintaining.

## Testing

137 tests (Vitest + React Testing Library) across 16 files, 100% line coverage:

- **Unit tests** for utils (country lookup, formatting, validation, storage), the
  API client (all HTTP error codes, network failure, malformed responses, missing
  key, abort, suggestion mapping and de-duplication) and every hook (including
  debounce timing, caching and stale-result handling for suggestions).
- **Component tests** for each component's rendering and buttons, including full
  keyboard and mouse coverage of the autocomplete.
- **Integration tests** (`App.test.tsx`) that drive the whole page like a user:
  search, loading, not found, invalid country, empty input, network error, Clear,
  search again, delete, persistence after refresh, theme switching and picking
  city/country suggestions.

Only `fetch` is mocked, so the tests are fast, deterministic and need no API key.
Any request a test doesn't mock fails as if offline, so no test can reach the
real network.

## Assumptions

1. **City and country are both optional, but at least one is required.**
   - City + country → `q=Tokyo,JP`
   - City only → `q=Tokyo` (OpenWeather picks the best match)
   - Country only → the country's name is sent (e.g. `q=Singapore`), which usually
     returns the capital or main city.
2. **An unknown country is caught before calling the API**, with a hint to use a full
   name or 2-letter code. An unknown city returns the API's 404, shown as "Not found".
3. **Units are metric (°C)**, rounded to whole degrees as in the mockup.
4. **Times are when the user searched**, in the user's local time, formatted
   `DD-MM-YYYY hh:mmam` as in the mockup.
5. **History de-duplicates by location.** Searching the same place again (including
   via "search again") moves it to the top with a new time instead of adding a
   duplicate. History keeps the 20 most recent locations.
6. **Failed searches are not added to history.**
7. **"Search again" also fills the inputs** with that location, so the user can see
   and tweak what was searched.
8. **Clear resets the inputs and any error message** but keeps the last weather
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
    - Picking a city searches immediately, since that is almost always the intent.
      Picking a country only fills the field, because the user usually types a
      city next.
    - If suggestions fail (offline, bad key), the list stays empty and searching
      still works. Any error is shown when the user actually searches.
    - The browser's own autofill is turned off on these two fields so it doesn't
      cover the suggestion list.
