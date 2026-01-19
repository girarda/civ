# OpenCiv

A Civilization-style 4X strategy game built with TypeScript, PixiJS, and bitECS.

## Getting Started

```bash
# Clone the repository
git clone <repo-url>
cd civ

# Run setup (installs dependencies and configures git hooks)
./scripts/setup.sh
```

Or manually:

```bash
npm install
git config core.hooksPath .githooks
```

## Development

```bash
npm run dev       # Start development server
npm run build     # Build for production
npm run preview   # Preview production build
```

## Testing

```bash
npm run test      # Run unit tests
npm run test:e2e  # Run Playwright e2e tests
npm run lint      # Run ESLint
npm run format    # Format with Prettier
```

## Git Hooks

Pre-commit hooks run automatically:
- Linter (`npm run lint`)
- Unit tests (`npm run test`)

Hooks are stored in `.githooks/` and configured via `git config core.hooksPath .githooks`.
