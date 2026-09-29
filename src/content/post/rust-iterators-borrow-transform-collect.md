---
title: "Rust Iterators: Borrow, Transform, and Collect"
description: "A practical guide to iter, iter_mut, and into_iter, with readable examples of filtering, mapping, and collecting values."
publishDate: "10 April 2025"
tags: ["rust", "iterators", "ownership", "collections"]
---

When I first started using Rust iterators, the methods felt easy enough until ownership entered the picture. Should I call `.iter()`, `.iter_mut()`, or `.into_iter()`? The answer depends on whether I want to read the collection, change its elements, or hand its values to something else.

Once that choice is clear, the rest of an iterator chain becomes much easier to follow. Let's work through each form and then put the pieces together.

> **Personal Note**: I find it helpful to decide who should own the values *before* writing `map` or `filter`. It keeps me from adding a `.clone()` just to make a compiler error disappear.

## Choose How to Visit the Values

For a `Vec<T>`, these three methods produce different kinds of items:

| Method | Items | What happens to the vector? |
| --- | --- | --- |
| `.iter()` | `&T` | You borrow it and can use it again afterward. |
| `.iter_mut()` | `&mut T` | You borrow it mutably and can use it after the borrow ends. |
| `.into_iter()` | `T` | You consume it and take ownership of its values. |

Here is what that looks like with strings:

```rust
fn main() {
    let mut names = vec![String::from("Ada"), String::from("Lin")];

    let lengths: Vec<usize> = names.iter().map(|name| name.len()).collect();
    assert_eq!(lengths, vec![3, 3]);
    assert_eq!(names.len(), 2); // We still own the vector.

    for name in names.iter_mut() {
        name.push('!');
    }
    assert_eq!(names, ["Ada!", "Lin!"]);

    let excited: Vec<String> = names.into_iter().collect();
    assert_eq!(excited, ["Ada!", "Lin!"]);
    // `names` cannot be used here: into_iter() consumed it.
}
```

If you only need to inspect values, start with `.iter()`. Reach for `.into_iter()` when the next operation should own each item, such as moving strings into a new collection.

## Build a Readable Chain

Iterator adapters such as `filter` and `map` are lazy. They describe work, but the work happens when a consumer such as `collect`, `sum`, or a `for` loop pulls values from the iterator.

This example keeps passing scores, adds five bonus points, and gathers the results:

```rust
fn main() {
    let scores = [42, 88, 67, 91];

    let adjusted: Vec<i32> = scores
        .iter()
        .copied()
        .filter(|score| *score >= 70)
        .map(|score| score + 5)
        .collect();

    assert_eq!(adjusted, vec![93, 96]);
    assert_eq!(scores[0], 42); // The original array is unchanged.
}
```

`.iter()` yields references, while `.copied()` turns each `&i32` into an `i32`. That makes the later operations work with plain numbers. The `Vec<i32>` type tells `collect()` what to build.

The order of the adapters matters. Filtering before mapping means the bonus is added only to scores that passed the original threshold.

## Use `filter_map` When Skipping Is Intentional

Sometimes a transformation might not produce a value. `filter_map` keeps each `Some(value)` and discards each `None`:

```rust
fn main() {
    let input = ["12", "not a number", "7"];

    let numbers: Vec<u32> = input
        .into_iter()
        .filter_map(|text| text.parse::<u32>().ok())
        .collect();

    assert_eq!(numbers, vec![12, 7]);
}
```

This is useful when invalid entries are expected and can safely be ignored. If bad input should stop the operation or produce a message, keep the `Result` from `parse()` and handle the error instead. Silently dropping a failed parse can hide a problem.

## Keep the Chain Easy to Read

Iterator chains are useful when each step has a clear job: borrow, filter, transform, then consume. If a closure grows into several branches or a chain takes effort to decipher, a `for` loop can communicate the same intent more clearly.

The key choice happens at the start. Use `.iter()` to borrow, `.iter_mut()` to edit in place, and `.into_iter()` to move values. The rest of the chain can then describe what you want to do with those items.

## Further Reading

- [Processing a Series of Items with Iterators](https://doc.rust-lang.org/book/ch13-02-iterators.html) in The Rust Programming Language
- [The `Iterator` trait](https://doc.rust-lang.org/std/iter/trait.Iterator.html) in the standard library
