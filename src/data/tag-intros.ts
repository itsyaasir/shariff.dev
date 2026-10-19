/**
 * Intros for tag pages that have enough posts to be indexed (see MIN_POSTS_TO_INDEX_TAG).
 * Each one shows under the tag page heading and doubles as its meta description, so keep it 50–160 characters.
 */
export const tagIntros: Record<string, string> = {
	borrowing:
		"How Rust decides how long a reference may live, from lifetimes on returned references to scoped threads that borrow their inputs.",
	concurrency:
		"Running Rust on more than one thread: scoped threads that borrow their inputs, and channels that carry results back.",
	iota: "Posts from my work at IOTA: building proof of inclusion in Rust and bringing IOTA's gRPC API to Node.js.",
	ownership:
		"Who owns a value in Rust and when it moves, from sending results across threads to choosing between iter, iter_mut, and into_iter.",
	rust: "Everything I've written about Rust, from ownership, lifetimes, and error handling to async, threads, and the Rust behind IOTA's proof of inclusion.",
	webassembly:
		"Shipping Rust to JavaScript through WebAssembly: one trait for native and wasm targets, and a Node.js client that hands raw bytes to Rust.",
};
