# EV Battery Calculator PWA — Technical PRD

**Product Name:** EV Battery Calculator  
**Platform:** Progressive Web App (PWA) — Mobile Client Only  
**Tech Stack:** Astro + Preact + shadcn + Clean Architecture  
**Status:** In Development

---

## 1. Overview

### Purpose
A lightweight, offline-first mobile web application for calculating EV battery metrics in real-time. Users input current battery state and efficiency, and receive instant calculations for remaining range, charge needed, and battery capacity metrics.

**Note:** This is a **client-only app** — all data stays on your device (localStorage). No accounts, no sync, no backend. Data is private and works 100% offline.

### Key Features
- Real-time calculation of EV battery metrics
- Offline-first functionality (works without internet)
- Persistent data storage (localStorage only)
- Mobile-optimized UI
- Installable as native-like app
- No backend or account required

### Target Users
- EV owners
- Software developers interested in PWA architecture
- Anyone needing quick EV battery calculations

---

## 2. Functional Requirements

### 2.1 User Inputs

| Input | Type | Default | Validation | Required |
|-------|------|---------|-----------|----------|
| EV Car Model | Dropdown + text | — | Must select or enter | Yes |
| Total Battery Capacity | Number (kWh) | From model lookup | 10–200 kWh | Yes (auto-filled if model selected) |
| Current Battery % | Slider / Number | 50 | 0–100, integer | Yes |
| Target Battery % | Slider / Number | 100 | 0–100, integer | No |
| Minimum Battery % | Slider / Number | 0 | 0–100, integer | No |
| Efficiency (kWh/100km) | Number | — | 5–30, optional | No |

### 2.2 Calculations & Outputs

**Output 1: Current kWh**
```
currentKWh = (currentBattery / 100) × totalCapacity
```
- Rounded to 1 decimal place
- Display: "Current battery: X.X kWh"

**Output 2: Needed kWh to Target**
```
neededKWh = ((targetBattery - currentBattery) / 100) × totalCapacity
```
- Can be negative (discharging to target)
- Rounded to 1 decimal place
- Display: "To reach target: ±X.X kWh"

**Output 3: Current Range to Minimum**
```
rangeKm = ((currentBattery - minBattery) / 100) × totalCapacity / efficiency
```
- Only calculated if efficiency provided
- Rounded to nearest integer
- Display: "Range to minimum: X km"
- Shows "N/A" if efficiency not provided

### 2.3 Data Persistence
- **Storage:** browser `localStorage`
- **Keys:** `ev_calculator_state` (JSON)
- **Data persisted:**
  - Last selected car model
  - Last entered capacity (if manual)
  - Last battery percentages (current, target, min)
  - Last efficiency value
- **Expiration:** Never (until user clears app data)
- **Fallback:** Hard-coded defaults if storage unavailable

### 2.4 EV Model Database

**User Registration**

No hardcoded models. Users must register their car manually:

1. **Car Registration Form**
   - Model: required (string, e.g., "Tesla Model 3")
   - Name: optional (string, e.g., "My daily driver")
   - Capacity: required (decimal, kWh, e.g., 82.5)
   - All cars stored in localStorage

2. **Car Management**
   - Display list of registered cars
   - Switch between cars via dropdown
   - Edit car details (model, name, capacity)
   - Delete cars with confirmation
   - Display using coalesce: `{name || model}`

3. **Data Structure**
   ```json
   {
     "id": "car-1",
     "model": "Tesla Model 3",
     "name": "Daily driver",
     "capacity": 82.5,
     "createdAt": 1696118400000
   }
   ```

## 3. Technical Architecture

### 3.1 Clean Architecture Layers

