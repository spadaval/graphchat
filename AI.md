# AI Features Design Document

This document outlines the proposed AI-powered features for WorldCrafter, including data model changes and UI/UX considerations.

## Proposed Features

### 1. Generating a Block (Document Context)
*   **Description**: Analyzes all previous blocks in the current document to generate a logical next block.
*   **Context**: Full document history up to the current point, including title and tags.
*   **UI/UX**: 
    - A "✦ Generate Next" button at the bottom of the document.
    - An "Auto-complete" icon at the end of each block to continue from that point.
*   **Implementation**: Calls LLM with the document context and a "continuation" instruction.

### 2. Rewriting a Block
*   **Description**: Transform an existing block based on a prompt or predefined action.
*   **Options**: 
    - Adjust tone (e.g., more descriptive, more concise, more dramatic).
    - Fix grammar and spelling.
    - Expand or summarize.
*   **UI/UX**: 
    - Integrated into the Plate editor's AI menu (triggered by `Cmd+J`).
    - Quick actions in the block's metadata toolbar.
*   **Data Model**: Metadata in the block could track the original text for "revert" functionality.

### 3. Fill-in-the-Middle (FIM) Generation
*   **Description**: Generate content between two existing blocks.
*   **Context**: N blocks before and M blocks after the insertion point.
*   **UI/UX**: 
    - Hovering between blocks shows a "+" menu; add a "✦ AI Fill" option.
    - Shows a temporary "generating" state for the new block.
*   **Implementation**: Formats the request with `<PRE>` and `<SUF>` tags if supported by the model, or uses system instructions for bridge generation.

### 4. Inline Completion
*   **Description**: Real-time suggestions as the user types (ghost text).
*   **UI/UX**: 
    - Subtle grey text following the cursor.
    - Press `Tab` to accept, `Esc` or continue typing to ignore.
*   **Configuration**: Toggle to enable/disable; adjustable debounce time.

---

## Data Model Changes

### UI Preferences (`src/lib/state/types.ts`)
```typescript
export interface UIPreferences {
  activeTab: ActiveTab;
  aiEnabled: boolean;           // Master switch for AI features
  inlineCompletion: boolean;    // Toggle for real-time suggestions
  activeSamplerPreset?: string; // ID of saved AI parameters
}
```

### Block Metadata (`src/lib/state/types.ts`)
```typescript
export interface Block {
  // ... existing fields
  metadata?: {
    aiGenerated?: boolean;
    sourcePrompt?: string;
    originalText?: string;     // For re-write history
    [key: string]: any;
  };
}
```

### Sampler Presets
Introduce a way to save and name groups of `ModelProperties`.
```typescript
export interface SamplerPreset {
  id: string;
  name: string;
  properties: ModelProperties;
}
```

---

## UI Components & Integration

### AI Sidebar
*   **Purpose**: Centralized control for AI parameters.
*   **Contents**:
    - AI Toggle (On/Off).
    - Preset Selector (Creative, Precise, Fast, etc.).
    - Collapsible "Advanced Samplers" section (integrating `ModelProperties.tsx`).
    - API usage stats (tokens used, latency).

### Unified AI Menu
*   **Trigger**: `Cmd+J` or a dedicated button in the sidebar.
*   - **Common Prompts**: "Make it more descriptive", "Critique this description", "Suggest plot hooks".

### Visual Feedback
*   **Generation State**: Use the existing `isGenerating` flag to show a shimmering effect or a specialized border on blocks being generated.
*   **Attribution**: Small AI icon on blocks generated or modified by AI.

---

## Technical Considerations
*   **Context Management**: Sliding window for document blocks to avoid exceeding model context limits.
*   **Streaming**: All AI generation should use the existing streaming infrastructure for better perceived performance.
*   - **Latency**: Inline completion requires very low latency; consider a smaller, faster model for this specific feature.
