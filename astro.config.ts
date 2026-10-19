import fs from "node:fs";
import { parseFrontmatter, unified } from "@astrojs/markdown-remark";
import mdx from "@astrojs/mdx";
import partytown from "@astrojs/partytown";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, envField } from "astro/config";
import expressiveCode from "astro-expressive-code";
import icon from "astro-icon";
import rehypeExternalLinks from "rehype-external-links";
import rehypeUnwrapImages from "rehype-unwrap-images";
import remarkDirective from "remark-directive"; /* Handle ::: directives as nodes */
import { remarkAdmonitions } from "./src/plugins/remark-admonitions"; /* Add admonitions */
import { remarkReadingTime } from "./src/plugins/remark-reading-time";
import { expressiveCodeOptions } from "./src/site.config";
import { MIN_POSTS_TO_INDEX_TAG, parsePostDate } from "./src/utils/post-frontmatter";

const site = "https://shariff.dev/";
const sitemapData = readSitemapData();

// https://astro.build/config
export default defineConfig({
	env: {
		schema: {
			// Google Analytics 4 measurement ID; GA is skipped when unset
			PUBLIC_GA_ID: envField.string({ access: "public", context: "client", optional: true }),
			// Self-hosted Umami; tracking is skipped unless both are set
			PUBLIC_UMAMI_SCRIPT_URL: envField.string({
				access: "public",
				context: "client",
				optional: true,
				url: true,
			}),
			PUBLIC_UMAMI_WEBSITE_ID: envField.string({
				access: "public",
				context: "client",
				optional: true,
			}),
		},
	},
	image: {
		domains: ["webmention.io"],
	},
	integrations: [
		expressiveCode(expressiveCodeOptions),
		icon(),
		sitemap({
			filter: (page) => !sitemapData.thinTagPages.has(page),
			serialize(item) {
				const lastmod = sitemapData.lastmod.get(item.url);
				return lastmod ? { ...item, lastmod } : item;
			},
		}),
		mdx(),
		partytown({
			config: {
				forward: ["dataLayer.push"],
			},
		}),
	],
	markdown: {
		processor: unified({
			rehypePlugins: [
				rehypeUnwrapImages,
				[
					rehypeExternalLinks,
					{
						rel: ["noreferrer"],
						target: "_blank",
					},
				],
			],
			remarkPlugins: [remarkReadingTime, remarkDirective, remarkAdmonitions],
			remarkRehype: {
				footnoteLabelProperties: {
					className: [""],
				},
			},
		}),
	},
	// https://docs.astro.build/en/guides/prefetch/
	prefetch: true,
	// Redirects live in public/_redirects so Cloudflare Pages answers with a real 301
	site,
	// Pages build to directories; links without the slash cost a redirect
	trailingSlash: "always",
	vite: {
		optimizeDeps: {
			exclude: ["@resvg/resvg-js"],
		},
		plugins: [tailwindcss(), rawFonts([".ttf", ".woff"])],
	},
});

// astro:content isn't available in the config, so read post frontmatter straight from disk
function readSitemapData() {
	const dir = "./src/content/post";
	const posts = fs
		.readdirSync(dir)
		.filter((file) => /\.mdx?$/.test(file))
		.map((file) => ({
			data: parseFrontmatter(fs.readFileSync(`${dir}/${file}`, "utf8")).frontmatter,
			slug: file.replace(/\.mdx?$/, ""),
		}))
		.filter(({ data }) => !data.draft);

	const lastmod = new Map<string, string>();
	const tagCounts = new Map<string, number>();
	for (const { data, slug } of posts) {
		lastmod.set(
			new URL(`/posts/${slug}/`, site).href,
			parsePostDate(data.updatedDate ?? data.publishDate).toISOString(),
		);
		const tags = new Set<string>((data.tags ?? []).map((tag: string) => tag.toLowerCase()));
		for (const tag of tags) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
	}

	const thinTagPages = new Set(
		[...tagCounts]
			.filter(([, count]) => count < MIN_POSTS_TO_INDEX_TAG)
			.map(([tag]) => new URL(`/tags/${tag}/`, site).href),
	);
	return { lastmod, thinTagPages };
}

function rawFonts(ext: string[]) {
	return {
		name: "vite-plugin-raw-fonts",
		// @ts-expect-error:next-line
		transform(_, id) {
			if (ext.some((e) => id.endsWith(e))) {
				const buffer = fs.readFileSync(id);
				return {
					code: `export default ${JSON.stringify(buffer)}`,
					map: null,
				};
			}
		},
	};
}