```
src/
├── domain/                    # Business logic (pure, framework-agnostic)
│   ├── entities/
│   │   └── BatteryState.ts   # DTO for battery data
│   ├── use-cases/
│   │   ├── CalculateCurrentKWh.ts
│   │   ├── CalculateNeededKWh.ts
│   │   └── CalculateRange.ts
│   └── repositories/
│       └── ICarModelRepository.ts  # Interface
│
├── application/               # Application services (orchestration)
│   ├── services/
│   │   ├── BatteryCalculationService.ts
│   │   ├── PersistenceService.ts
│   │   └── CarModelService.ts
│   └── dto/
│       └── CalculationResult.ts
│
├── infrastructure/            # Framework-specific (Astro, Preact, storage)
│   ├── repositories/
│   │   └── CarModelRepository.ts  # Implementation
│   ├── storage/
│   │   └── LocalStorageAdapter.ts
│   └── config/
│       └── models.ts         # EV model database
│
├── presentation/              # UI Components (Preact)
│   ├── components/
│   │   ├── BatteryCalculator.tsx
│   │   ├── InputSection.tsx
│   │   ├── OutputSection.tsx
│   │   ├── ModelSelector.tsx
│   │   └── common/
│   │       ├── Button.tsx
│   │       ├── Input.tsx
│   │       ├── Slider.tsx
│   │       └── Card.tsx
│   ├── hooks/
│   │   ├── useCalculator.ts  # Custom hook wrapping use-cases
│   │   └── useLocalStorage.ts
│   └── pages/
│       └── index.astro       # Astro layout
│
└── lib/
    └── utils.ts             # Shared utilities (validation, formatting)
```

### 3.2 Data Flow

```
User Input (Preact Component)
    ↓
useCalculator Hook
    ↓
Application Service (BatteryCalculationService)
    ↓
Domain Use Cases (CalculateCurrentKWh, etc.)
    ↓
Pure Functions (math calculations)
    ↓
Result DTO
    ↓
Preact State Update → UI Render
    ↓
PersistenceService saves to localStorage
```

### 3.3 Technology Stack Details

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Build** | Astro v4+ | Static site generation + PWA support |
| **UI Framework** | Preact (via Astro island) | Lightweight interactivity |
| **Components** | shadcn/ui (Preact) | Pre-built, accessible UI components |
| **Styling** | Tailwind CSS | Utility-first, responsive design |
| **State** | Preact Hooks (useState) | Simple state management |
| **Storage** | localStorage + JSON | Persist user state |
| **PWA** | Astro PWA plugin + Service Worker | Offline support, installable |
| **Testing** | Vitest + Preact Testing Library | Unit & component tests |
| **Linting** | ESLint + Prettier | Code quality |

---

## 4. PWA Implementation

### 4.1 Service Worker Strategy

**Caching Strategy:** Cache-first with network fallback

```javascript
// sw.js (handled by astro-pwa)
- Cache HTML, CSS, JS on first load
- Cache EV model database (static JSON)
- Offline: Serve cached assets, app works 100%
```

**Files to cache:**
- `index.html`
- `app.js` (Preact bundle ~15KB)
- `styles.css`
- `manifest.json`

### 4.2 Manifest Configuration

