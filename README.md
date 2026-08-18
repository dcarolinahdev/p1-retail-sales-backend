# p1-retail-sales-backend

API REST del Sistema de Gestión de Ventas al Detal — Proyecto 1 del Programa de Portafolio Técnico.

## Propósito

Backend transaccional que expone la API consumida por `p1-frontend`. Gestiona clientes, productos, categorías, ventas e inventario, con autenticación y autorización granular por acción (no solo por rol).

## Stack

- **Framework:** NestJS + TypeScript
- **Base de datos:** PostgreSQL (alojada en [Neon](https://neon.tech))
- **ORM:** Prisma
- **Autenticación:** JWT + Passport, contraseñas con bcrypt
- **Autorización:** RBAC por permiso de acción (ej. `clientes:crear`, `clientes:eliminar`), no solo por rol
- **Despliegue:** [Render](https://render.com) (free tier)

## Decisiones de arquitectura

El backend sigue un **monolito modular por capas**: cada módulo de dominio (Clientes, Productos, Categorías, Ventas, Inventario, Auth) mantiene sus propias capas (Controller, Service, Repository, DTOs). Se eligió esta estructura sobre Clean Architecture completa por ser proporcional al alcance de un primer proyecto de portafolio, sin descartar una migración incremental futura si el dominio lo justifica.

La autorización se resuelve por permiso de acción, agrupados en roles (`admin`, `vendedor`), en vez de un chequeo binario por rol — necesario porque reglas de negocio como "solo admin puede eliminar clientes" no se expresan bien con un guard genérico por módulo.

El detalle completo de estas decisiones, alternativas evaluadas y criterios está en el documento **P1-AD** (Análisis y Diseño Arquitectónico), fuente autoritativa del proyecto.

## Ejecución local

```bash
# Instalar dependencias
npm install

# Levantar en modo desarrollo (watch mode)
npm run start:dev
```

> Requiere un archivo `.env` local (ver `.env.example`) con las variables de conexión a la base de datos y secretos de autenticación. Este archivo nunca se versiona.

## Tests

```bash
npm run test        # unitarios
npm run test:e2e    # end-to-end
npm run test:cov    # cobertura
```

## Despliegue

Desplegado en Render (free tier). El servicio gratuito duerme tras 15 minutos de inactividad — el primer request tras ese período puede tardar hasta 50 segundos en responder (cold start). Esto es esperado y no indica un error del sistema.

## Estado del proyecto

En construcción. Ver el historial de commits para seguir el proceso de desarrollo incremental.