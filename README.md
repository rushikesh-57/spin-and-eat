# Spin & Eat

A responsive web app that helps you decide what to eat using a spinning wheel. Built with React (Vite), TypeScript, and SVG.

## Features

- **Spinning wheel** — Food options displayed on a colorful SVG wheel with smooth spin animation
- **Random selection** — One option is randomly selected when the wheel stops
- **Categories** — Veg, Non-Veg, Healthy, Cheat Meal; filter which categories appear on the wheel
- **Manage items** — Add, edit, and remove food items with category
- **Result display** — Selected food shown clearly with animation; optional sound on spin complete
- **Spin history** — Last 5 spins saved and shown (persisted in local storage)
- **Feeling Lucky** — Option to auto-spin the wheel when the app loads
- **Accessibility** — Keyboard navigation and screen-reader friendly (ARIA labels, focus management)
- **Mobile-first** — Responsive layout and touch-friendly controls

## Tech Stack

- **React 19** + **TypeScript**
- **Vite 7** (build tool)
- **SVG** for the wheel (no Canvas)
- **CSS Modules** for component styles
- **Local storage** for preferences and history

## Project Structure

```
src/
├── components/
│   ├── CategoryFilter/   # Veg / Non-Veg / Healthy / Cheat Meal toggles
│   ├── FoodManager/      # Add, edit, remove food items
│   ├── FoodWheel/        # SVG wheel + pointer
│   ├── ResultDisplay/    # Selected food + animation
│   ├── SpinButton/       # "Spin Now 🍽️"
│   └── SpinHistory/      # Last 5 spins
├── data/
│   └── sampleFoods.ts    # Default food list
├── hooks/
│   ├── useFeelingLucky.ts
│   ├── useFoodItems.ts   # Items + category filter + CRUD
│   ├── useSpinHistory.ts
│   └── useWheelSpin.ts   # Rotation state + spin logic
├── types/
│   └── index.ts          # FoodItem, FoodCategory, etc.
├── utils/
│   ├── id.ts
│   ├── sound.ts          # Optional spin-complete sound (Web Audio)
│   ├── storage.ts        # Local storage helpers
│   └── wheelColors.ts
├── App.tsx
├── App.module.css
├── index.css             # Global variables + reset
└── main.tsx
```

## Setup

### Prerequisites

- **Node.js** 18+ (recommend 20+)
- **npm** or **yarn** or **pnpm**

### Install and run

```bash
# Clone or open the project
cd spin-and-eat

# Install dependencies
npm install

# Start dev server (with HMR)
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) (or the URL shown in the terminal).

### Build for production

```bash
npm run build
```

Output is in `dist/`. Preview the build locally:

```bash
npm run preview
```

### Lint

```bash
npm run lint
```

## Usage

1. **Spin** — Click “Spin Now 🍽️” (or focus and press Enter/Space) to spin the wheel. The wheel spins for about 4 seconds and stops on a random food.
2. **Filter** — Use the category chips (Veg, Non-Veg, Healthy, Cheat Meal) to include or exclude categories on the wheel.
3. **Manage items** — Expand “Manage food items” to add new foods (with category), edit names/categories, or remove items. “Reset to sample list” restores the default list.
4. **Feeling Lucky** — Enable “Feeling Lucky (auto-spin on load)” to spin automatically when you open the app.
5. **History** — “Last 5 spins” shows recent results; “Clear” removes the history.

## Sample Data

The app ships with 10 sample foods across categories: Pizza, Dosa, Burger, Salad, Biryani, Pasta, Grilled Chicken, Smoothie Bowl, Tacos, Dal Rice. You can change or reset this via “Manage food items.”

## Browser Support

Modern browsers with ES modules and SVG support (Chrome, Firefox, Safari, Edge). Local storage and Web Audio API are used but the app degrades if they are unavailable.

## License

MIT (or your preferred license).