```json
{
  "name": "EV Battery Calculator",
  "short_name": "EV Calc",
  "description": "Calculate EV battery metrics offline",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait-primary",
  "theme_color": "#000000",
  "background_color": "#ffffff",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### 4.3 Offline Capabilities

- **All calculations offline:** Yes (no API calls)
- **Persistent state offline:** Yes (localStorage)
- **UI fully functional offline:** Yes
- **Sync capabilities:** None needed (no backend)

---

## 5. UI/UX Design

### 5.1 Layout Structure

**Mobile-first, single-column layout:**

```
┌─────────────────────────────┐
│ EV Battery Calculator       │
├─────────────────────────────┤
│                             │
│ [Car Model Selector]        │
│                             │
│ [Capacity Input]            │
│                             │
│ ─── Inputs ───              │
│ Current: [Slider 0-100]     │
│ Target:  [Slider 0-100]     │
│ Minimum: [Slider 0-100]     │
│                             │
│ Efficiency (opt): [Input]   │
│                             │
│ ─── Outputs ───             │
│ Current kWh:    X.X kWh ▶   │
│ Needed kWh:     ±X.X kWh ▶  │
│ Range to min:   X km ▶      │
│                             │
│ [Reset Button]              │
│                             │
└─────────────────────────────┘
```

### 5.2 shadcn Components Used

- **Card** — Output sections
- **Input** — Capacity, efficiency fields
- **Slider** — Battery percentage controls
- **Button** — Reset, calculate actions
- **Select** — Car model dropdown
- **Label** — Input labels
- **Badge** — Status indicators (e.g., "Low battery")

### 5.3 Responsive Design

- **Base:** 375px–480px (mobile)
- **Padding:** 1rem sides, 1.5rem top/bottom
- **Font:** 16px base (readable without zoom)
- **Touch targets:** 44px minimum (WCAG)
- **Orientation:** Portrait primary (landscape supported)

### 5.4 Accessibility

- ARIA labels on all inputs
- Semantic HTML structure
- Color contrast ≥ 4.5:1 (WCAG AA)
- Keyboard navigation support
- Screen reader friendly (shadcn/ui built-in)

---

## 6. Development Workflow

### 6.1 Project Setup

```bash
npm create astro@latest -- --template minimal
cd ev-calculator

npm install preact
npm install -D @astrojs/preact
npm install -D tailwindcss postcss autoprefixer
npm install -D astro-pwa
npm install -D vitest @testing-library/preact
npm install shadcn-ui

# Copy shadcn components
npx shadcn-ui@latest add card input slider button select label badge
```

### 6.2 Folder Structure (Day 1)

```
ev-calculator/
├── src/
│   ├── domain/
│   │   ├── entities/BatteryState.ts
│   │   ├── use-cases/
│   │   │   ├── CalculateCurrentKWh.ts
│   │   │   ├── CalculateNeededKWh.ts
│   │   │   └── CalculateRange.ts
│   │   └── repositories/ICarModelRepository.ts
│   │
│   ├── application/
│   │   ├── services/
│   │   │   ├── BatteryCalculationService.ts
│   │   │   ├── PersistenceService.ts
│   │   │   └── CarModelService.ts
│   │   └── dto/CalculationResult.ts
│   │
│   ├── infrastructure/
│   │   ├── repositories/CarModelRepository.ts
│   │   ├── storage/LocalStorageAdapter.ts
│   │   └── config/models.ts
│   │
│   ├── presentation/
│   │   ├── components/
│   │   │   ├── BatteryCalculator.tsx
│   │   │   ├── InputSection.tsx
│   │   │   ├── OutputSection.tsx
│   │   │   ├── ModelSelector.tsx
│   │   │   └── common/ (shadcn wrapped)
│   │   ├── hooks/
│   │   │   ├── useCalculator.ts
│   │   │   └── useLocalStorage.ts
│   │   └── pages/
│   │       └── index.astro
│   │
│   ├── lib/utils.ts
│   ├── layouts/Layout.astro
│   └── styles/globals.css
│
├── public/
│   ├── icon-192.png
│   ├── icon-512.png
│   └── robots.txt
│
├── astro.config.mjs
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

### 6.3 Development Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Build for production
npm run preview      # Preview production build locally
npm run test         # Run unit tests
npm run lint         # Lint code
npm run format       # Format with Prettier
```

### 6.4 Deployment (GitHub Pages)

```bash
# 1. Update astro.config.mjs
export default defineConfig({
  site: 'https://your-username.github.io',
  base: '/ev-calculator', // if using repo name
});

# 2. Build
npm run build

