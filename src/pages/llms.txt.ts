import type { APIContext } from "astro";
import { llmsFacts, llmsPages } from "@/data/llms";
import { getAllPosts, sortMDByDate } from "@/data/post";
import { siteConfig } from "@/site-config";

// https://llmstxt.org: a Markdown map of the site for language models
export const GET = async ({ site }: APIContext) => {
	if (!site) throw new Error("llms.txt needs `site` set in astro.config.ts");
	const posts = sortMDByDate(await getAllPosts());
	const url = (path: string) => new URL(path, site).href;
	const link = (title: string, path: string, description: string) =>
		`- [${title}](${url(path)}): ${description}`;

	const body = [
		`# ${siteConfig.title}`,
		"",
		`> ${siteConfig.description}`,
		"",
		...llmsFacts(site),
		"",
		`Every post is also available as Markdown at the same URL with \`.md\` in place of the trailing slash, and all of them together at ${url("/llms-full.txt")}.`,
		"",
		"## Pages",
		"",
		...llmsPages.map(({ description, path, title }) => link(title, path, description)),
		"",
		"## Posts",
		"",
		...posts.map(
			({ data, id }) =>
				`${link(data.title, `/posts/${id}/`, data.description)} [Markdown](${url(`/posts/${id}.md`)})`,
		),
		"",
		"## Optional",
		"",
		link("Full text", "/llms-full.txt", "Every post in one Markdown file"),
		link("RSS feed", "/rss.xml", "New posts as they are published"),
		link("Tags", "/tags/", "Posts grouped by topic"),
		"",
	].join("\n");

	return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
