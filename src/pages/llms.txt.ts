import type { APIContext } from "astro";
import { getAllPosts, sortMDByDate } from "@/data/post";
import { siteConfig } from "@/site-config";

// https://llmstxt.org: a Markdown map of the site for language models
const pages = [
	{ description: "Who I am and what I work on", path: "/about/", title: "About" },
	{
		description: "Products and infrastructure I've built, including Shipzen, PrismPOS, and IOTA",
		path: "/work/",
		title: "Work",
	},
	{
		description: "Hire me for Rust, blockchain infrastructure, and distributed backend work",
		path: "/consulting/",
		title: "Consulting",
	},
];

export const GET = async ({ site }: APIContext) => {
	const posts = sortMDByDate(await getAllPosts());
	const link = (title: string, path: string, description: string) =>
		`- [${title}](${new URL(path, site).href}): ${description}`;

	const body = [
		`# ${siteConfig.title}`,
		"",
		`> ${siteConfig.description}`,
		"",
		"## Pages",
		"",
		...pages.map(({ description, path, title }) => link(title, path, description)),
		"",
		"## Posts",
		"",
		...posts.map(({ data, id }) => link(data.title, `/posts/${id}/`, data.description)),
		"",
	].join("\n");

	return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
