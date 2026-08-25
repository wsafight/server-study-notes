# Server Study Notes

[简体中文](./README.zh-CN.md)

A collection of practical server-side engineering notes, published as an
[Astro Starlight](https://starlight.astro.build/) site. The notes focus on
database internals, production operations, network protocols, reliability,
performance analysis, and common failure modes.

Online documentation: <https://wsafight.github.io/server-study-notes/>

## Topics

- **MySQL:** data modeling, indexing, transactions, replication, recovery, and
  online schema changes
- **Linux:** systematic troubleshooting across CPU, memory, disk, network, and
  systemd services
- **Networking and HTTP:** TCP, DNS, HTTP, TLS, reverse proxies, and load
  balancing
- **Service reliability:** SLOs, observability, retries, idempotency, overload
  protection, graceful shutdown, and incident response
- **Redis:** data structures, cache consistency, persistence, high availability,
  distributed locks, and memory diagnostics
- **PostgreSQL:** data modeling, transactions, planner statistics, indexes,
  partitioning, JSONB, observability, migrations, recovery, and security
- **DuckDB:** analytical SQL, Parquet layout, object storage, concurrency,
  PostgreSQL integration, and reproducible data pipelines

Each topic has a dedicated learning path:

- [MySQL](https://wsafight.github.io/server-study-notes/mysql/)
- [Linux](https://wsafight.github.io/server-study-notes/linux/)
- [Networking and HTTP](https://wsafight.github.io/server-study-notes/network/)
- [Service Reliability](https://wsafight.github.io/server-study-notes/reliability/)
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

## Documentation

Only Markdown under `src/content/docs/` is published. Each topic's `index.md`
defines its learning path, `astro.config.mjs` defines the sidebar, and the
top-level `docs/` directory is an unpublished historical archive.

Read the [contribution and writing guide](./CONTRIBUTING.md) before adding,
revising, or migrating an article. It defines article structure, version and
safety notes, navigation updates, and pre-submission checks.

## Project Structure

```text
.
|-- public/                     # Static assets copied as-is
|-- src/content/docs/           # Published Markdown documentation
|-- src/content.config.ts       # Starlight content collection
|-- src/styles/custom.css       # Site-specific styles
|-- docs/README.md              # Status of unpublished legacy notes
|-- CONTRIBUTING.md             # Contribution and documentation standards
|-- astro.config.mjs            # Site, navigation, and plugin configuration
|-- bun.lock                    # Bun dependency lockfile
`-- .github/workflows/docs.yml  # GitHub Pages deployment workflow
```

## Dependency Notes

Check releases with `bun outdated`, then upgrade packages explicitly with
`bun update --latest <package>`. TypeScript currently stays on the Astro Check
compatible 6.x line. Run a frozen install and full build after every update.

## Deployment

Pushes to `main` trigger the GitHub Pages workflow. It installs dependencies
with Bun, builds the site with Node.js 24 available, uploads `dist/`, and
deploys the generated pages.

## License

[MIT](./LICENSE)
