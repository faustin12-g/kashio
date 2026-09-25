# Kashio

An offline-first budgeting app for Android and iOS. Every screen works with
no network connection — all data lives in a local SQLite database on the
device — and you can optionally connect your own Google account to back
your data up to a private folder in your Google Drive, and restore it on
another device.

## Features

- **Transactions** — log expenses and income with an amount, category,
  account, date and note. Recent entries can be repeated in one tap, and the
  categories you use most are offered first. Search and filter by text,
  type, category, account, dates and amount.
- **Categories** — a sensible default set, fully editable; add, archive, or
  recolor your own. A category can be created straight from the picker.
- **Budgets** — weekly or monthly limits, overall or per category, with live
  progress, a "you'll run out in N days" forecast, and notifications at
  50 / 70 / 80 / 90 / 100 % of a limit.
- **Home and Insights** — income, spending and balance at a glance; a six
  month trend, comparison with last month, and the biggest changes.
- **Accounts** — Cash, Bank, Mobile money and more, with balances and
  transfers between them.
- **Savings goals** and **Debts** — track progress towards a target, and
  money lent or borrowed with due dates and payments.
- **Recurring items** — rent, salary and subscriptions remind you when they
  are due. Nothing touches your balance until you tap Record.
- **Daily reminder**, **app lock** (fingerprint, face, PIN or pattern),
  **light / dark / phone theme**.
- **Languages** — English, Français and Kinyarwanda.
- **Export** — a CSV spreadsheet or a PDF report to share.
- **Google Drive backup** — one Google sign-in, then "Back up now" /
  "Restore from Drive", or turn on automatic backup (about once a day,
  Wi-Fi only by default). The app only ever touches files it creates itself
  in a "Kashio Backups" folder — never the rest of your Drive.
- **Fully offline** — no account, no network, and no backend server are
  required to use the app day to day. Google sign-in is entirely optional.

## Tech stack