# 3. Deploy to gh-pages branch (or use GitHub Actions)
npm run deploy
```

---

## 7. Testing Strategy

### 7.1 Unit Tests (Domain Layer)

**Framework:** Vitest + @testing-library/preact

**Domain logic tests:**

```typescript
// src/domain/use-cases/__tests__/CalculateCurrentKWh.test.ts
import { calculateCurrentKWh } from '../CalculateCurrentKWh';

describe('CalculateCurrentKWh', () => {
  it('should calculate current kWh correctly', () => {
    const result = calculateCurrentKWh({ currentBattery: 50, totalCapacity: 82 });
    expect(result).toBe(41.0);
  });

  it('should handle edge case: 0%', () => {
    const result = calculateCurrentKWh({ currentBattery: 0, totalCapacity: 82 });
    expect(result).toBe(0);
  });

  it('should handle edge case: 100%', () => {
    const result = calculateCurrentKWh({ currentBattery: 100, totalCapacity: 82 });
    expect(result).toBe(82);
  });
});
```

**Charge estimator tests (Phase 3):**

```typescript
// src/domain/use-cases/__tests__/ChargeEstimator.test.ts
import { estimateChargeNeeded } from '../ChargeEstimator';

describe('ChargeEstimator', () => {
  it('should calculate charge needed to reach charger', () => {
    const result = estimateChargeNeeded({
      currentBattery: 20,
      distanceToCharger: 10,
      efficiency: 17,
      capacity: 82,
      targetBuffer: 5
    });
    expect(result.chargeToPercentage).toBe(32); // charge from 20% to 32%
    expect(result.batteryAtCharger).toBe(5);
  });

  it('should detect unreachable charger', () => {
    const result = estimateChargeNeeded({
      currentBattery: 10,
      distanceToCharger: 500,
      efficiency: 17,
      capacity: 82,
      targetBuffer: 5
    });
    expect(result.isReachable).toBe(false);
    expect(result.message).toContain('Too far away');
  });
});
```

### 7.2 Component Tests (Presentation Layer)

```typescript
// src/presentation/components/__tests__/BatteryCalculator.test.tsx
import { render, screen, fireEvent } from '@testing-library/preact';
import BatteryCalculator from '../BatteryCalculator';

