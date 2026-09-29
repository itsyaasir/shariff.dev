---
title: "Handling Recoverable Errors with Result in Rust"
description: "Learn when to handle an error, when to return it, and how the question mark operator keeps fallible Rust code readable."
publishDate: "20 February 2025"
tags: ["rust", "error-handling", "result"]
---

Opening a file, reading input, or parsing a number can fail for ordinary reasons. Rust represents those outcomes with `Result<T, E>`: `Ok(T)` carries a value, while `Err(E)` carries the reason the operation failed.

The interesting question is where to deal with the error. A helper often knows *what* failed, but the caller knows whether to retry, show a message, or stop. `Result` lets the helper pass that decision back.

> **Personal Note**: I try to handle an error at the point where I can make a useful decision. Returning it from a small helper keeps that helper focused and makes the calling code easier to understand.

## Start with an Explicit `match`

Suppose a program reads a note from disk. `read_to_string` returns either its contents or an I/O error:

```rust
use std::fs;

fn main() {
    match fs::read_to_string("note.txt") {
        Ok(contents) => println!("Note: {contents}"),
        Err(error) => eprintln!("Could not read note.txt: {error}"),
    }
}
```

Both outcomes are visible. The program does not assume the file exists, and it can give the person running it a useful message.

## Return Errors from Helpers with `?`

A helper that has no recovery plan can return a `Result` to its caller. The `?` operator unwraps an `Ok` value and continues; for an `Err`, it returns early from the function.

```rust
use std::fs::File;
use std::io::{self, Read};

fn read_note(path: &str) -> io::Result<String> {
    let mut file = File::open(path)?;
    let mut contents = String::new();
    file.read_to_string(&mut contents)?;
    Ok(contents)
}

fn main() {
    match read_note("note.txt") {
        Ok(contents) => println!("Note: {contents}"),
        Err(error) => eprintln!("Could not read note.txt: {error}"),
    }
}
```

If `File::open` fails, the function returns that error without trying to read. If the read fails, it returns the read error. `?` needs a compatible return type: here, both operations and `read_note` use `io::Result`.

For a helper that only reads the entire file, `fs::read_to_string(path)` would be shorter. The longer version makes the two possible failure points visible.

## Recover Only When You Have a Plan

Sometimes a missing file is expected, while another I/O error still deserves attention. Match the specific case you know how to handle:

```rust
use std::fs;
use std::io::ErrorKind;

fn main() {
    match fs::read_to_string("settings.txt") {
        Ok(settings) => println!("Loaded: {settings}"),
        Err(error) if error.kind() == ErrorKind::NotFound => {
            println!("No settings file; using defaults");
        }
        Err(error) => eprintln!("Could not load settings: {error}"),
    }
}
```

The missing-file branch expresses a deliberate fallback. Permission errors and other failures still reach the final branch instead of being mistaken for an empty settings file.

## When Should You Use `unwrap`?

`unwrap()` and `expect()` panic on `Err`, which is usually the wrong behavior for a routine I/O failure. They can be useful in a short example or when an invariant truly guarantees success. In application code, prefer returning an error or matching it when the failure can happen in normal use.

The choice is simple: handle an error when you know how to respond, and return it when the caller is better placed to decide. `Result` makes both paths explicit, while `?` keeps propagation from drowning out the main logic.

## Further Reading

- [Recoverable Errors with `Result`](https://doc.rust-lang.org/book/ch09-02-recoverable-errors-with-result.html) in The Rust Programming Language
- [The `Result` type](https://doc.rust-lang.org/std/result/) in the standard library
