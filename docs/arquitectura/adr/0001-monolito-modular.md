# ADR-0001 — Monolito modular
Fecha: 2026-10-12
Estado: aprobado
Contexto: MVP pequeño, desarrollo autónomo con Codex y VPS de bajo costo.
Decisión: Next.js App Router/TypeScript con módulos de negocio aislados y PostgreSQL; desplegar en Linux con Docker Compose.
Consecuencias: simplicidad operativa y una sola base de código, pero exigir límites modulares y pruebas. Evitar microservicios y acoplamiento directo del dominio con APIs/ORM.
