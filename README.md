# Paragon

*Repetition is the mother of learning, the father of action, which makes it the architect of accomplishment*

Build systems that survive your worst days. Log daily. Review weekly.

**Website:** [paragons.pages.dev](https://paragons.pages.dev)

**Implementation status:** Current

---

## Tech Stack (Current)

| Layer | Choice | Status |
|---|---|---|
| Frontend | SvelteKit (CSR/SPA) + Tailwind CSS | Active |
| Backend API | Hono (TypeScript) on Cloudflare Workers | Active (auth + systems CRUD + AI draft) |
| Primary database | Cloudflare D1 (SQLite) | Active |
| File storage | Cloudflare R2 | Active (file attachments) |
| Auth | Better Auth (self-hosted on D1) | Active |
| AI | Workers AI (`@cf/deepseek-ai/deepseek-r1-distill-qwen-32b`) | Active (system draft endpoint) |
| Scheduling | Cloudflare Cron Triggers | Active (nightly instance pre-generation) |
| Message queue | Cloudflare Queues | Active (journal retry) |
| Secondary database | MongoDB Atlas (journal/reflections only) | Active (journal writes + queue fallback) |
| Monorepo | pnpm workspaces | Active |

## Tech Stack (Planned)

## Documentation

### Current

- [AGENTS.md](AGENTS.md): coding conventions and tooling
- [Implementation Plan (P0)](docs/plans/implementation-plan-p0.md): P0 feature build plan
- [Implementation Plan (P1)](docs/plans/implementation-plan-p1.md): P1 feature build plan

### Reference Documentation

- [Product Requirements Document](docs/PRD/PRD-systems-app.md)
- [Tech Stack ADR](docs/ADRs/001-tech-stack-adr.md)
- [D1 Schema](docs/ADRs/002-d1-schema.md)
- [MongoDB Schema](docs/ADRs/003-mongodb-schema.md)
- [API Route Design](docs/reference/api-routes.md)
- [Auth Integration](docs/reference/auth-integration.md)
- [SvelteKit Route Architecture](docs/reference/sveltekit-route-architecture.md)
- [AI Workers Reference](docs/reference/ai-workers.md)
- [Security Review](docs/reference/security-review.md)
- [CI/CD & Deployment](docs/reference/cicd-deploy.md)
- [Testing Strategy](docs/reference/testing-strategy.md)
- [Observability](docs/reference/observability.md)
- [Disaster Recovery](docs/reference/disaster-recovery.md)
- [Definition of Done](docs/reference/definition-of-done.md)
- [Systems Framework](docs/core/systems-framework.md)
- [Research Insights](docs/core/insights.md)
- [Sources](docs/core/sources.md)
