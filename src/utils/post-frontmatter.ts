// Shared by src/content.config.ts and astro.config.ts, so it must not import astro:content or path aliases.

/** Tag pages listing fewer posts than this get noindex and stay out of the sitemap. */
export const MIN_POSTS_TO_INDEX_TAG = 2;

/**
 * Reads a frontmatter date like "19 December 2024" as midnight UTC on that calendar day.
 * `new Date(str)` alone uses the build machine's timezone, so a UTC+3 build would publish the 18th.
 */
export function parsePostDate(value: string | Date): Date {
	const date = new Date(value);
	return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}
