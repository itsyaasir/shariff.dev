# AGENTS.md

Personal site and blog for Yasir Shariff (https://shariff.dev). Static Astro site, originally the Astro Cactus template; comments mentioning "cactus" are template leftovers.

## Verify

- `pnpm build` is the gate CI runs on PRs to `main`: `astro check`, then `astro build`, then Pagefind indexing (`postbuild`). There are no tests.
- Search works only on a built site. To check search or other production-only behaviour, run `pnpm build`, then the `astro-preview` config in `.claude/launch.json` (`pnpm preview`, port 4321). `pnpm dev` is for everything else.
- Drafts (`draft: true`) render in dev and are dropped in production builds.

## Formatting

- `pnpm format` before committing. Biome formats TS/JS/JSON/CSS; Prettier formats `.astro`, which Biome skips. `pnpm lint` (Biome) also skips `.astro`.
- `pnpm format` leaves Markdown alone. Write post prose one paragraph per line.
- Import via the path aliases in `tsconfig.json`. The config alias is `@/site-config`, not the file name.

## Blog posts

Posts live in `src/content/post/<slug>.md`; the slug becomes `/posts/<slug>/`. `src/content.config.ts` holds the schema; the build fails on a `title` over 80 chars or a `description` outside 50–160 chars.

Conventions the existing posts follow:

- `publishDate` as a quoted string: `"18 October 2026"`. Tags are lowercase kebab-case, `rust` first for Rust posts.
- One `> **Personal Note**:` blockquote near the top.
- `##` headings in Title Case, phrased as actions ("Split Mutable Data Before Spawning").
- Link other posts by root-relative path with trailing slash: `/posts/<slug>/`.
- End with a `## Further Reading` list of links.
- Callouts use directives: `:::tip`, `:::note`, `:::important`, `:::caution`, `:::warning`.

Each post gets an OG image generated at `/og-image/<slug>.png`; set `ogImage` only to override it.

## Site-wide changes

- Nav links: `menuLinks` in `src/site.config.ts`.
- Social card for a non-post page: add an entry to `cards` in `src/pages/social-card/[card].png.ts`, then set `ogImage: "/social-card/<card>.png"` in the page's meta, as `src/pages/consulting.astro` does.
- Favicons and app icons in `public/` are generated: edit `src/utils/monogram.ts`, then run `pnpm icons`.
- Analytics: tag links that matter with `data-umami-event="<kebab-name>"` plus `data-umami-event-<prop>` attributes, as in `src/pages/index.astro`. Umami and GA load only when their env vars are set.

## Environment

- New env vars go in the `env.schema` in `astro.config.ts` and in `.env.example`.
- `.env` is gitignored and holds local values only. Deployed builds read env vars from the host's settings, `PUBLIC_GA_ID` included.

## Git

Conventional commits: `feat:`, `fix:`, `chore:`, imperative and lowercase after the prefix. Branch, then open a PR to `main`.
