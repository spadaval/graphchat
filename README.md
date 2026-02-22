# WorldCrafter

WorldCrafter is a AI-native tool for creating imaginary worlds, inspired by software engineering tooling. It is designed primarily for writers and worldbuilders who need a structured environment for their creativity.

## Key Differentiators

- **Structured Writing Experience**: Move beyond the blank canvas with a structured approach to writing and worldbuilding.
- **Deep AI Integration**: AI is integrated into various aspects of the workflow to assist and enhance the creative process.
- **Branching/Versioning System**: Experiment with different storylines or world details using a branching and versioning system similar to code version control.
- **Extreme AI Control**: Gain fine-grained control over the input to the AI model, including context, parameters, and samplers.

## Features

- **AI Chat Interface**: Interact with Large Language Models (LLMs) to brainstorm and generate content.
- **Thread Management**: Organize conversations into separate threads.
- **Real-time Streaming**: Experience real-time message responses via Server-Sent Events (SSE).
- **Model Configuration**: Configure LLM parameters and monitor server slots.
- **Message Variants**: Explore alternative responses to messages.
- **Responsive Design**: precise control on desktop and mobile devices.
- **Persistent Storage**: Chat threads and data saved locally.
- **Dark Theme**: A custom dark theme for a comfortable writing environment.

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
