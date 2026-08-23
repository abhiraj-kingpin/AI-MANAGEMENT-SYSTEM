# AI Management System — Documentation Index

These are the original architecture and design documents, written before implementation began. They describe the intended system design; where the shipped system has since evolved or simplified something, that's documented in each project's own README (`## Known Simplifications & Future Work` in [backend/README.md](../backend/README.md)) and in the root [CHANGELOG.md](../CHANGELOG.md), which are the current source of truth for what's actually built.

1. [Software Architecture](architecture/01-software-architecture.md) — component diagram, layering, cross-cutting concerns, NFRs
2. [ER Diagram](architecture/02-er-diagram.md) — entities, relationships, cardinalities
3. [Database Schema](architecture/03-database-schema.md) — every collection, fields, indexes, validation
4. [API Documentation](architecture/04-api-documentation.md) — all REST endpoints, request/response samples
5. [Folder Structure](architecture/05-folder-structure.md) — full repo tree for all three projects
6. [Tech Stack Justification](architecture/06-tech-stack-justification.md) — choices vs. alternatives, why
7. [Authentication Flow](architecture/07-authentication-flow.md) — JWT/refresh strategy, RBAC matrix
8. [Sequence Diagrams](architecture/08-sequence-diagrams.md) — GPS/QR/Face attendance, offline sync, leave, payroll, notifications
9. [Deployment Architecture](architecture/09-deployment-architecture.md) — Render/Vercel/Atlas topology, CI/CD, scaling path

See the [project README](../README.md) for the current feature set and getting-started steps.
