# Legend State

Legend-State is a super fast all-in-one local and remote state library that helps you write less code to make faster apps.

## Observables

You can put anything in an observable: primitives, deeply nested objects, arrays, functions, etc… Observables work just like normal objects so you can interact with them without any extra complication. Just call get() to get a value and set(...) to modify it.

Array methods are also supported (e.g. push, pop, shift, unshift, etc…).

Observables are proxies that track changes to the underlying data.
They are mutable. Cloning objects is unnecessary and wasteful.

Observables are just wrappers around the underlying data, so if you modify the raw data you’re actually modifying the observable data without notifying of changes. Then if you set it back onto the observable, that just sets it to itself so nothing happens.
```typescript
// ❌ This sets it to itself, nothing happens
const value = state$.get()
value.key = 'newValue'
state$.set(value)

// ✅ Set the value directly in the observable
state$.key.set('newValue')

// ✅ Assign the key/value to the observable
state$.assign({ key: 'newValue' })
```

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