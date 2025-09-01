# Neverthrow

Neverthrow is a library for handling errors in a functional way. It provides a Result type that can be used to represent a value that may or may not exist, and an Err type that can be used to represent an error.

## Usage

```typescript
import { Result, Ok, Err } from "neverthrow";

function divide(a: number, b: number): Result<number, string> {
    if (b === 0) {
        return Err("Cannot divide by zero");
    }
    return Ok(a / b);
}

const neverthrower = () => {
    const userPromise = prisma.user.findUnique(...)

    const result = fromPromise(userPromise, originalError => ({originalError, message: "Error while reading user"}))

    result.match(
        user => console.log("Found my user", user),
        err => console.log(err.message, err.originalError)
    )
}
```