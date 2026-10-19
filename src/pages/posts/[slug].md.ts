import type { CollectionEntry } from "astro:content";
import type { APIContext, GetStaticPaths } from "astro";
import { getAllPosts, postToMarkdown } from "@/data/post";

export const getStaticPaths = (async () => {
	const posts = await getAllPosts();
	return posts.map((post) => ({ params: { slug: post.id }, props: { post } }));
}) satisfies GetStaticPaths;

export const GET = ({ props, site }: APIContext<{ post: CollectionEntry<"post"> }>) => {
	if (!site) throw new Error("Markdown posts need `site` set in astro.config.ts");
	return new Response(postToMarkdown(props.post, site), {
		headers: { "Content-Type": "text/markdown; charset=utf-8" },
	});
};
