---
title: "Deref and DerefMut: Rust's Smart Pointer Protocol"
description: "How Deref and DerefMut let String, Vec, and Box act like the data they hold, how to implement them for your own types, and when not to."
publishDate: "16 May 2025"
updatedDate: "19 October 2026"
tags: ["rust", "smart-pointers", "deref", "derefmut", "traits"]
---

`String`, `Vec`, and `Box` are smart pointers, yet you call methods on them as if they were the data they hold. `my_string.len()` works even though `len` is defined on `str`, not on `String`. When I first noticed this, it felt like a bit of Rust magic.

The mechanism is two traits, `Deref` and `DerefMut`, plus two compiler rules that use them: auto-deref for method calls and deref coercion for references. Together they let a wrapper behave like its contents without you writing `*` everywhere.

> **Personal Note**: It clicked for me when I realized `Deref` wasn't just about the `*` operator. It lets smart pointers act like the data they contain, especially in method calls, and once I saw that, much of the standard library suddenly made sense.

## Call Methods Through a Smart Pointer

`Deref` customizes the dereference operator `*`. Implementing it tells Rust how to get a shared reference to the data your type wraps:

```rust
trait Deref {
    type Target: ?Sized;
    fn deref(&self) -> &Self::Target;
}
```

- `Target` is the type that `*value` evaluates to.
- `deref` takes `&self` and returns `&Self::Target`.

When you call `u.foo()` and the type `U` has no method `foo`, Rust looks for `foo` on `*u`, the `Target` type, borrowing it as needed. If that type also implements `Deref`, the search continues another level, and so on. This is auto-deref.

`String` implements `Deref<Target = str>` and `Vec<T>` implements `Deref<Target = [T]>`, so `str` and slice methods are available on both:

```rust
fn main() {
    let s = String::from("Hello, Rustaceans!");
    // `len` and `starts_with` are defined on str
    println!("Length: {}", s.len());
    assert!(s.starts_with("Hello"));

    let v = vec![1, 2, 3];
    // `first` and `contains` are defined on [T]
    assert_eq!(v.first(), Some(&1));
    assert!(v.contains(&2));
}
```

Indexing with `v[0]` is a different mechanism: `Vec<T>` implements the `Index` trait directly.

## Pass `&String` Where `&str` Is Expected

The second rule, deref coercion, applies when a reference has the wrong type. If `U: Deref<Target = T>`, Rust converts `&U` to `&T` wherever a `&T` is expected, repeating the step as many times as needed:

```rust
fn greet(name: &str) {
    println!("Hello, {name}!");
}

fn main() {
    let owned = String::from("Ferris");
    let boxed = Box::new(String::from("Corro"));

    greet(&owned); // &String -> &str
    greet(&boxed); // &Box<String> -> &String -> &str
}
```

This is why functions should usually take `&str` or `&[T]` rather than `&String` or `&Vec<T>`: callers holding any of the owning types can still pass them.

## Mutate Through the Pointer with `DerefMut`

`DerefMut` is the mutable counterpart. It requires `Deref`, and returns `&mut Self::Target`:

```rust
trait DerefMut: Deref {
    fn deref_mut(&mut self) -> &mut Self::Target;
}
```

It lets `Box<T>` hand out mutable access to the value it owns on the heap:

```rust
fn main() {
    let mut x = Box::new(String::from("initial"));
    // Box<String> implements DerefMut<Target = String>
    x.push_str(" content");
    println!("{x}"); // initial content
}
```

## Build Your Own Smart Pointer

A minimal `MyBox<T>`, similar to `Box<T>` but without the heap allocation, shows both traits at work:

```rust
use std::ops::{Deref, DerefMut};

struct MyBox<T>(T);

impl<T> MyBox<T> {
    fn new(x: T) -> MyBox<T> {
        MyBox(x)
    }
}

impl<T> Deref for MyBox<T> {
    type Target = T;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl<T> DerefMut for MyBox<T> {
    fn deref_mut(&mut self) -> &mut Self::Target {
        &mut self.0
    }
}

fn main() {
    let mut smart_string = MyBox::new(String::from("Hello"));

    // Deref: call a String method
    println!("Length: {}", smart_string.len());

    // DerefMut: modify the String
    smart_string.push_str(", World!");
    println!("{}", *smart_string); // Hello, World!

    // Explicit dereferencing works too
    let immutable_ref: &String = &*smart_string;
    println!("Immutable ref: {immutable_ref}");

    let mutable_ref: &mut String = &mut *smart_string;
    mutable_ref.make_ascii_uppercase();
    println!("Uppercase: {mutable_ref}");
}
```

`deref` returns a shared reference to the `T` inside `MyBox`, and `deref_mut` returns a mutable one. That is all it takes for `String` methods to work on a `MyBox<String>`.

## Implement Deref Only for Pointer-Like Types

- **Keep `Deref` for wrappers.** It suits types that manage another value: `Box<T>`, `Rc<T>`, `String` over `str`, `Vec<T>` over `[T]`. Implementing `Deref` on a `User` struct to reach its `name` field imitates inheritance and confuses readers. A `user.name()` method is clearer.
- **Remember coercion can hide what's happening.** If a method call doesn't seem to belong to the type you expect, auto-deref may have found it a level down. An editor with rust-analyzer can show you where it resolved.
- **Use `AsRef` or `Borrow` for conversions.** `Deref` is for types where `*value` makes sense. `AsRef<T>` and `Borrow<T>` are general traits for cheap reference conversions; `String` implements `AsRef<str>`, and so do types that aren't pointers at all.
- **Be explicit when it reads better.** If implicit coercions pile up, write `*value` or call a method like `value.as_slice()` to make the intent clear.

:::tip
`Pin<P>` builds on `Deref` too: it wraps a pointer and reaches the value through it. See [Understanding Pin in Rust](/posts/understanding-pin-rust/) for how that is used to keep futures from moving.
:::

## Further Reading

- [The `Deref` trait](https://doc.rust-lang.org/std/ops/trait.Deref.html) in the standard library
- [Treating Smart Pointers Like Regular References with `Deref`](https://doc.rust-lang.org/book/ch15-02-deref.html) in The Rust Programming Language
- [Only smart pointers implement `Deref`](https://rust-lang.github.io/api-guidelines/predictability.html#c-deref) in the Rust API Guidelines
- [Understanding Pin in Rust: Move Semantics and Safety](/posts/understanding-pin-rust/) on this blog
