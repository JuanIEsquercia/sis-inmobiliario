# Sistema Inmobiliario — Garcia Propiedades

Sitio público de propiedades alimentado por el feed XML de Adinco, con una
capa de base de datos propia (Postgres/Supabase) pensada para crecer hacia
un sistema de gestión interno (contratos, pagos, pedidos).

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Prisma + Postgres (Supabase)
- Sincronización del feed: `src/lib/sync.ts` / `scripts/sync-feed.ts` / `POST /api/sync`

## Desarrollo

```bash
npm install
cp .env.example .env   # completar DATABASE_URL, DIRECT_URL, ADINCO_FEED_URL, SYNC_SECRET
npx prisma migrate dev
npm run sync            # trae las propiedades reales del feed a la base
npm run dev
```

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Levanta el sitio en modo desarrollo |
| `npm run sync` | Sincroniza la base con el feed de Adinco (solo reprocesa si cambió) |
| `npm run db:migrate` | Corre migraciones de Prisma |
| `npm run db:studio` | Abre Prisma Studio para inspeccionar la base |
