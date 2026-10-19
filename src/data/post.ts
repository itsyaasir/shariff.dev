import { type CollectionEntry, getCollection } from "astro:content";
import { siteConfig } from "@/site-config";

/** filter out draft posts based on the environment */
export async function getAllPosts() {
	return await getCollection("post", ({ data }) => {
		return import.meta.env.PROD ? !data.draft : true;
	});
}

/** returns the date of the post based on option in siteConfig.sortPostsByUpdatedDate */
export function getPostSortDate(post: CollectionEntry<"post">) {
	return siteConfig.sortPostsByUpdatedDate && post.data.updatedDate !== undefined
		? new Date(post.data.updatedDate)
		: new Date(post.data.publishDate);
}

/** sort post by date (by siteConfig.sortPostsByUpdatedDate), desc.*/
export function sortMDByDate(posts: CollectionEntry<"post">[]) {
	return posts.sort((a, b) => {
		const aDate = getPostSortDate(a).valueOf();
		const bDate = getPostSortDate(b).valueOf();
		return bDate - aDate;
	});
}

/** groups posts by year (based on option siteConfig.sortPostsByUpdatedDate), using the year as the key
 *  Note: This function doesn't filter draft posts, pass it the result of getAllPosts above to do so.
 */
export function groupPostsByYear(posts: CollectionEntry<"post">[]) {
	return posts.reduce<Record<string, CollectionEntry<"post">[]>>((acc, post) => {
		const year = getPostSortDate(post).getUTCFullYear();
		if (!acc[year]) {
			acc[year] = [];
		}
		acc[year]?.push(post);
		return acc;
	}, {});
}

/** returns all tags created from posts (inc duplicate tags)
 *  Note: This function doesn't filter draft posts, pass it the result of getAllPosts above to do so.
 *  */
export function getAllTags(posts: CollectionEntry<"post">[]) {
	return posts.flatMap((post) => [...post.data.tags]);
}

/** returns all unique tags created from posts
 *  Note: This function doesn't filter draft posts, pass it the result of getAllPosts above to do so.
 *  */
export function getUniqueTags(posts: CollectionEntry<"post">[]) {
	return [...new Set(getAllTags(posts))];
}

/** returns a count of each unique tag - [[tagName, count], ...]
 *  Note: This function doesn't filter draft posts, pass it the result of getAllPosts above to do so.
 *  */
export function getUniqueTagsWithCount(posts: CollectionEntry<"post">[]): [string, number][] {
	return [
		...getAllTags(posts).reduce(
			(acc, t) => acc.set(t, (acc.get(t) ?? 0) + 1),
			new Map<string, number>(),
		),
	].sort((a, b) => b[1] - a[1]);
}

/** renders a post as standalone Markdown */
export function postToMarkdown(post: CollectionEntry<"post">, site: URL) {
	const { description, publishDate, tags, title, updatedDate } = post.data;
	const day = (date: Date) => date.toISOString().slice(0, 10);
	return [
		`# ${title}`,
		"",
		`> ${description}`,
		"",
		`- Author: ${siteConfig.author}`,
		`- Published: ${day(publishDate)}`,
		...(updatedDate ? [`- Updated: ${day(updatedDate)}`] : []),
		`- URL: ${new URL(`/posts/${post.id}/`, site).href}`,
		`- Tags: ${tags.join(", ")}`,
		"",
		post.body?.trim() ?? "",
		"",
	].join("\n");
}

/** returns up to `limit` posts sharing the most tags with `post`, newest first on ties
 *  Note: This function doesn't filter draft posts, pass it the result of getAllPosts above to do so.
 *  */
export function getRelatedPosts(
	post: CollectionEntry<"post">,
	posts: CollectionEntry<"post">[],
	limit = 3,
) {
	const tags = new Set(post.data.tags);
	return sortMDByDate(posts.filter(({ id }) => id !== post.id))
		.map((other) => ({
			other,
			shared: other.data.tags.filter((tag) => tags.has(tag)).length,
		}))
		.filter(({ shared }) => shared > 0)
		.sort((a, b) => b.shared - a.shared)
		.slice(0, limit)
		.map(({ other }) => other);
}
