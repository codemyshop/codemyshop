# Contributing to CodeMyShop

Thanks for considering a contribution. CodeMyShop is **AGPL-3.0** open source and we welcome PRs.

## Code of conduct

By participating, you agree to abide by the [Contributor Covenant 2.1](CODE_OF_CONDUCT.md).

## Quick links

- 🐛 **Found a bug?** Open a [bug issue](https://github.com/codemyshop/codemyshop/issues/new?template=bug_report.md)
- 💡 **Have a feature idea?** Open a [feature issue](https://github.com/codemyshop/codemyshop/issues/new?template=feature_request.md)
- ❓ **Have a question?** Use [GitHub Discussions](https://github.com/codemyshop/codemyshop/discussions)
- 🔒 **Security issue?** See [SECURITY.md](SECURITY.md). **Do not open a public issue.**

## Development setup

```bash
git clone https://github.com/codemyshop/codemyshop.git
cd codemyshop
cp .env.example .env  # edit credentials
docker compose -f deploy/docker-compose.dev.yml up -d  # PG + Redis
npm install
npm run db:migrate
npm run db:seed:demo
npm run dev
```

## Branch model

- `main` — stable releases. Protected, no direct pushes.
- `next` — preview / staging for upcoming releases.
- Feature branches: `feat/short-name`, `fix/short-name`, `docs/short-name`. Branch from `next`.

## Commits

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(domain): add X feature
fix(domain): resolve Y bug
docs: update INSTALL.md
chore(deps): bump nuxt to 4.1.0
refactor(core): simplify Z helper
test(domain): cover edge case W
```

Allowed types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `perf`, `style`, `ci`.

## PR checklist

Before opening a PR:

- [ ] Branch from `next`, not `main`
- [ ] One logical change per PR (small and focused)
- [ ] Tests pass: `npm run test`
- [ ] Lint passes: `npm run lint`
- [ ] Build passes: `npm run build`
- [ ] Conventional commit message
- [ ] Updated [CHANGELOG.md](CHANGELOG.md) under `## [Unreleased]`
- [ ] Updated docs if behavior changes
- [ ] No secrets or credentials in diff
- [ ] No personal paths or tenant names in diff

We use **DCO** (Developer Certificate of Origin) — sign your commits with `git commit -s`.

## Code style

- **TypeScript**: ESLint + Prettier (config in repo). Run `npm run lint:fix`.
- **Vue**: SFC with `<script setup lang="ts">`. Composition API only.
- **SQL via Drizzle ORM**, never raw concatenation. Raw SQL only via tagged template `sql\`...\`` for complex queries.
- **Façade pattern**: domain logic lives in `core/modules/{domain}/server/utils/{domain}.ts`. Endpoints in `core/server/api/` are thin wrappers calling the façade.
- **No silent catches**: log every error with module context. Don't swallow exceptions.
- **No magic strings**: use enums or const objects.

## Testing

- **Unit**: Vitest for pure functions and façades. Place tests next to the file: `bank.ts` + `bank.spec.ts`.
- **Integration**: Vitest with a real PG container (set `TEST_PG_URL` in CI).
- **End-to-end**: Playwright for critical user paths (storefront purchase, hub login). In `tests/e2e/`.

Aim for ≥ 70 % coverage on new code. Don't break existing tests.

## Naming convention

- **Tables**: `cs_<entity>` (singular). i18n via `cs_<entity>_lang` with composite primary key `(id_<entity>, id_lang)`.
- **Modules**: kebab-case folder name, no prefix (e.g. `core/modules/bank/`, `core/modules/faq/`, `core/modules/quote-request/`). Each module exposes a façade at `core/modules/<domain>/server/utils/<domain>.ts`.
- **Files**: kebab-case (`ae-client.ts`, `monthly-report.vue`).
- **Drizzle schemas**: one file per entity at `core/server/db/schema-pg/<entity>.ts` (e.g. `theme.ts` defines `cs_theme` and `cs_theme_lang`).

See [documentation/NAMING.md](documentation/NAMING.md) for the full naming policy.

## Reviewing PRs

PRs require **one maintainer review** + **green CI**. We aim to respond within 7 days. Larger PRs may take longer.

Maintainers may:

- Request changes (you address them and re-request review)
- Suggest splitting into smaller PRs
- Close the PR with explanation if it doesn't fit the roadmap (please open a discussion first for large features)

## License

By submitting a PR, you agree that your contribution is licensed under [AGPL-3.0](LICENSE) and that you have the right to submit it under the [DCO](https://developercertificate.org/).

## Questions?

Open a [GitHub Discussion](https://github.com/codemyshop/codemyshop/discussions) or reach out on Discord (link coming soon).

Thank you for making CodeMyShop better. 🇫🇷
