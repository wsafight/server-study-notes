# Server Study Notes

[简体中文](./README.zh-CN.md)

A collection of practical server-side engineering notes, published as an
[Astro Starlight](https://starlight.astro.build/) site. The notes focus on
database internals, production operations, performance analysis, and common
failure modes.

Online documentation: <https://wsafight.github.io/server-study-notes/>

## Topics

- **MySQL:** data modeling, indexing, transactions, replication, recovery, and
  online schema changes
- **Linux:** systematic troubleshooting across CPU, memory, disk, network, and
  systemd services
- **Redis:** data structures, cache consistency, persistence, high availability,
  distributed locks, and memory diagnostics
- **PostgreSQL:** architecture, indexes, query plans, VACUUM, locks, recovery,
  and Pigsty deployments
- **DuckDB:** embedded analytics, file queries, performance, and application
  integration

Each topic has a dedicated learning path:

- [MySQL](https://wsafight.github.io/server-study-notes/mysql/)
- [Linux](https://wsafight.github.io/server-study-notes/linux/)
- [Redis](https://wsafight.github.io/server-study-notes/redis/)
- [PostgreSQL](https://wsafight.github.io/server-study-notes/pgsql/)
- [DuckDB](https://wsafight.github.io/server-study-notes/duck/)

## Requirements

- [Bun](https://bun.sh/) 1.4.0
- Node.js 22.12 or later when running Astro through Node.js. CI uses Node.js 24.

The repository uses Bun exclusively for dependency management. `bun.lock` is
the source of truth for reproducible installs.

## Getting Started

```bash
git clone https://github.com/wsafight/server-study-notes.git
cd server-study-notes
bun install --frozen-lockfile
bun run dev
```

Open <http://localhost:4321/server-study-notes/>.

## Commands

| Command | Description |
| --- | --- |
| `bun run dev` | Start the local development server |
| `bun run build` | Run Astro checks and create the production build |
| `bun run preview` | Preview the production build locally |
| `bun outdated` | Check for dependency updates |

## Writing Notes

1. Add a Markdown file under `src/content/docs/<topic>/`.
2. Include an accurate, concise `title` and `description` in the frontmatter.
3. Explain the problem and scope before documenting diagnosis, examples, risks,
   and verification.
4. Add the slug to the correct learning stage in `astro.config.mjs` so the page
   is not orphaned.
5. Use lowercase fenced-code language identifiers such as `sql`, `bash`, or
   `javascript`.
6. Update the topic's `index.md` learning path when adding a new subject.
7. Run `bun run build` before submitting the change.

Example:

```markdown
---
title: Query Execution Plan
description: Reading and interpreting MySQL EXPLAIN output.
---

## Overview

Document content goes here.
```

Only files in `src/content/docs/` are loaded by the current Starlight content
collection. Each topic's `index.md` defines its learning path, while
`astro.config.mjs` defines the site sidebar. The top-level `docs/` directory
contains legacy notes and is not published by the site.

## Project Structure

```text
.
|-- public/                     # Static assets copied as-is
|-- src/content/docs/           # Published Markdown documentation
|-- src/content.config.ts       # Starlight content collection
|-- src/styles/custom.css       # Site-specific styles
|-- astro.config.mjs            # Site, navigation, and plugin configuration
|-- bun.lock                    # Bun dependency lockfile
`-- .github/workflows/docs.yml  # GitHub Pages deployment workflow
```

## Dependency Notes

Check available releases with `bun outdated`, then upgrade packages explicitly
with `bun update --latest <package>`. TypeScript is pinned to the latest
compatible 6.x release because `astro check` does not currently support the
TypeScript 7 programmatic API. Keep TypeScript on 6.x and run `bun run build`
after every dependency update.

## Deployment

Pushes to `main` trigger the GitHub Pages workflow. It installs dependencies
with Bun, builds the site with Node.js 24 available, uploads `dist/`, and
deploys the generated pages.

## License

[MIT](./LICENSE)
