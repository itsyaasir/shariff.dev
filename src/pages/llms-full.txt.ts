import type { APIContext } from "astro";
import { llmsFacts } from "@/data/llms";
import { getAllPosts, postToMarkdown, sortMDByDate } from "@/data/post";
import { siteConfig } from "@/site-config";

export const GET = async ({ site }: APIContext) => {
	if (!site) throw new Error("llms-full.txt needs `site` set in astro.config.ts");
	const posts = sortMDByDate(await getAllPosts());

	const body = [
		[`# ${siteConfig.title}`, "", `> ${siteConfig.description}`, "", ...llmsFacts(site), ""].join(
			"\n",
		),
		...posts.map((post) => postToMarkdown(post, site)),
	].join("\n---\n\n");

	return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
