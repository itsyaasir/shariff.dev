import rss from "@astrojs/rss";
import { getAllPosts } from "@/data/post";
import { siteConfig, socialLinks } from "@/site-config";

const email = socialLinks
	.find(({ friendlyName }) => friendlyName === "Mail")
	?.link.replace("mailto:", "");

export const GET = async () => {
	const posts = await getAllPosts();

	return rss({
		title: siteConfig.title,
		description: siteConfig.description,
		site: import.meta.env.SITE,
		xmlns: { atom: "http://www.w3.org/2005/Atom" },
		items: posts.map((post) => ({
			title: post.data.title,
			description: post.data.description,
			pubDate: post.data.publishDate,
			link: `posts/${post.id}/`,
			author: email && `${email} (${siteConfig.author})`,
			categories: post.data.tags,
			...(post.data.updatedDate && {
				customData: `<atom:updated>${post.data.updatedDate.toISOString()}</atom:updated>`,
			}),
		})),
	});
};
