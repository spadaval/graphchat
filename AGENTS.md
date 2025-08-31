# Agent Guidelines for GraphChat

## Build & Development Commands
- **Development server**: `vite dev`
- **Build**: `vite build && tsc --noEmit`
- **Production start**: `vite start`
- **Generate API client**: `openapi-ts`
- **Lint & format**: `npx biome check --write --unsafe` (if available)

## Code Style Guidelines

### Imports & Modules
- Use path aliases: `~/` for `./src/` (configured in tsconfig.json)
- Group imports: React/React DOM, third-party libraries, local modules
- Use named imports over default imports where possible

### TypeScript
- Strict mode enabled - all types must be explicitly defined
- Use interfaces for object shapes, types for unions/primitives
- Prefer `const` assertions for literal types
- Use `neverthrow` for error handling patterns

### Naming Conventions
- **Components**: PascalCase (e.g., `ChatThread`, `MessageList`)
- **Functions/Variables**: camelCase (e.g., `createNewThread`, `currentMessage`)
- **Types/Interfaces**: PascalCase (e.g., `ChatMessage`, `LLMResponse`)
- **Files**: kebab-case for components, camelCase for utilities

### React Patterns
- Functional components with hooks
- Use `@legendapp/state` for state management with `use$()` hook
- Destructure props at component level
- Use `useEffect` sparingly, prefer reactive state updates

### Error Handling
- Wrap async operations in try/catch
- Log errors with `console.error`
- Provide user-friendly fallback messages
- Use `neverthrow` Result types for complex error scenarios

### Styling
- Tailwind CSS with custom utility classes
- Use semantic color names (gray-900, blue-600)
- Responsive design with `lg:` prefixes
- Consistent spacing with Tailwind scale

### File Organization
- `src/routes/`: Page components with TanStack Router
- `src/components/`: Reusable UI components
- `src/lib/`: Business logic and API calls
- `src/utils/`: Helper functions
- `src/client/`: Generated API client code

### Formatting
- Tab indentation (Biome config)
- Double quotes for strings
- Semicolons required
- Trailing commas in multiline structures