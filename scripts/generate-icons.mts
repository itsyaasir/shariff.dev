// Regenerates the favicons and app icons in public/ from src/utils/monogram.ts.
// Run with `pnpm icons` after changing the monogram.
import { writeFileSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";
import { monogram, monogramSvg } from "../src/utils/monogram.ts";

const publicDir = new URL("../public/", import.meta.url);

const toPng = (svg: string, size: number) =>
	new Resvg(svg, { fitTo: { mode: "width", value: size } }).render().asPng();

// iOS masks its own rounded corners, so the touch icon is a full-bleed tile
const { glyphs, cursor, tile } = monogram;
const fullBleedSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${monogram.viewBox}"><rect width="64" height="64" fill="${tile.fill}"/><path d="${glyphs.d}" fill="${glyphs.fill}"/><rect x="${cursor.x}" y="${cursor.y}" width="${cursor.width}" height="${cursor.height}" fill="${cursor.fill}"/></svg>`;

// ICO container holding PNG images, which every current browser accepts
function toIco(images: Array<{ size: number; png: Buffer }>) {
	const header = Buffer.alloc(6);
	header.writeUInt16LE(1, 2);
	header.writeUInt16LE(images.length, 4);
	let offset = 6 + images.length * 16;
	const entries = images.map(({ size, png }) => {
		const entry = Buffer.alloc(16);
		entry.writeUInt8(size % 256, 0);
		entry.writeUInt8(size % 256, 1);
		entry.writeUInt16LE(1, 4);
		entry.writeUInt16LE(32, 6);
		entry.writeUInt32LE(png.length, 8);
		entry.writeUInt32LE(offset, 12);
		offset += png.length;
		return entry;
	});
	return Buffer.concat([header, ...entries, ...images.map(({ png }) => png)]);
}

const svg = monogramSvg(64);
writeFileSync(new URL("icon.svg", publicDir), `${svg}\n`);
writeFileSync(new URL("192x192.png", publicDir), toPng(svg, 192));
writeFileSync(new URL("512x512.png", publicDir), toPng(svg, 512));
writeFileSync(new URL("apple-touch-icon.png", publicDir), toPng(fullBleedSvg, 180));
writeFileSync(
	new URL("favicon.ico", publicDir),
	toIco([16, 32, 48].map((size) => ({ size, png: toPng(svg, size) }))),
);
