# p1-retail-sales-backend

API REST del Sistema de Gestión de Ventas al Detal — Proyecto 1 del Programa de Portafolio Técnico.

## Propósito

Backend transaccional que expone la API consumida por `p1-frontend`. Gestiona clientes, productos, categorías, ventas e inventario, con autenticación y autorización granular por acción.

## Stack

- **Framework:** NestJS + TypeScript
- **Base de datos:** PostgreSQL en [Neon](https://neon.tech)
- **ORM:** Prisma
- **Autenticación:** JWT + Passport, bcrypt para passwords
- **Autorización:** RBAC por permiso (`clientes:crear`, `clientes:eliminar`, etc.), agrupados en roles `admin` y `vendedor`
- **Despliegue:** [Render](https://render.com), free tier

## Decisiones de arquitectura

Uso un monolito modular por capas: cada módulo de dominio (Clientes, Productos, Categorías, Ventas, Inventario, Auth) tiene su propio Controller, Service, Repository y DTOs. Evalué Clean Architecture completa, pero para un primer proyecto de portafolio resultaba sobre-ingeniería — esta estructura ya deja el terreno preparado para migrar hacia allá en un proyecto futuro si el dominio lo justifica.

La autorización la resolví por permiso de acción en vez de por rol genérico, porque reglas como "solo admin puede eliminar clientes" no se pueden expresar bien con un guard binario por módulo — necesitaba algo más granular.

Estas y otras decisiones de arquitectura del proyecto están respaldadas en un análisis previo (P1-AD) con alternativas evaluadas y criterios explícitos.

## Ejecución local

```bash
npm install
npx prisma generate
npm run start:dev
```

Necesita un `.env` local (ver `.env.example`) con `DATABASE_URL` y `DIRECT_URL` apuntando a Postgres en Neon.

## Base de datos

Postgres en Neon, con Prisma como ORM. Hay dos connection strings porque las migraciones necesitan conexión directa a la base de datos: `DATABASE_URL` (con pooling, la que usa la app en runtime) y `DIRECT_URL` (sin pooling, solo para migraciones).

El esquema define el bloque de autenticación/autorización: `Usuario`, `Rol`, `Permiso` (con tabla intermedia `RolPermiso` para la relación N:M). Resto de modelos de dominio (Clientes, Productos, Categorías, Ventas, Inventario) pendientes — ver historial de commits.

## Despliegue

Desplegado en Render (free tier). Ojo: si nadie lo usa por 15 minutos se duerme, y el próximo request tarda hasta 50 segundos en despertar.

## Estado del proyecto

En construcción — ver historial de commits.