- [Expo](https://expo.dev) (React Native + TypeScript), SDK 57
- [Expo Router](https://docs.expo.dev/router/introduction/) for navigation
- [expo-sqlite](https://docs.expo.dev/versions/latest/sdk/sqlite/) for local
  storage, with a hand-rolled versioned migration runner
- [`@react-native-google-signin/google-signin`](https://react-native-google-signin.github.io/docs/original)
  for Google auth (native SDK — real refresh/session persistence, not a
  hand-rolled OAuth flow)
- The Google Drive v3 REST API directly (`fetch`), scoped to `drive.file`
- [Zustand](https://github.com/pmndrs/zustand) for app state
- [date-fns](https://date-fns.org/) for date math
- `react-native-svg` for the dashboard's donut chart (no charting library
  dependency)
- Jest (`jest-expo` preset) for tests, ESLint (`eslint-config-expo`) for
  linting

## Project structure

```
src/
  app/                  Expo Router screens (file-based routing)
    (tabs)/              Home, Transactions, Budgets, Settings — the tab bar
    transactions/        new.tsx, [id].tsx — pushed as modals over the tabs
    budgets/             new.tsx — same pattern
    categories/           category management, reached from Settings
  components/           Presentational React components
  constants/             theme (light/dark tokens), currency list
  db/                    SQLite client, migrations, first-run seed data
  models/                 shared TypeScript domain types
  repositories/           typed CRUD over SQLite, one file per table
  services/               Google auth, Google Drive REST calls, backup
                          orchestration, the sync merge algorithm, budget
                          progress calculation
  store/                  Zustand stores — thin wrappers around the
                          repositories/services above, with loading state
  utils/                  money (parsing/formatting), date, id generation
__tests__/                unit tests for the pure logic (see "Testing")
```

The architecture deliberately separates **repositories** (raw SQLite access,
typed) from **services** (business logic that composes repositories, e.g.
budget progress or the Drive backup flow) from **stores** (the React-facing
layer, holding loading/error state). Screens call stores; stores call
services/repositories; nothing reaches into SQLite directly from a screen.

## Prerequisites

- Node.js 20+ and npm
- [Watchman](https://facebook.github.io/watchman/) (recommended, not
  required)
- **Android**: Android Studio with an emulator, or a physical device with
  USB debugging enabled
- **iOS**: a Mac with Xcode, or a physical device (iOS development requires
  macOS — see [Expo's docs](https://docs.expo.dev/workflow/ios-simulator/))

This project uses a native module (`@react-native-google-signin`), so it
**cannot run in Expo Go**. You need a development build — the commands
below handle that.

## Getting started

```bash
npm install
```

`.npmrc` in this repo sets `legacy-peer-deps=true`. That's not a workaround
for anything broken in this project — `expo-router`'s optional web support
pulls in a `react-dom` peer that npm's strict resolver can't reconcile with
the pinned React Native version, even though it's irrelevant to native
Android/iOS builds. This just tells npm not to treat that as fatal.

### 1. Set up your Google Cloud project (for Drive backup)

You can skip this section entirely and use the app fully offline — the
"Connect Google Drive" button in Settings will just show a clear error
telling you it isn't configured yet. Come back to this whenever you want
backup working.

1. Go to the [Google Cloud Console](https://console.cloud.google.com/) and
   create a new project (or pick an existing one).
2. **Enable the Google Drive API**: APIs & Services → Library → search
   "Google Drive API" → Enable.
3. **Configure the OAuth consent screen**: APIs & Services → OAuth consent
   screen.
   - User type: **External**.
   - Fill in the app name (e.g. "Kashio"), your email, etc.
   - Scopes: add `.../auth/drive.file`.
   - Test users: add your own Google account's email. While the app is in
     "Testing" mode (the default, and totally fine for personal use — no
     Google review needed), only accounts you list here can sign in.
4. **Create three OAuth client IDs** (APIs & Services → Credentials →
   Create Credentials → OAuth client ID):
   - **Web application** — no redirect URIs needed. Copy its **Client ID**;
     this is your `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`. (Yes, the *Web* one —
     `@react-native-google-signin` uses this at runtime on both platforms
     to verify the ID token; this is Google's documented setup, not a
     mistake.)
   - **Android** — Package name: `com.kashio.app`. SHA-1 certificate
     fingerprint: get yours by running `eas credentials` (if you're using
     EAS Build) or, for a local debug build,
     `keytool -list -v -keystore android/app/debug.keystore -alias androiddebugkey -storepass android -keypass android`
     (the keystore the debug build is actually signed with, generated by
     `expo prebuild`) and copy the `SHA1:` value.
   - **iOS** — Bundle ID: `com.kashio.app`. Copy its **Client ID**, then
     reverse it: `123456789012-abc...xyz.apps.googleusercontent.com`
     becomes `com.googleusercontent.apps.123456789012-abc...xyz`. That
     reversed value is your `EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME`. (Only
     needed if you're building for iOS.)
5. Copy `.env.example` to `.env` and fill in the two `EXPO_PUBLIC_*` values
   from above.

None of these three client IDs are secrets — they identify the app, not
authenticate a secret — but they're specific to your Google Cloud project,
which is why they live in a gitignored `.env` rather than being hardcoded.

### 2. Run it

```bash
# Android (emulator or a device with USB debugging)
npm run android

# iOS (macOS only)
npm run ios
```

The first run does a full native build (`expo prebuild` under the hood),
which takes a few minutes. After that, `npm start` alone is enough for
day-to-day development — it starts the Metro bundler and reuses the
existing native build.

If you change `app.config.ts` or add a package with native code, re-run
`npm run android` / `npm run ios` (or `npm run prebuild` then the platform
run command) so the native project picks up the change.

## Data model & sync design

Money is stored everywhere as an integer number of minor units (cents) —
never a float — specifically to avoid the classic `1.005 * 100 =
100.49999999999999` rounding bug; see the comment and test in
`src/utils/money.ts` for the concrete example. User input is parsed as a
fixed-point string, not `Number(input) * 100`.

Every table has a `created_at`/`updated_at` (epoch ms), and transactions and
budgets additionally have a soft-delete `deleted_at` tombstone rather than a
real `DELETE`, so a deletion can propagate through a backup/restore the same
way an edit does.

**Backup** writes your whole local database as one JSON file to a "Kashio
Backups" folder in your Drive (creating both on first use), overwriting the
previous version in place — Drive's own version history covers you if you
ever need an older copy.

**Restore** downloads that file and merges it into the local database
record-by-record using **last-write-wins**: whichever side (local vs. the
backup) has the newer `updated_at` wins outright for that record. This is
intentionally simple — built for "one person, a couple of devices, synced
occasionally" — not real-time multi-device editing. See the doc comment in
`src/services/merge.ts` for the exact rule and its one honest limitation
(no field-level merge: if you edit the same transaction differently on two
devices between backups, the older edit is discarded, not merged). Back up
before you switch devices and you won't hit this in practice.

## Testing

```bash
npm test
```

Tests focus on the pure, high-risk logic rather than trying to mock SQLite
or the native Google Sign-In module end to end:

- `__tests__/utils/money.test.ts` — the fixed-point amount parser,
  including the float-rounding regression test above
- `__tests__/utils/date.test.ts` — budget period boundaries (weekly/monthly,
  including a leap-year February and month-end overflow)
- `__tests__/services/merge.test.ts` — every branch of the last-write-wins
  sync algorithm

The repository/service layer that talks to SQLite and the Drive API is
exercised by actually running the app (`npm run android`/`ios`) rather than
integration tests, since `expo-sqlite` and the native Google Sign-In module
both require a real native runtime.

```bash
npm run typecheck   # tsc --noEmit
npm run lint         # expo lint (eslint-config-expo)
npm run doctor       # expo-doctor — flags SDK/version drift
```

CI (`.github/workflows/ci.yml`) runs typecheck, lint, and tests on every
push and pull request against `main`.

## Building for production

This project is set up for [EAS Build](https://docs.expo.dev/build/introduction/):

```bash
npx eas-cli@latest build --platform android
npx eas-cli@latest build --platform ios
```

You'll need an [Expo account](https://expo.dev/signup) and to run
`npx eas-cli@latest build:configure` once to generate an `eas.json`. Remember
to add the **release** keystore's SHA-1 (shown by `eas credentials`) as an
additional Android OAuth client in Google Cloud once you have one, or Drive
sign-in will work in development but not in your production build.

## Known limitations / good next additions

- Reading mobile-money SMS messages to log transactions automatically is
  planned for a later version (it needs sensitive permissions that Google
  Play restricts).
- Changing the currency relabels amounts; it does not convert them.
- The Kinyarwanda translation should be reviewed by a native speaker.
- Automatic backup relies on Android's background scheduler, so the exact
  time is up to the phone; the app also catches up whenever it is opened.

## License

No license file is included — this is set up as your own private project.
Add a `LICENSE` file yourself if and when you decide how you want to share
or publish it.