describe('BatteryCalculator', () => {
  it('should render input section', () => {
    render(<BatteryCalculator />);
    expect(screen.getByText(/EV Battery Calculator/i)).toBeInTheDocument();
  });

  it('should update output when input changes', () => {
    render(<BatteryCalculator />);
    const slider = screen.getByRole('slider', { name: /current battery/i });
    fireEvent.change(slider, { target: { value: '75' } });
    expect(screen.getByText(/current battery: 61.5 kwh/i)).toBeInTheDocument();
  });
});
```

**Coverage target:** 80%+ (domain layer critical)

---

## 8. Error Handling & Validation

### 8.1 Input Validation

| Field | Rules |
|-------|-------|
| Battery % | 0–100, integer, required |
| Capacity | 10–200, decimal, required |
| Efficiency | 5–30, decimal, optional |

**Error messages (inline, beneath field):**
- "Must be between 0 and 100"
- "Must be a valid number"
- "Capacity is required"

### 8.2 Edge Cases

| Case | Behavior |
|------|----------|
| Target < Current | Shows negative "needed kWh" (discharging) |
| Efficiency = 0 | Shows "N/A" for range (divide-by-zero guard) |
| localStorage unavailable | Falls back to session state, shows warning toast |
| Service Worker offline | App loads from cache, works 100% offline |

### 8.3 Graceful Degradation

- No internet? App works (all local)
- Storage unavailable? Use in-memory state
- Old browser without SW? Still works as regular site (no offline, no install)

---

## 9. Performance Targets

| Metric | Target |
|--------|--------|
| First Contentful Paint (FCP) | < 1.5s |
| Largest Contentful Paint (LCP) | < 2.5s |
| Cumulative Layout Shift (CLS) | < 0.1 |
| Time to Interactive (TTI) | < 3s |
| Bundle size (JS) | < 20KB (gzipped) |
| Bundle size (CSS) | < 10KB (gzipped) |

**Optimization strategies:**
- Preact (4KB vs React 42KB)
- Astro static generation
- Lazy-load shadcn components only if used
- Minify & gzip for production
- Service Worker caching

---

## 10. Roadmap & Future Enhancements

### Phase 1 (MVP) — Current
- ✅ Car model selector (user manually fills)
- ✅ Battery percentage inputs
- ✅ Real-time calculations (current kWh, needed kWh, range)
- ✅ Persistent storage (localStorage)
- ✅ Offline functionality (100% offline-first)
- ✅ PWA installation
- ✅ Mobile-optimized UI
- ✅ Car management (add, edit, delete)

### Phase 2 (Post-MVP)
- [ ] Multi-language support (i18n)
- [ ] Dark mode

### Phase 3 (Advanced)
- [ ] **Charge estimator:** Calculate charge needed AT charger location
  - **Scenario:** You're on the road with current battery %, charger is X km away. Calculate how much to charge AT that charger.
  - **Inputs:**
    - Distance to charger (km)
    - Current battery % (where you are now)
  - **Calculation:**
    ```
    kWh_used_for_trip = (distance_km / 100) × efficiency
    battery_at_charger_% = current_battery_% - ((kWh_used_for_trip / capacity) × 100)
    battery_at_charger_kWh = (battery_at_charger_% / 100) × capacity
    
    if battery_at_charger_% < 0:
      output = "⚠️ Too far away"
    else:
      kWh_to_charge_at_charger = capacity - battery_at_charger_kWh
      output = "You must charge {kWh_to_charge_at_charger} kWh (from {battery_at_charger_%}% to 100%)"
    ```
  - **Outputs:**
    - "You must charge X kWh (from Y% to 100%)"
    - "⚠️ Too far away"
  - **Example:**
    - Current: 20% (16.4 kWh on 82 kWh)
    - Distance: 10 km
    - Efficiency: 17 kWh/100km
    - Used: 1.7 kWh → 14.7 kWh left (18% at charger)
    - Output: "You must charge 67.3 kWh (from 18% to 100%)"

- [ ] **Price calculator:** User inputs electricity rate (€/kWh) → calculates charge cost
  - Input: rate per kWh, target kWh to charge
  - Calculation: neededKWh × ratePerKWh
  - Output: "Charging to target: €X.XX"

- [ ] **Unit conversion:** switch distance display between kilometres and miles
  - **Toggle:** `km ⇄ mi`, persisted with the calculator state (default `km`)
  - **Scope:** the efficiency input unit flips with it — `kWh/100km` ↔ `kWh/100mi` — so the input and the range output never disagree. Validation bounds convert with it (5–30 kWh/100km → 8.0–48.3 kWh/100mi), as do the preset chips.
  - **Conversion:** `1 mi = 1.609344 km`; range is rounded whole in the target unit.
  - **Calculation:**
    ```
    mi = km / 1.609344
    km = mi × 1.609344
    ```
  - **Example:** 169 km → 105 mi; efficiency 17 kWh/100km → 10.6 kWh/100mi
  - **Note:** battery capacity stays in kWh — it is energy, not distance, so no conversion applies.

---

## 11. Security & Privacy

### 11.1 Data Handling
- **User data:** Stored locally only (no server)
- **No analytics:** User privacy respected
- **No tracking:** No external scripts
- **HTTPS required:** For PWA installation

### 11.2 Content Security Policy

```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; script-src 'self' 'wasm-unsafe-eval';">
```

### 11.3 Manifest Security

- `display: standalone` (hides browser chrome)
- `scope: /` (restricts navigation scope)

---

## 12. Definition of Done

### Code
- [x] All domain logic in pure functions (no framework deps)
- [x] Services layer orchestrates cleanly
- [x] UI components consume via hooks
- [x] No business logic in components
- [x] 80%+ test coverage (domain layer)
- [ ] No console errors/warnings
- [x] ESLint & Prettier passing

### Features
- [x] All calculations correct (manual verification)
- [x] Inputs validate on change
- [x] Outputs update real-time
- [x] localStorage persists & recovers
- [ ] Works offline (tested in DevTools)

### PWA
- [x] manifest.json valid
- [ ] Service Worker installed & caches files
- [ ] "Install" prompt appears on mobile
- [ ] App icon appears on home screen
- [ ] Works standalone (no browser chrome)

### Performance
- [x] Bundle < 20KB JS (gzipped)
- [ ] LCP < 2.5s on slow 4G
- [ ] Lighthouse PWA score 90+

### Deployment
- [x] Build passes with no warnings
- [ ] GitHub Pages deployment works
- [ ] App accessible at public URL
- [ ] Works on iOS Safari (mobile)
- [ ] Works on Android Chrome (mobile)

---

## 13. File Size Budget

| Asset | Target | Notes |
|-------|--------|-------|
| Preact JS | 4KB | Core library |
| App JS | 10KB | Calculator logic + components |
| shadcn CSS | 5KB | Tree-shaked components |
| App CSS | 5KB | Custom styles |
| Images (icons) | 20KB | 192x + 512x PNG |
| **Total** | **~45KB** | Gzipped, cached after first load |

---

## 14. Deployment

### GitHub Actions Workflow

**File:** `.github/workflows/deploy.yml`

Automatic deployment on push to `main`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test  # Run unit tests
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

**Branch strategy:**
- Push to `main` → tests run → builds → deploys to GitHub Pages automatically
- No manual versioning or branching required

---

## 15. Documentation

### README
- Installation steps
- Local development
- Deployment to GitHub Pages
- Architecture overview
- Contributing guide

### Code Comments
- Domain layer: Why (business logic)
- Application layer: What (orchestration)
- Infrastructure layer: How (technical details)
- Presentation layer: Minimal (component intent only)

### TypeScript
- All types defined
- No `any` types
- Strict mode enabled

---

## Appendix A: Example Calculations

### Scenario: Tesla Model 3 with 82 kWh battery

**Input:**
- Current: 45%
- Target: 90%
- Minimum: 10%
- Efficiency: 17 kWh/100km

**Calculations:**
```
Current kWh = (45 / 100) × 82 = 36.9 kWh
Needed kWh = ((90 - 45) / 100) × 82 = 36.9 kWh (to charge 45%)
Range to min = ((45 - 10) / 100) × 82 / 17 = 205 km
```

**Output:**
```
Current battery: 36.9 kWh
To reach 90%: +36.9 kWh
Range to 10%: 205 km
```

---

## Appendix B: Browser Support

| Browser | Version | Support |
|---------|---------|---------|
| Chrome / Edge | 90+ | ✅ Full |
| Firefox | 88+ | ✅ Full |
| Safari | 15+ | ✅ Full |
| Chrome Mobile | 90+ | ✅ Full |
| Safari iOS | 15+ | ✅ Full (PWA installable) |
| Samsung Internet | 14+ | ✅ Full |

---

## Appendix C: Accessibility Checklist

- [ ] WCAG 2.1 Level AA compliance
- [ ] Semantic HTML (headings, labels, form elements)
- [ ] ARIA labels on all interactive elements
- [ ] Color contrast ≥ 4.5:1 on text
- [ ] Keyboard navigation (Tab, Enter, Space)
- [ ] Focus indicators visible
- [ ] Screen reader tested (NVDA / JAWS / VoiceOver)
- [ ] Tested with mobile screen readers (TalkBack, VoiceOver)
- [ ] Touch targets ≥ 44x44px

---

**Document Version:** 1.0  
**Last Updated:** 2026-10-01  
**Status:** Approved for Development
