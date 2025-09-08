# GraphChat Project Context

## Project Overview

GraphChat is a React-based AI chat application built with TanStack Router, designed to interact with LLMs (Large Language Models). The application features a chat interface with thread management, message streaming, and model configuration capabilities.

### Key Technologies

- **Framework**: React 19 with TypeScript
- **Routing**: TanStack Router
- **State Management**: `@legendapp/state` with localStorage persistence
- **UI Framework**: Tailwind CSS with custom dark theme
- **API Client**: Auto-generated OpenAPI client with `@hey-api/openapi-ts`
- **LLM Integration**: SSE (Server-Sent Events) streaming for real-time responses
- **Error Handling**: `neverthrow` for functional error handling
- **Build Tool**: `Vite`
- **Code Quality**: `Biome` for formatting and linting

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

## Development Commands

- **Dev Server**: `pnpm dev` - Starts the development server with hot reloading
- **Build**: `pnpm build` - Builds the application for production
- **Start**: `pnpm start` - Starts the production server
- **Format**: `pnpm format` - Formats code with Biome
- **Generate Client**: `pnpm gen-client` - Regenerates the OpenAPI client from spec

The dev server should always be running. DO NOT try to start it.

## Architecture

### State Management

The application uses `@legendapp/state` for reactive state management with automatic localStorage persistence:

- `chatStore# GraphChat Project Context

## Project Overview

GraphChat is a React-based AI chat application built with TanStack Router, designed to interact with LLMs (Large Language Models). The application features a chat interface with thread management, message streaming, and model configuration capabilities.

### Key Technologies

- **Framework**: React 19 with TypeScript
- **Routing**: TanStack Router
- **State Management**: `@legendapp/state` with localStorage persistence
- **UI Framework**: Tailwind CSS with custom dark theme
- **API Client**: Auto-generated OpenAPI client with `@hey-api/openapi-ts`
- **LLM Integration**: SSE (Server-Sent Events) streaming for real-time responses
- **Error Handling**: `neverthrow` for functional error handling
- **Build Tool**: `Vite`
- **Code Quality**: `Biome` for formatting and linting

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

## Development Commands

- **Dev Server**: `pnpm dev` - Starts the development server with hot reloading
- **Build**: `pnpm build` - Builds the application for production
- **Start**: `pnpm start` - Starts the production server
- **Format**: `pnpm format` - Formats code with Biome
- **Generate Client**: `pnpm gen-client` - Regenerates the OpenAPI client from spec

The dev server should always be running. DO NOT try to start it.

## Architecture

 - Manages chat threads, messages, and current user input
- `modelProps# GraphChat Project Context

## Project Overview

GraphChat is a React-based AI chat application built with TanStack Router, designed to interact with LLMs (Large Language Models). The application features a chat interface with thread management, message streaming, and model configuration capabilities.

### Key Technologies

- **Framework**: React 19 with TypeScript
- **Routing**: TanStack Router
- **State Management**: `@legendapp/state` with localStorage persistence
- **UI Framework**: Tailwind CSS with custom dark theme
- **API Client**: Auto-generated OpenAPI client with `@hey-api/openapi-ts`
- **LLM Integration**: SSE (Server-Sent Events) streaming for real-time responses
- **Error Handling**: `neverthrow` for functional error handling
- **Build Tool**: `Vite`
- **Code Quality**: `Biome` for formatting and linting

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

## Development Commands

- **Dev Server**: `pnpm dev` - Starts the development server with hot reloading
- **Build**: `pnpm build` - Builds the application for production
- **Start**: `pnpm start` - Starts the production server
- **Format**: `pnpm format` - Formats code with Biome
- **Generate Client**: `pnpm gen-client` - Regenerates the OpenAPI client from spec

The dev server should always be running. DO NOT try to start it.

## Architecture

 - Manages LLM model parameters

**Guidelines**: `useState` should only be used for managing ephemeral state (UI state that doesn't need to be persisted or shared between components). All persistent or shared state should be managed with `@legendapp/state`.

### Routing

TanStack Router is used for application routing with:
- `__root.tsx` - Root layout with document structure
- `index.tsx` - Main chat interface

### LLM Integration

- Messages support variants (alternative responses)
- Streaming responses using Server-Sent Events
- Configurable model parameters
- Real-time slots monitoring with detailed slot information
- Error handling with neverthrow

### UI Components

- Chat threads sidebar for conversation management
- Main chat area with message display
- Model/Server configuration sidebar with detailed slots information
- Responsive design with Tailwind CSS

## Development Guidelines

### Code Style

- Path aliases: `~/` for `./src/`
- Strict TypeScript with interfaces for objects and types for unions
- Functional React components with `use$()` hook for state
- Double quotes, space indentation, semicolons
- Tailwind CSS for styling with semantic color names

### File Organization

- `routes/` - Page components
- `components/` - UI components
- `lib/` - Business logic
- `utils/` - Helper functions
- `client/` - Auto-generated API client

### Error Handling

- Use neverthrow for functional error handling
- try/catch for async operations
- User-friendly error messages
- Console logging for debugging

## Qwen Added Memories
- I've successfully implemented the document feature for GraphChat, including:
1. Created document state management with localStorage persistence
2. Implemented document CRUD operations (create, read, update, delete)
3. Built UI components for document listing, editing, and referencing
4. Integrated document referencing into the chat interface
5. Added document search and tagging functionality
6. Created routes for documents list, new document, and document editing
7. Fixed all TypeScript compilation errors
8. Addressed most linting issues (remaining ones are in existing code we didn't modify)

The document feature allows users to create, edit, and reference documents during chat conversations, supporting use cases like exploratory worldbuilding where users can chat about fantasy worlds and create documents about nations, people, political structures, events, etc.
