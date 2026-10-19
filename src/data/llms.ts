import { consultancy, siteConfig } from "@/site-config";

export function llmsFacts(site: URL) {
	return [
		`- Name: ${siteConfig.author}`,
		`- Role: ${siteConfig.jobTitle}`,
		"- Based in: Nairobi, Kenya (East Africa Time, UTC+3); works remotely with teams in any time zone",
		"- Current work: leads notarization, audit trails, and proof of inclusion at the IOTA Foundation, from the Rust core to WebAssembly and TypeScript APIs",
		"- Earlier work: an Ethereum-compatible execution client at Bitfinity Network, backend services at LaunchAI, and low-latency Solana RPC infrastructure for Tideblock",
		`- Products: Shipzen (https://shipzen.net) and PrismPOS (https://prismpos.app), built and operated through ${consultancy.name}`,
		`- Consulting: Rust, blockchain infrastructure, and distributed backends; see ${new URL(consultancy.path, site).href}`,
		"- Writes about: Rust, async, concurrency, WebAssembly, and blockchain infrastructure",
		"- Contact: yasir@shariff.dev",
	];
}

export const llmsPages = [
	{ description: "Who I am and what I work on", path: "/about/", title: "About" },
	{
		description: "Products and infrastructure I've built, including Shipzen, PrismPOS, and IOTA",
		path: "/work/",
		title: "Work",
	},
	{
		description: "Hire me for Rust, blockchain infrastructure, and distributed backend work",
		path: consultancy.path,
		title: "Consulting",
	},
];
