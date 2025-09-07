# Plan for Removing ChatMessage Type and Transitioning to Block-Based System

## Overview

This document outlines the plan for removing the `ChatMessage` type from the GraphChat application and fully transitioning to the block-based system that is already partially implemented. The `ChatMessage` type is currently used in several key areas of the application, and its removal will simplify the codebase and eliminate redundancy.

## Current State

The application currently uses a hybrid approach:
- Legacy `ChatMessage` type with variants and other metadata
- Newer block-based system with `Block` and `BlockId` types
- Helper functions that convert between the two systems

## Files Using ChatMessage

1. `src/lib/state/chat.ts` - Defines the type and helper functions
2. `src/lib/state/llm.ts` - Uses `ChatMessage[]` in LLM functions
3. `src/components/ChatMessage.tsx` - Component that displays messages
4. `src/components/ChatAreaComponents.tsx` - Uses the ChatMessage component
5. `src/components/LayoutComponents.tsx` - Imports the type
6. `src/lib/state/index.ts` - Exports the type

## Planned Changes

### 1. Update LLM Functions (src/lib/state/llm.ts)

- Modify `callLLM` and `callLLMStreaming` to accept blocks instead of `ChatMessage[]`
- Update message preparation logic to work directly with blocks
- Remove import of `ChatMessage` type

### 2. Refactor ChatMessage Component (src/components/ChatMessage.tsx)

- Update component to work directly with blocks instead of converting from `ChatMessage`
- Remove import of `ChatMessage` type
- Update props to accept block information instead of message ID

### 3. Update Component Imports

- Remove `ChatMessage` type imports from:
  - `src/components/ChatAreaComponents.tsx`
  - `src/components/LayoutComponents.tsx`

### 4. Update State Management (src/lib/state/chat.ts)

- Remove `ChatMessage` interface definition
- Remove `createChatMessage` function
- Update `getThreadMessages` to return blocks instead of converting to `ChatMessage`
- Update `convertBlocksToMessages` to work directly with blocks or remove if no longer needed
- Remove export of `ChatMessage` type

### 5. Update State Exports (src/lib/state/index.ts)

- Remove `ChatMessage` from exported types

### 6. Update sendMessage Function

- Modify to work directly with blocks without intermediate `ChatMessage` conversion

## Implementation Steps

1. **Prepare the LLM functions** - Update `callLLM` and `callLLMStreaming` to work with blocks
2. **Refactor the ChatMessage component** - Make it work directly with blocks
3. **Update component imports** - Remove unused imports
4. **Modify state management** - Remove `ChatMessage` type and related functions
5. **Update exports** - Remove `ChatMessage` from public API
6. **Verify functionality** - Ensure all features work correctly with the new implementation
7. **Remove deprecated functions** - Clean up any remaining references

## Expected Benefits

- Simplified codebase with a single message representation
- Elimination of conversion overhead between `ChatMessage` and blocks
- More consistent architecture
- Reduced bundle size by removing duplicate type definitions

## Risks and Mitigations

- **Data loss during transition**: Ensure backward compatibility with existing stored data
- **UI component breakage**: Thorough testing of all message display components
- **LLM integration issues**: Comprehensive testing of both streaming and non-streaming API calls

## Testing Plan

1. Verify that existing chat threads display correctly
2. Test message sending and receiving functionality
3. Validate streaming responses work as expected
4. Check that all UI components render properly
5. Confirm that thread management functions correctly
6. Test edge cases like empty threads and very long messages