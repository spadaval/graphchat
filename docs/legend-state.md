# Legend State

Legend-State is a high-performance state management library for React apps that provides automatic reactivity and persistence.

## Core Concepts

### Observables
Observables wrap any data type (primitives, objects, arrays) and track changes automatically. They work like normal objects but provide reactive updates.

```typescript
import { observable } from "@legendapp/state"

const state$ = observable({
    fname: 'Annyong',
    lname: 'Bluth',
    // Computed properties
    name: () => state$.fname.get() + ' ' + state$.lname.get(),
    // Actions
    setName: (name: string) => {
        const [fname, lname] = name.split(' ');
        state$.assign({ fname, lname })
    }
})
```

**Key Points:**
- Use `get()` to read values, `set()` to update
- Supports all array methods (push, pop, etc.)
- Mutable - no need to clone objects
- Use `$` suffix for observable variables

### Direct Updates
Always update observables directly, not the raw data:

```typescript
// ❌ Wrong - modifies raw data without triggering updates
const value = state$.get()
value.key = 'newValue'
state$.set(value)

// ✅ Correct - update directly
state$.key.set('newValue')
state$.assign({ key: 'newValue' })
```

## React Integration

The `use$` hook automatically subscribes to observables and only re-renders when values change:

```typescript
import { use$ } from "@legendapp/state/react"

function NameDisplay() {
    const name = use$(state$.name)  // Reactive subscription
    return <div>{name}</div>
}
```

Works with observables or functions that consume observables.

> Note: Use the $ suffix on variables as a naming convention to indicate an observable. Do not use it for regular variables. 

```typescript
import { observable } from "@legendapp/state"

// Create observable objects as large and deep as you want. They can include computed functions
// and action functions.
const state$ = observable({
    fname: 'Annyong',
    lname: 'Bluth',
    // Computeds
    name: () => state$.fname.get() + ' ' + state$.lname.get(),
    // Actions
    setName: (name: string) => {
        const [fname, lname] = name.split(' ');
        state$.assign({ fname, lname })
    }
})
```

## React

The `use$` hook computes a value and automatically listens to any observables accessed while running, and only re-renders if the computed value changes. This can take either an observable or a function that consumes observables.

```typescript
import { use$ } from "@legendapp/state/react"

function NameDisplay() {
    const name = use$(state$.name)
    return <div>{name}</div>
}
```