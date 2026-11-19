@AGENTS.md

# Reglas de trabajo para sesiones de Claude en la nube

Estas reglas aplican a las sesiones de Claude Code en la nube (claude.ai/code), que trabajan en ramas `claude/*`. La sesión de Antigravity, que trabaja sobre `main` en la computadora principal, no se rige por esta sección.

- **Solo código, nunca la base de datos.** Existe una única base de datos (producción). Desde estas sesiones no se conecta a ella, no se ejecutan migraciones, `prisma db push`, seeds ni scripts que escriban datos, y no se piden ni cargan variables de entorno de Supabase o de la base.
- **No modificar `prisma/schema.prisma` ni `prisma/migrations/`.** Si una mejora necesita un cambio de base de datos (columnas, índices, tablas, constraints, datos, políticas de Supabase), no se aplica acá: se documenta en `docs/pendientes-bd.md` con instrucciones paso a paso para hacerlo desde la sesión de Antigravity en `main`.
- **Cómo se verifica el trabajo, sin base de datos:**
  - `npx next typegen && npx tsc --noEmit` (tipos)
  - `npx eslint` (lint)
  - revisión de la lógica y, si se agregan, tests de funciones puras que no tocan la base.
- El código que dependa de un cambio pendiente en la base no se mergea a `main` hasta que ese cambio esté aplicado.
