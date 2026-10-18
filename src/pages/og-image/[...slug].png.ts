import { getAllPosts } from "@/data/post";
import { siteConfig } from "@/site-config";
import { getFormattedDate } from "@/utils/date";
import { monogramSvg } from "@/utils/monogram";
import { renderOgImage } from "@/utils/og";
import type { APIContext, InferGetStaticPropsType } from "astro";
import { html } from "satori-html";

// satori-html escapes interpolated markup, so the SVG goes in as an image
const monogramSrc = `data:image/svg+xml;base64,${Buffer.from(monogramSvg(60)).toString("base64")}`;

const markup = (title: string, pubDate: string) =>
	html`<div tw="flex flex-col w-full h-full bg-[#1d1f21] text-[#c9cacc]">
		<div tw="flex flex-col flex-1 w-full p-10 justify-center">
			<p tw="text-2xl mb-6">${pubDate}</p>
			<h1 tw="text-6xl font-bold leading-snug text-white">${title}</h1>
		</div>
		<div tw="flex items-center justify-between w-full p-10 border-t border-[#2bbc89] text-xl">
			<div tw="flex items-center">
				<img src="${monogramSrc}" width="60" height="60" />
				<p tw="ml-3 font-semibold">${siteConfig.title}</p>
			</div>
			<p>by ${siteConfig.author}</p>
		</div>
	</div>`;

type Props = InferGetStaticPropsType<typeof getStaticPaths>;

export async function GET(context: APIContext) {
	const { pubDate, title } = context.props as Props;

	const postDate = getFormattedDate(pubDate, {
		month: "long",
		weekday: "long",
	});
	return renderOgImage(markup(title, postDate));
}

export async function getStaticPaths() {
	const posts = await getAllPosts();
	return posts
		.filter(({ data }) => !data.ogImage)
		.map((post) => ({
			params: { slug: post.id },
			props: {
				pubDate: post.data.updatedDate ?? post.data.publishDate,
				title: post.data.title,
			},
		}));
}
