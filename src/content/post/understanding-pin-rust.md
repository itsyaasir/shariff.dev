---
title: "Understanding Pin in Rust: Move Semantics and Safety"
description: "What Pin guarantees, why self-referential futures need it, and how to pin values safely when writing async Rust, with a stream example."
publishDate: "19 December 2024"
updatedDate: "19 October 2026"
tags: ["rust", "pin", "async", "memory-management"]
---

Rust's ownership rules let you move almost any value: hand it to a function, push it into a `Vec`, return it. Then async code arrives and `Pin` shows up, a type whose whole job is to say "this value must not move again". For a long time it was the concept that wouldn't click for me.

`Pin` exists because the futures the compiler builds from `async fn` can hold references into themselves. Moving such a future would leave those references pointing at the old location, so `Pin` makes moving it impossible in safe code once it has started running.

> **Personal Note**: What finally made it click for me was seeing that `Pin` isn't an arbitrary restriction. It solves a concrete problem that appears when the compiler turns async functions into state machines.

## See Why Async Functions Need Pin

Consider an async function that borrows a local across an `.await`:

```rust
async fn print_first() {
    let data = [1, 2, 3];
    let first = &data[0];
    tick().await;
    println!("First element: {first}");
}

async fn tick() {}
```

The compiler turns `print_first` into a state machine. While it waits at `tick().await`, both `data` and `first` are stored inside the future, and `first` points at `data`. The future is self-referential.

Moving the future before its first poll is harmless, because nothing has been borrowed yet. Moving it after it has paused at the `.await` would leave `first` pointing at memory the future no longer occupies. That is why `Future::poll` takes `self: Pin<&mut Self>`: to poll a future at all, you must first promise it will stay where it is.

## Pin a Self-Referential Struct on the Heap

You can build the same shape by hand. This struct stores a pointer to one of its own fields:

```rust
use std::marker::PhantomPinned;
use std::pin::Pin;

struct SelfReferential {
    data: String,
    reference: *const String,
    _pin: PhantomPinned,
}

impl SelfReferential {
    fn new(data: String) -> Pin<Box<Self>> {
        let mut boxed = Box::new(SelfReferential {
            data,
            reference: std::ptr::null(),
            _pin: PhantomPinned,
        });

        // The heap allocation doesn't move when the Box does, so this address stays valid
        boxed.reference = &boxed.data;

        Box::into_pin(boxed)
    }

    fn reference(self: Pin<&Self>) -> &String {
        // SAFETY: `reference` points at `data`, which can't move while the struct is pinned
        unsafe { &*self.reference }
    }
}

fn main() {
    let value = SelfReferential::new("hello".to_string());
    println!("{}", value.as_ref().reference());
}
```

`Box::into_pin` turns the `Box` into a `Pin<Box<Self>>`. `Pin::new` would not compile here, because it only accepts pointers to `Unpin` types and `PhantomPinned` removes that trait.

:::warning
The raw pointer and `unsafe` block are for demonstration. In async code the compiler creates these self-references for you, and `Pin` is what keeps them sound.
:::

## Know What Pin, Unpin, and PhantomPinned Do

- **`Pin<P>`** wraps a pointer `P`, such as `Box<T>` or `&mut T`, and guarantees the value it points to won't move again until it is dropped. It reaches that value through `Deref`, which I covered in [Deref and DerefMut: Rust's Smart Pointer Protocol](/posts/magic-of-deref-rust/).
- **`Unpin`** is an auto trait for types that are safe to move even while pinned. The compiler implements it for almost every type, and pinning an `Unpin` value changes nothing.
- **`PhantomPinned`** is a marker field that makes a type `!Unpin`, so the pinning guarantee applies to it.

## Implement a Stream for an Unpin Type

Hand-written `Future` and `Stream` implementations receive `self: Pin<&mut Self>`. When the type is `Unpin`, you can get a plain `&mut Self` back with `get_mut`:

```rust
use std::pin::Pin;
use std::task::{Context, Poll};
use futures::Stream;

struct CounterStream {
    count: u32,
    max: u32,
}

impl Stream for CounterStream {
    type Item = u32;

    fn poll_next(self: Pin<&mut Self>, _cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
        let me = self.get_mut();

        if me.count >= me.max {
            return Poll::Ready(None);
        }

        me.count += 1;
        Poll::Ready(Some(me.count))
    }
}
```

`CounterStream` holds two `u32`s and no self-references, so it is `Unpin` automatically and `get_mut` is safe. If the stream wrapped a `!Unpin` field, such as another future, `get_mut` would not compile. The [`pin-project`](https://docs.rs/pin-project/latest/pin_project/) crate gives you safe pinned access to individual fields in that case.

## Pin Futures on the Stack with `pin!`

To poll a future yourself, you need a `Pin<&mut F>`. The `std::pin::pin!` macro, stable since Rust 1.68, pins a value on the stack without a heap allocation:

```rust
use std::future::Future;
use std::pin::pin;
use std::task::{Context, Poll};

fn poll_once<F: Future>(future: F, cx: &mut Context<'_>) -> Poll<F::Output> {
    let mut future = pin!(future);
    future.as_mut().poll(cx)
}
```

`as_mut` reborrows the pin, so you can poll the same future again later. When a pinned future has to outlive the current function, for example to store it in a struct or return it, use `Box::pin` instead.

## Let `.await` Do the Pinning

`.await` pins the future it waits on, and executors such as `tokio::spawn` pin the tasks they run. In application code you rarely write `Pin` at all.

:::note
Reach for `Pin` directly when you implement `Future` or `Stream` by hand, store futures in your own types, or poll a future more than once from a loop.
:::

## Further Reading

- [The `std::pin` module](https://doc.rust-lang.org/std/pin/index.html) in the standard library
- [Asynchronous Programming in Rust](https://rust-lang.github.io/async-book/), the async book
- [Deref and DerefMut: Rust's Smart Pointer Protocol](/posts/magic-of-deref-rust/) on this blog
- [The `pin-project` crate](https://docs.rs/pin-project/latest/pin_project/) on docs.rs
- [Smart Pointers](https://doc.rust-lang.org/book/ch15-00-smart-pointers.html) in The Rust Programming Language
