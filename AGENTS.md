# Agent Guidelines for WorldCrafter

## ⚠️ CRITICAL WARNING
**DO NOT RUN THE DEV SERVER!** `bun dev` is a watch command that never terminates. The dev server is always running - starting it will cause you to wait indefinitely.

## Commands
Use bun for all commands.
- **Build**: `bun run build` | **Start**: `bun run start`
- **Lint**: `bun run lint` | **Format**: `bun run format`

## Architecture
- **State**: `@legendapp/state` for persistent/shared state, `useState` only for ephemeral UI state
- **LLM Integration**: SSE streaming, configurable model parameters, real-time slots monitoring
- **Error Handling**: `neverthrow` for functional errors, try/catch for async operations

## Code Style
- **Imports**: Path aliases `~/` for `./src/`, group by React/third-party/local, prefer named imports
- **TypeScript**: Strict mode, interfaces for objects, types for unions, `const` assertions, `neverthrow` for errors
- **Naming**: PascalCase (components/types), camelCase (functions/vars), kebab-case (component files)
- **React**: Functional components, `@legendapp/state` with `use$()`, destructure props, minimize `useEffect`
- **Error Handling**: try/catch for async, `console.error` logging, user-friendly fallbacks, `neverthrow` Results
- **Styling**: Tailwind CSS, semantic colors, responsive with `lg:`, consistent spacing
- **File Org**: `routes/` (pages), `components/` (UI), `lib/` (logic), `utils/` (helpers), `client/` (API)
- **Formatting**: Space indentation, double quotes, semicolons, trailing commas