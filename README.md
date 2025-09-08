# GraphChat

GraphChat is a modern AI chat application built with React 19 and TanStack Router, designed to interact with Large Language Models (LLMs). It features a responsive chat interface with thread management, real-time message streaming, and model configuration capabilities.

## Features

- **AI Chat Interface**: Clean, modern chat interface for interacting with LLMs
- **Thread Management**: Organize conversations into separate threads
- **Real-time Streaming**: Server-Sent Events (SSE) for real-time message responses
- **Model Configuration**: Configure LLM parameters and monitor server slots
- **Message Variants**: Support for alternative responses to messages
- **Responsive Design**: Works on desktop and mobile devices
- **Persistent Storage**: Chat threads saved to localStorage
- **Dark Theme**: Custom dark theme with Tailwind CSS

## Tech Stack

- **Frontend**: React 19 with TypeScript
- **Routing**: TanStack Router
- **State Management**: @legendapp/state with localStorage persistence
- **UI Framework**: Tailwind CSS with custom dark theme
- **API Client**: Auto-generated OpenAPI client with @hey-api/openapi-ts
- **LLM Integration**: SSE (Server-Sent Events) streaming
- **Error Handling**: neverthrow for functional error handling
- **Build Tool**: Vite
- **Code Quality**: Biome for formatting and linting

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [pnpm](https://pnpm.io/) (v9 or later)

### Setup

1. Clone the repository:
   ```sh
   git clone <repository-url>
   cd graphchat
   ```

2. Install dependencies:
   ```sh
   pnpm install
   ```

3. Start the development server:
   ```sh
   pnpm dev
   ```

This starts your app in development mode, rebuilding assets on file changes.

### Available Scripts

- `pnpm dev` - Starts the development server with hot reloading
- `pnpm build` - Builds the application for production
- `pnpm start` - Starts the production server
- `pnpm format` - Formats code with Biome
- `pnpm gen-client` - Regenerates the OpenAPI client from spec

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

## Architecture

### State Management

The application uses @legendapp/state for reactive state management with automatic localStorage persistence:

- `chatStore# GraphChat

GraphChat is a modern AI chat application built with React 19 and TanStack Router, designed to interact with Large Language Models (LLMs). It features a responsive chat interface with thread management, real-time message streaming, and model configuration capabilities.

## Features

- **AI Chat Interface**: Clean, modern chat interface for interacting with LLMs
- **Thread Management**: Organize conversations into separate threads
- **Real-time Streaming**: Server-Sent Events (SSE) for real-time message responses
- **Model Configuration**: Configure LLM parameters and monitor server slots
- **Message Variants**: Support for alternative responses to messages
- **Responsive Design**: Works on desktop and mobile devices
- **Persistent Storage**: Chat threads saved to localStorage
- **Dark Theme**: Custom dark theme with Tailwind CSS

## Tech Stack

- **Frontend**: React 19 with TypeScript
- **Routing**: TanStack Router
- **State Management**: @legendapp/state with localStorage persistence
- **UI Framework**: Tailwind CSS with custom dark theme
- **API Client**: Auto-generated OpenAPI client with @hey-api/openapi-ts
- **LLM Integration**: SSE (Server-Sent Events) streaming
- **Error Handling**: neverthrow for functional error handling
- **Build Tool**: Vite
- **Code Quality**: Biome for formatting and linting

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [pnpm](https://pnpm.io/) (v9 or later)

### Setup

1. Clone the repository:
   ```sh
   git clone <repository-url>
   cd graphchat
   ```

2. Install dependencies:
   ```sh
   pnpm install
   ```

3. Start the development server:
   ```sh
   pnpm dev
   ```

This starts your app in development mode, rebuilding assets on file changes.

### Available Scripts

- `pnpm dev` - Starts the development server with hot reloading
- `pnpm build` - Builds the application for production
- `pnpm start` - Starts the production server
- `pnpm format` - Formats code with Biome
- `pnpm gen-client` - Regenerates the OpenAPI client from spec

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

## Architecture

 - Manages chat threads, messages, and current user input
- `modelProps# GraphChat

GraphChat is a modern AI chat application built with React 19 and TanStack Router, designed to interact with Large Language Models (LLMs). It features a responsive chat interface with thread management, real-time message streaming, and model configuration capabilities.

## Features

- **AI Chat Interface**: Clean, modern chat interface for interacting with LLMs
- **Thread Management**: Organize conversations into separate threads
- **Real-time Streaming**: Server-Sent Events (SSE) for real-time message responses
- **Model Configuration**: Configure LLM parameters and monitor server slots
- **Message Variants**: Support for alternative responses to messages
- **Responsive Design**: Works on desktop and mobile devices
- **Persistent Storage**: Chat threads saved to localStorage
- **Dark Theme**: Custom dark theme with Tailwind CSS

## Tech Stack

- **Frontend**: React 19 with TypeScript
- **Routing**: TanStack Router
- **State Management**: @legendapp/state with localStorage persistence
- **UI Framework**: Tailwind CSS with custom dark theme
- **API Client**: Auto-generated OpenAPI client with @hey-api/openapi-ts
- **LLM Integration**: SSE (Server-Sent Events) streaming
- **Error Handling**: neverthrow for functional error handling
- **Build Tool**: Vite
- **Code Quality**: Biome for formatting and linting

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [pnpm](https://pnpm.io/) (v9 or later)

### Setup

1. Clone the repository:
   ```sh
   git clone <repository-url>
   cd graphchat
   ```

2. Install dependencies:
   ```sh
   pnpm install
   ```

3. Start the development server:
   ```sh
   pnpm dev
   ```

This starts your app in development mode, rebuilding assets on file changes.

### Available Scripts

- `pnpm dev` - Starts the development server with hot reloading
- `pnpm build` - Builds the application for production
- `pnpm start` - Starts the production server
- `pnpm format` - Formats code with Biome
- `pnpm gen-client` - Regenerates the OpenAPI client from spec

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

## Architecture

 - Manages LLM model parameters

**Guidelines**: `useState` should only be used for managing ephemeral state (UI state that doesn't need to be persisted or shared between components). All persistent or shared state should be managed with `@legendapp/state`.

### Routing

TanStack Router is used for application routing:
- `__root.tsx` - Root layout with document structure
- `index.tsx` - Main chat interface

### LLM Integration

- Messages support variants (alternative responses)
- Streaming responses using Server-Sent Events
- Configurable model parameters
- Real-time slots monitoring with detailed slot information
- Error handling with neverthrow

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.