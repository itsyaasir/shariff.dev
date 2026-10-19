---
title: "Bringing IOTA's gRPC API to Node.js for Proof of Inclusion"
description: "Generate a pinned TypeScript client from IOTA's protobuf schema, keep it to raw bytes, and let Rust compiled to WebAssembly decode them."
publishDate: "18 October 2026"
tags: ["rust", "webassembly", "grpc", "iota"]
---

Proof of Inclusion for IOTA needs raw, signed ledger data: a transaction and its user signatures, its effects and events, and the checkpoint that certified them. Verification recomputes digests from those bytes, so a decoded JSON view of the same data is not enough. The IOTA node exposes everything required through the gRPC `LedgerService`, including the checkpoint that closes each epoch.

In Rust, the `iota-sdk-grpc-client` crate already covers that API. It is built on tonic's native transport, though, so it cannot be part of the WebAssembly build that powers the Node.js package. The TypeScript SDK offers JSON-RPC and GraphQL clients, but no gRPC client. The Node.js package needed its own.

> **Personal Note**: My first `Source` trait was written for the native client, and the source assembled proofs itself. When JavaScript had to implement the same trait, that design no longer fit. I now decide early what a transport is allowed to know, and the answer is usually "only bytes".

## Pin the Schema Before Generating Code

The client is generated from the node's protobuf definitions, which live in the IOTA Rust SDK. Generated code is only as stable as its input, so the package records exactly which schema it was built from:

```json
{
	"repository": "https://github.com/iotaledger/iota-rust-sdk",
	"revision": "b77fcd5ac5fedb3dfbc77ba7d183140e43512339",
	"protoRoot": "crates/iota-sdk-grpc-types/proto",
	"entrypoints": ["iota/grpc/v1/ledger_service.proto"],
	"imageSha256": "sha256:8ed56353f07bbf508442cab56c592b2cc34fe39f696f3bc815ee01cff9dd6186"
}
```

An update script builds a Buf image from that commit and writes its SHA-256 digest into the lock file. It only accepts a full commit hash from the approved repository. The generation step checks the digest before running `protoc-gen-es`, so the TypeScript client cannot be regenerated from a schema nobody reviewed. ConnectRPC's Node.js transport then turns the generated service definition into a working client.

## Request Only the Bytes the Proof Needs

gRPC read masks let the caller choose which fields come back. The JavaScript source asks for BCS bytes and the few values that link them together, and nothing else:

```ts
const TRANSACTION_PROOF_FIELDS = [
	"transaction.bcs",
	"signatures",
	"effects.bcs",
	"events.digest",
	"events.events.bcs",
	"checkpoint",
];
```

The source does not interpret any of these bytes. It does check the shape of each response. Several `LedgerService` calls stream their results, so the checkpoint reader rejects a second checkpoint for one sequence number, data after the end marker, a mismatched sequence number, or a stream that never finishes. Those checks are not what makes a proof valid; verification does that later. They turn a confusing decode failure deep in Rust into a clear transport error at the point where it happened.

## Decode Everything in Rust

The JavaScript source hands its results to Rust as plain byte arrays. On the Rust side, each response deserializes into a small struct that contains bytes and nothing else:

```rust
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct JsTransactionEvidence {
    transaction_bcs: Vec<u8>,
    signatures_bcs: Vec<Vec<u8>>,
    effects_bcs: Vec<u8>,
    events_bcs: Option<Vec<Vec<u8>>>,
    checkpoint_sequence_number: u64,
}
```

Rust then decodes the BCS into the same IOTA types the native gRPC client produces. From that point on, the proof builder and verifier cannot tell which transport fetched the data. A faulty JavaScript source can make a proof fail to build, but it has no way to influence what counts as valid.

The native side uses the same boundary. `Source` is implemented directly for the Rust gRPC client behind a `native-grpc` feature, and the WebAssembly build disables that feature. One builder and one verifier serve both platforms. [Building IOTA's Proof of Inclusion with Rust](/posts/building-proof-of-inclusion-with-rust/) covers how that shared trait is designed.

## Keep the Transport Replaceable

Maintaining a generated client has a cost: when the node's schema changes, the lock file and generated code have to follow. Keeping the client to raw bytes keeps that cost contained. If the TypeScript SDK gains gRPC support later, I can swap the source without touching the Rust code that decides whether a proof is valid.

## Further Reading

- [Proof of Inclusion Wasm package](https://github.com/iotaledger/notarization/tree/main/bindings/wasm/poi_wasm) in the IOTA Notarization repository
- [Getting started with Connect for Node.js](https://connectrpc.com/docs/node/getting-started) in the ConnectRPC documentation
- [Protobuf-ES](https://github.com/bufbuild/protobuf-es), the generator behind `protoc-gen-es`
- [The `wasm-bindgen` Guide](https://wasm-bindgen.github.io/wasm-bindgen/)
