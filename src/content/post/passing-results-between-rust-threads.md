---
title: "Passing Results Between Rust Threads with Channels"
description: "Send owned values from worker threads through standard-library channels, and close every sender so the receiver can finish."
publishDate: "20 August 2026"
tags: ["rust", "concurrency", "channels", "ownership"]
---

Sometimes a worker should produce a value and hand it to another part of a program. A channel gives that handoff a clear direction: senders produce messages, and a receiver consumes them. Rust's standard-library `mpsc` channel supports multiple producers and one consumer.

Sending an owned value moves it into the channel. The sender cannot keep using that value afterward, while the receiver becomes its new owner. This often makes the flow easier to follow than sharing a mutable collection between workers.

> **Personal Note**: I like channels when workers can report a small result and move on. I still decide how the receiver will finish before adding a loop, because an extra live sender can keep that loop waiting.

## Send One Result

Start with one worker and one message. `recv` waits for a value or reports that all senders have disconnected:

```rust
use std::sync::mpsc;
use std::thread;

fn main() {
    let (tx, rx) = mpsc::channel();

    let worker = thread::spawn(move || {
        let message = String::from("ready");
        tx.send(message).expect("receiver dropped");
        // `message` now belongs to the receiver.
    });

    let received = rx.recv().expect("sender dropped without a message");
    worker.join().expect("worker panicked");
    assert_eq!(received, "ready");
}
```

Joining the worker reports a panic instead of quietly discarding it. `send` and `recv` both return `Result` values because the other end of the channel may have gone away.

## Collect From Multiple Workers

Clone the transmitter for each producer. After spawning the workers, drop the original transmitter so iteration ends when every worker has finished sending:

```rust
use std::sync::mpsc;
use std::thread;

fn main() {
    let (tx, rx) = mpsc::channel();

    let workers: Vec<_> = [[1, 2], [3, 4]]
        .into_iter()
        .enumerate()
        .map(|(index, values)| {
            let tx = tx.clone();
            thread::spawn(move || {
                let total: i32 = values.iter().sum();
                tx.send((index, total)).expect("receiver dropped");
            })
        })
        .collect();

    drop(tx);
    let mut results: Vec<_> = rx.into_iter().collect();

    for worker in workers {
        worker.join().expect("worker panicked");
    }

    results.sort_by_key(|(index, _)| *index);
    assert_eq!(results, [(0, 3), (1, 7)]);
}
```

The arrival order depends on scheduling, so the example keeps an index and sorts the results before comparing them. The receiver's iterator ends only after every transmitter has been dropped. Forgetting to drop the original `tx` would leave the collection loop waiting for a sender that never sends.

## Match the Tool to the Handoff

Channels work well when workers produce independent messages for one consumer. When workers need to update the same state, a mutex or another shared-state design may fit better. For a fixed set of workers that simply return values, join handles can be even simpler.

## Further Reading

- [Transfer Data Between Threads with Message Passing](https://doc.rust-lang.org/book/ch16-02-message-passing.html) in The Rust Programming Language
- [`std::sync::mpsc`](https://doc.rust-lang.org/std/sync/mpsc/) in the standard library
