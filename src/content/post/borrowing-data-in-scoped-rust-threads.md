---
title: "Borrowing Data in Scoped Rust Threads"
description: "Use std::thread::scope to share borrowed inputs with short-lived threads and safely split mutable data between workers."
publishDate: "12 March 2026"
tags: ["rust", "concurrency", "threads", "borrowing"]
---

`thread::spawn` is useful when a thread may keep running after the current function returns. That possibility is also why its closure generally needs to own the data it uses. For work that starts and finishes within one function, `std::thread::scope` offers a useful alternative.

A scope waits for its threads before it returns. The workers can therefore borrow data that lives outside the scope, without moving that data into a reference-counted wrapper just to satisfy a `'static` requirement.

> **Personal Note**: I reach for scoped threads when the data already belongs to one operation and I know every worker should finish before that operation ends. The ownership story stays close to the code doing the work.

## Borrow Read-Only Input

Two workers can read different parts of the same array. Each handle returns a partial sum, and the scope joins both workers before leaving:

```rust
use std::thread;

fn main() {
    let values = [1, 2, 3, 4, 5, 6];

    let total = thread::scope(|scope| {
        let left = scope.spawn(|| values[..3].iter().sum::<i32>());
        let right = scope.spawn(|| values[3..].iter().sum::<i32>());

        left.join().expect("left worker panicked")
            + right.join().expect("right worker panicked")
    });

    assert_eq!(total, 21);
    assert_eq!(values[0], 1); // The caller still owns the array.
}
```

The closures borrow `values`; neither takes ownership of it. Explicit `join` calls also make worker panics visible at the point where the result is needed.

## Split Mutable Data Before Spawning

Borrowing mutably across threads is possible when each worker receives a separate, non-overlapping slice:

```rust
use std::thread;

fn main() {
    let mut values = [1, 2, 3, 4];

    thread::scope(|scope| {
        let (left, right) = values.split_at_mut(2);

        scope.spawn(move || {
            for value in left {
                *value *= 2;
            }
        });

        scope.spawn(move || {
            for value in right {
                *value += 10;
            }
        });
    });

    assert_eq!(values, [2, 4, 13, 14]);
}
```

`split_at_mut` proves the slices do not overlap. The scope waits for both workers before `values` is read again. In production code, keep the join handles when you want to report a worker panic explicitly.

## Use Threads Where the Work Warrants Them

Spawning threads has a cost, so a tiny sum will usually be simpler as a normal loop. Scoped threads become useful when independent pieces of work take enough time to justify parallel execution and all results are needed before returning.

## Further Reading

- [`std::thread::scope`](https://doc.rust-lang.org/std/thread/fn.scope.html) in the standard library
- [Using Threads to Run Code Simultaneously](https://doc.rust-lang.org/book/ch16-01-threads.html) in The Rust Programming Language
