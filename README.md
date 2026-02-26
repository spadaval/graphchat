# WorldCrafter

Some writers can just write - no preparation, no planning, no thought. Just words. 
If that's you, move along. This is for the rest of us.

WorldCrafter is a AI-native tool for creating imaginary worlds, inspired by software engineering tooling. 

We use AI, not to write the story, but to do the tedious work - linking documents, generating descriptions, doing line-edits, brainstorming names.

## Key Differentiators

- **Structured Writing Experience**: Move beyond the blank canvas with a structured approach to writing and worldbuilding.
- **Deep AI Integration**: AI is integrated into various aspects of the workflow to assist and enhance the creative process.
- **Extreme AI Control**: Gain fine-grained control over the input to the AI model, including context, parameters, and samplers. Full support for local models.


## Tech Stack

- **Frontend**: React 19 with TypeScript
- **Routing**: TanStack Router
- **State Management**: @legendapp/state with localStorage persistence
- **UI Framework**: Tailwind CSS
- **API Client**: Auto-generated OpenAPI client with @hey-api/openapi-ts
- **LLM Integration**: SSE (Server-Sent Events) streaming
- **Error Handling**: neverthrow for functional error handling
- **Build Tool**: Vite
- **Code Quality**: Biome for formatting and linting

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [Bun](https://bun.sh/) (v1.1 or later)

### Setup

1. Clone the repository:
   ```sh
   git clone <repository-url>
   cd worldcrafter
   ```

2. Install dependencies:
   ```sh
   bun install
   ```

3. Start the development server:
   ```sh
   bun dev
   ```

This starts your app in development mode, rebuilding assets on file changes.

### Available Scripts

- `bun dev` - Starts the development server with hot reloading
- `bun build` - Builds the application for production
- `bun start` - Starts the production server
- `bun format` - Formats code with Biome
- `bun gen-client` - Regenerates the OpenAPI client from spec

## Project Structure

```
src/
├── client/              # Auto-generated OpenAPI client
├── components/          # Reusable UI components
├── lib/                 # Business logic and state management
│   └── state/           # Application state (chat, LLM)
├── routes/              # TanStack Router route components
├── styles/              # CSS files
├── utils/               # Helper functions
└── router.tsx           # Router configuration
```
