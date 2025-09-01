# Agent Guidelines for GraphChat

## Commands
- **Dev**: `vite dev` | **Build**: `vite build && tsc --noEmit` | **Start**: `vite start`
- **Lint**: `biome check --write` | **Format**: `biome format --write --unsafe`
- **Gen client**: `openapi-ts`
- **Test**: No testing framework configured

## Code Style
- **Imports**: Path aliases `~/` for `./src/`, group by React/third-party/local, prefer named imports
- **TypeScript**: Strict mode, interfaces for objects, types for unions, `const` assertions, `neverthrow` for errors
- **Naming**: PascalCase (components/types), camelCase (functions/vars), kebab-case (component files)
- **React**: Functional components, `@legendapp/state` with `use$()`, destructure props, minimize `useEffect`
- **Error Handling**: try/catch for async, `console.error` logging, user-friendly fallbacks, `neverthrow` Results
- **Styling**: Tailwind CSS, semantic colors, responsive with `lg:`, consistent spacing
- **File Org**: `routes/` (pages), `components/` (UI), `lib/` (logic), `utils/` (helpers), `client/` (API)
- **Formatting**: Space indentation, double quotes, semicolons, trailing commas