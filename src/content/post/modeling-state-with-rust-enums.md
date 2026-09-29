---
title: "Modeling State with Rust Enums"
description: "Use enum variants to describe valid states, carry the data each state needs, and make transitions explicit with pattern matching."
publishDate: "6 November 2025"
tags: ["rust", "enums", "pattern-matching", "design"]
---

A collection of flags can make a simple workflow surprisingly hard to reason about. If a job has `is_running`, `is_finished`, and `has_failed` fields, which combinations are valid? Rust enums offer a more direct model: one value represents exactly one state at a time.

Each variant can carry the data that belongs to that state. A finished job may have a result, while a failed job has an error message. Neither field needs a placeholder when it does not apply.

> **Personal Note**: Before adding another boolean to a type, I write down the states I expect to see. If some combinations would make no sense, an enum is usually easier for me to maintain.

## Put Data Next to Its State

Here is a small job model with different information for each outcome:

```rust
enum Job {
    Queued,
    Running { completed: usize, total: usize },
    Finished { output: String },
    Failed { reason: String },
}

fn summary(job: &Job) -> String {
    match job {
        Job::Queued => "waiting to start".to_owned(),
        Job::Running { completed, total } => {
            format!("processed {completed} of {total}")
        }
        Job::Finished { output } => format!("saved {output}"),
        Job::Failed { reason } => format!("failed: {reason}"),
    }
}

fn main() {
    let job = Job::Running { completed: 3, total: 5 };
    assert_eq!(summary(&job), "processed 3 of 5");
}
```

`match` covers every variant. If we later add a `Cancelled` state, the compiler points to matches that need a decision about it. That makes a new state harder to forget in a display function or handler.

## Make Transitions Explicit

An enum can also make a transition return a new state. Moving the old state into the function means there is one current value to account for:

```rust
enum Draft {
    Editing(String),
    Published(String),
}

fn publish(draft: Draft) -> Draft {
    match draft {
        Draft::Editing(text) if !text.trim().is_empty() => Draft::Published(text),
        other => other,
    }
}

fn main() {
    let draft = Draft::Editing(String::from("A useful note"));
    let draft = publish(draft);

    assert!(matches!(draft, Draft::Published(_)));
}
```

The guard keeps an empty draft in `Editing`, and a published draft stays published. Real workflows may need an error or a richer transition result, but the same idea applies: write each allowed transition down.

## Keep the Model Proportionate

An enum helps when states are distinct and should carry different data. A boolean still works well for an independent yes-or-no property. I use the enum when it removes invalid combinations or makes handling each case clearer.

## Further Reading

- [Defining an Enum](https://doc.rust-lang.org/book/ch06-01-defining-an-enum.html) in The Rust Programming Language
- [The `match` Control Flow Construct](https://doc.rust-lang.org/book/ch06-02-match.html) in The Rust Programming Language
