---
title: "Building IOTA's Proof of Inclusion with Rust"
description: "One Rust trait for native and WebAssembly, a proof format ready for new versions, and a committee cache that only holds what was verified."
publishDate: "18 October 2026"
tags: ["rust", "webassembly", "iota", "blockchain"]
---

Proof of Inclusion for IOTA packages a transaction, its effects and events, and the checkpoint that certified it into a single file. Anyone can check that file later, offline, and confirm the transaction is part of the ledger without trusting the node it came from. The format, builder, and verifier are written in Rust and ship as a crate, a CLI, and a Node.js package compiled to WebAssembly.

I built it between July and September 2026. Getting raw ledger data into Node.js was its own problem, covered in [Bringing IOTA's gRPC API to Node.js](/posts/iota-grpc-client-for-nodejs/). This post is about the Rust that holds the rest together: one trait for two platforms, a format that can grow, and a cache that cannot be trusted more than the checks behind it.

> **Personal Note**: My first proof format let a proof name the committee it expected to be signed by. It was convenient, but it meant a proof could carry part of its own trust. I removed it before release, and I now ask of every field whether it is something to verify or something to trust.

## Share One Trait Across Native and WebAssembly

The proof builder and the committee resolver are generic over `Source`, the trait that reads ledger data. Native code implements it for the Rust gRPC client. The WebAssembly build implements it for any JavaScript object with the right methods. Both use one definition:

```rust
#[cfg_attr(target_arch = "wasm32", async_trait(?Send))]
#[cfg_attr(not(target_arch = "wasm32"), async_trait)]
pub trait Source {
    async fn transaction(
        &self,
        digest: TransactionDigest,
    ) -> Result<Option<SourceTransaction>, SourceError>;

    async fn checkpoint(
        &self,
        sequence_number: u64,
    ) -> Result<Option<SourceCheckpoint>, SourceError>;

    // ...
}
```

On native targets, `async_trait` requires every returned future to be `Send`, so the builder can run on a multi-threaded Tokio runtime. A future that waits on a JavaScript promise is not `Send`, and WebAssembly in Node.js runs on one thread anyway. The `cfg_attr` pair drops the bound only when compiling for `wasm32`. The methods return decoded IOTA types rather than gRPC messages, so `ProofBuilder<S: Source>` and `CommitteeResolver<S>` are written once and compile for both.

## Version the Format So V2 Can Arrive

The first proof format stored its version as a `u16` checked at runtime. It is now an enum, and accessors and verification match on it:

```rust
#[non_exhaustive]
pub enum Proof {
    ProofV1(ProofV1),
}

impl ProofVerifier<'_> {
    pub fn verify<'proof>(
        &self,
        proof: &'proof Proof,
    ) -> Result<VerifiedProof<'proof>, VerifyError> {
        match proof {
            Proof::ProofV1(proof) => self.verify_v1(proof),
        }
    }
}
```

`#[non_exhaustive]` only applies outside the crate. Code that depends on it must keep a wildcard arm, so a new variant does not break it. Inside the crate, every `match` stays exhaustive, so adding `ProofV2` turns each place that needs a version 2 path into a compile error until it is handled. Serde writes the variant name into the JSON, so an unknown version fails at parse time. Version 1 proofs are kept as fixtures, and the tests check that they still parse and verify.

The return type changed after an internal review. `verify` used to return `()`. It now returns `VerifiedProof<'proof>`, which borrows the checked targets from the proof. Code that needs checked data asks for that type, and the lifetime keeps it from outliving the proof it came from.

## Cache Only What Was Verified

Without a trusted node, the resolver starts from the genesis committee and walks forward one epoch at a time. Each epoch ends with a checkpoint signed by the current committee that names the next one. The walk is slow, so verified committees go into a cache behind a trait:

```rust
pub struct CommitteeCacheKey {
    chain_identifier: ChainIdentifier,
    epoch: EpochId,
}

#[async_trait::async_trait]
pub trait CommitteeCache: Send + Sync {
    async fn committee(
        &self,
        key: CommitteeCacheKey,
    ) -> Result<Option<Committee>, CommitteeCacheError>;

    async fn store(
        &self,
        key: CommitteeCacheKey,
        committee: &Committee,
    ) -> Result<(), CommitteeCacheError>;
}
```

The resolver stores a committee only after its signatures check out. On the next lookup, it follows cached epochs forward from the anchor and fetches only the ones still missing. A cold walk takes up to about five minutes, depending on the epoch. A warm one takes a few seconds.

The key started as a bare epoch number. The internal review pointed out that a cache shared between networks would let a committee from one network answer for another. The key now includes the chain identifier, and its fields are private, so a caller cannot build one without it. The default in-memory cache also refuses to replace an entry with a different committee. An application that wants the cache to survive restarts implements the trait for its own storage and passes it in.

## Leave Out What You Cannot Prove Yet

Deleted and wrapped objects are not supported yet. When a proof targets only an object, the builder resolves its latest version at build time, and the proof does not claim that version is still the latest. I would rather ship a verifier with clear limits than one that answers questions it cannot back up.

## Further Reading

- [Bringing IOTA's gRPC API to Node.js for Proof of Inclusion](/posts/iota-grpc-client-for-nodejs/) on this blog
- [Proof of Inclusion source](https://github.com/iotaledger/notarization/tree/main/poi-rs) in the IOTA Notarization repository
- [The `async-trait` crate](https://docs.rs/async-trait/latest/async_trait/) on docs.rs
- [The `non_exhaustive` attribute](https://doc.rust-lang.org/reference/attributes/type_system.html#the-non_exhaustive-attribute) in the Rust Reference
