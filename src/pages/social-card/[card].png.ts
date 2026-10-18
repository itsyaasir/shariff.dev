import { siteConfig } from "@/site-config";
import { renderOgImage } from "@/utils/og";
import type { APIContext, InferGetStaticPropsType } from "astro";
import { html } from "satori-html";

// Social cards for pages that aren't posts. "default" is the fallback in BaseHead.astro
const cards = {
	default: {
		eyebrow: "Software Engineer · Nairobi",
		title: siteConfig.author,
		subtitle: "Rust, blockchain infrastructure, and distributed systems.",
		url: "shariff.dev",
	},
	consulting: {
		eyebrow: "Consulting",
		title: "I build software that has to be correct and stay up.",
		subtitle: "Rust, blockchain infrastructure, and distributed backends.",
		url: "shariff.dev/consulting",
	},
};

type Props = InferGetStaticPropsType<typeof getStaticPaths>;

const markup = ({ eyebrow, title, subtitle, url }: Props) =>
	html`<div tw="flex flex-col w-full h-full bg-[#1d1f21] text-[#c9cacc]">
		<div tw="flex flex-col flex-1 w-full p-10 justify-center">
			<p tw="text-2xl mb-6 text-[#2bbc89]">${eyebrow}</p>
			<h1 tw="text-6xl font-bold leading-snug text-white">${title}</h1>
			<p tw="text-3xl mt-6">${subtitle}</p>
		</div>
		<div tw="flex items-center justify-between w-full p-10 border-t border-[#2bbc89] text-xl">
			<p tw="font-semibold">${siteConfig.author}</p>
			<p>${url}</p>
		</div>
	</div>`;

export async function GET(context: APIContext) {
	return renderOgImage(markup(context.props as Props));
}

export function getStaticPaths() {
	return Object.entries(cards).map(([card, props]) => ({ params: { card }, props }));
}
