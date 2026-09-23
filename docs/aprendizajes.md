# Notas técnicas — P1 Backend

Registro personal de decisiones, patrones y conceptos aplicados en este proyecto.
Uso: repaso propio y preparación para entrevistas técnicas — no reemplaza al README
(que documenta el proyecto para quien lo abre por primera vez) ni al P1-AD
(que documenta las decisiones de arquitectura evaluadas).

## Patrones de diseño aplicados

### Factory (Fábrica) asíncrona — `JwtModule.registerAsync`
**Dónde:** `src/auth/auth.module.ts`

`registerAsync` + `useFactory` es una aplicación real del patrón Factory: en vez
de construir la configuración de `JwtModule` con valores fijos de una vez
(`register({...})`), le pasamos una función (`useFactory`) que NestJS ejecuta
cuando sus dependencias (`ConfigService`, vía `inject`) ya están listas.

**Por qué no `register()` directo:** `register({ secret: process.env.JWT_SECRET })`
lee `process.env` de forma síncrona, en el momento en que NestJS arma los módulos —
sin garantía de que `ConfigModule` ya haya cargado el `.env`. Causó un error
intermitente: `secretOrPrivateKey must have a value`.

**Regla general:** cualquier valor de `.env` usado en la *configuración* de un
módulo (no dentro de un método de una clase ya instanciada, como sí funciona
bien en `PrismaService`) debe pasar por `ConfigService` con `registerAsync`/
`forRootAsync`, no por acceso directo a `process.env`.

## Seguridad

### bcrypt vs. MD5 para hashing de contraseñas
MD5 es rápido y determinístico (mismo input → mismo output) — diseñado para
checksums de archivos, no para passwords. Un atacante con una BD filtrada puede
probar miles de millones de hashes MD5 por segundo (GPU) y usar rainbow tables
precomputadas. Considerado roto para este uso hace más de una década.

bcrypt es deliberadamente lento (cost factor configurable) y agrega un salt
único por password automáticamente — dos usuarios con el mismo password
generan hashes distintos, lo que anula las rainbow tables.

### Mismo mensaje de error para "usuario no existe" y "password incorrecto"
En `AuthService.login`, ambos casos lanzan `UnauthorizedException('Credenciales inválidas')`
sin distinguir cuál falló — evita que un atacante deduzca, probando emails al
azar, cuáles corresponden a cuentas reales en el sistema.

## Conceptos de NestJS

### Por qué `PrismaService` extiende `PrismaClient` en vez de importarlo directo
NestJS funciona con inyección de dependencias — cada `Service` recibe sus
dependencias por constructor. Para que Prisma participe de ese sistema, necesita
estar envuelto en una clase `@Injectable()` con su ciclo de vida gestionado
(`onModuleInit`/`onModuleDestroy` para conectar/desconectar). Sin este wrapper,
tocaría instanciar `new PrismaClient()` manualmente en cada archivo que lo
necesite, perdiendo las ventajas de DI.

### Quién carga el `.env`, y cuándo
El CLI de Prisma (`npx prisma migrate dev`, etc.) carga el `.env` automáticamente
por su cuenta. La aplicación NestJS en sí (`npm run start:dev`) NO lo hace por
defecto — hace falta `@nestjs/config` con `ConfigModule.forRoot({ isGlobal: true })`
para que esas variables queden disponibles en toda la app.

### `JwtStrategy` vs. `AuthService` — uso único vs. uso repetido
`AuthService` se invoca UNA VEZ, en el momento del login (emite el token).
`JwtStrategy` la ejecuta Passport en CADA request a una ruta protegida (verifica
que el token siga siendo válido). Dos momentos distintos del mismo flujo de auth.

## Errores resueltos (y qué explican)

### ESM vs. CommonJS en el cliente de Prisma generado
El generador `provider = "prisma-client"` (Prisma 6/7) produce el cliente en
formato ESM por defecto. NestJS compila a CommonJS. Error:
`ReferenceError: exports is not defined in ES module scope`.
Fix: `moduleFormat = "cjs"` en el bloque `generator client` del schema.

### Prisma 7 → downgrade a Prisma 6.12.0
Prisma 7 movió la configuración de conexión (`url`/`directUrl`) a un archivo
`prisma.config.ts` separado, y exige un "driver adapter" explícito para el
cliente en runtime. Complejidad desproporcionada para el alcance de este
proyecto — mismo criterio que descartó Clean Architecture completa en el P1-AD.

### `prisma db pull` sobrescribe `schema.prisma` sin avisar del todo
Corrido como chequeo de conexión, reescribe el schema completo a partir de la
BD real — pierde comentarios explicativos que no existen como metadata en
la base de datos (solo preserva `@@map`). Si se corre por error, revertir con
`git checkout -- prisma/schema.prisma` en vez de reescribir a mano.
