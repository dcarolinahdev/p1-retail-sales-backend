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

### Soft delete

**Dónde:** `Cliente.activo`, `ClientesService.remove()`

`DELETE /clientes/:id` no borra la fila — hace un `update` que cambia
`activo` a `false`. Necesario porque `Cliente` tiene integridad
referencial con `Venta` (borrar de verdad rompería el historial de
ventas). `findAll()` filtra por defecto solo los que el negocio
necesita ver según el caso de uso (ver nota de "listado liviano" más
abajo si se retoma ese ajuste).

### `select` anidado dentro de `include` — limitar campos de una relación
**Dónde:** `ProductosService.findOne()`

Al traer un registro con su relación (`Producto` con su `Categoria`), `include: { categoria: true }`
trae la fila COMPLETA de la relación. Si esa tabla relacionada crece con
campos que no aportan al contexto actual, se arrastran igual.

Solución: `select` anidado dentro de `include`, para pedir solo los campos
necesarios de la relación, sin perder los campos completos del registro
principal:

```typescript
include: {
  categoria: {
    select: { id: true, nombre: true },
  },
}
```

**Por qué importa más adelante:** en `Venta`, que relaciona `Cliente`,
`Usuario` y `DetalleVenta` (que a su vez relaciona `Producto`), traer todo
completo en cada nivel sería especialmente costoso — este patrón se vuelve
más relevante cuantas más relaciones anidadas tenga una consulta.

### RBAC por permiso vs. por rol hardcodeado
**Dónde:** `PermissionsGuard`, tabla `RolPermiso`

La regla "quién puede hacer qué" no vive en el código (nunca hay un
`if (rol === 'admin')`), vive en los DATOS — qué filas existen en
`RolPermiso`. El Guard solo pregunta genéricamente "¿el rol de este
usuario tiene asociado el permiso X?".

**Alternativas consideradas (y descartadas):**
- Columnas booleanas en `Rol` (una por permiso) — requiere migración
  de schema cada vez que se agrega un permiso nuevo.
- Columnas booleanas por acción CRUD fija (`canCreate`, `canUpdate`...)
  en una fila por módulo — no encaja con acciones no-CRUD (ej. futura
  `ventas:anular`).

**Por qué `RolPermiso` (tabla intermedia N:M):** agregar un permiso
nuevo es solo insertar una fila, sin tocar el schema. Más flexible
para un catálogo que va a crecer con cada módulo nuevo.

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

## Manejo de errores

### `PrismaExceptionFilter`
**Dónde:** `src/common/filters/prisma-exception.filter.ts`, registrado
global en `main.ts` con `app.useGlobalFilters(...)`.

Traduce errores "crudos" de Prisma (`PrismaClientKnownRequestError`) a
respuestas HTTP consistentes — sin este filter, un `documentoIdentidad`
duplicado devolvía un 500 genérico en vez de un 409 con mensaje claro.

- `P2002` (restricción única violada) → 409 Conflict
- `P2025` (registro no encontrado en update/delete) → 404 Not Found

Convive sin conflicto con los `throw new XxxException(...)` manuales
(como en `AuthService`) — son dos mecanismos distintos: uno para
errores que la lógica de negocio detecta explícitamente, otro para
errores que la base de datos rechaza directamente.

### Criterio para decidir qué códigos de error de Prisma mapear
No todos los códigos de `PrismaClientKnownRequestError` se mapean explícitamente
en el filter — solo los que el diseño de la aplicación puede realmente producir.

Mapeados: `P2002` (único duplicado), `P2025` (no encontrado en update/delete),
`P2003` (llave foránea inválida, ej. `categoriaId` que no existe).

Descartados por ahora: `P2014` (violación de relación requerida al borrar) —
no aplica porque el diseño usa soft delete en todo el proyecto, nunca un
`delete` real que pueda violar una relación. Agregar su manejo sería cubrir
un caso que el propio diseño ya hace imposible.

**Regla general:** cubrir los códigos que el diseño actual puede generar,
no todos los códigos que Prisma documenta — el `default` (500 controlado)
es suficiente red de seguridad para el resto.

### Cuándo SÍ dar detalle del error, cuándo NO
En login (endpoint público, sin autenticar), el mensaje de error NO
distingue "usuario no existe" de "password incorrecto" — evita que un
atacante deduzca qué emails son cuentas reales.

En Clientes (requiere estar autenticado), el error SÍ dice qué campo
falló (ej. "ya existe un registro con ese valor en: documentoIdentidad")
— el usuario ya es legítimo y necesita ese detalle para corregir su
formulario. No hay beneficio de seguridad en ocultarlo aquí.

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

### async/await: la diferencia entre una Promise y su valor resuelto
**Dónde:** `ProductosService.findAll()`, `findOne()`

Una función `async` en JavaScript/TypeScript siempre devuelve una `Promise`
— un objeto que representa "un valor que va a estar disponible más
adelante", no el valor en sí, de forma inmediata.

```typescript
const productos = this.prisma.producto.findMany(...); // Promise, no el array
const productos = await this.prisma.producto.findMany(...); // el array real
```

`await` "desenvuelve" la promesa y espera a que se resuelva, entregando
el valor real — pero solo se puede usar dentro de una función marcada
como `async`.

**El caso especial de `.map()` con una función async adentro:**
```typescript
productos.map(async (p) => ({ ...p, stock: await calcularStock(p.id) }))
```
Esto NO devuelve un array de objetos listos — devuelve un array de
PROMESAS (una por cada producto, porque cada iteración es su propia
función async). `Promise.all(arrayDePromesas)` es lo que espera a que
TODAS se resuelvan y entrega el array final con los valores reales.

Olvidar el `Promise.all` en este patrón es un error común: el código
compila y corre, pero el resultado sería un array de promesas pendientes
en vez de los datos esperados.

### PATCH con id en la URL, no en el body — y por qué importa
**Dónde:** `PATCH /clientes/:id`, `UpdateClienteDto` con `PartialType`

El id del recurso va en la URL (`@Param('id')`), nunca en el body. Es la
convención REST: la URL identifica QUÉ recurso, el body describe QUÉ CAMBIA
de ese recurso. Ponerlo en ambos lados es redundante y abre una
inconsistencia (¿cuál id es la verdad si no coinciden?).

**Antipatrón visto en un proyecto anterior (cadena de causa-efecto):**
1. La ruta de actualización no llevaba `:id` (algo como `PATCH /clientes`
   a secas) → no había otra forma de identificar el recurso más que
   metiendo el id en el body.
2. Eso en cascada llevó a un verbo HTTP mal aplicado: se trataba la
   actualización como un `PUT` (reemplazo completo) aunque se llamara
   "PATCH" — exigía mandar el objeto entero, no solo lo que cambiaba.
3. El síntoma visible era "el DTO llevaba muchos campos, incluyendo el id"
   — pero ese síntoma no era la causa raíz, era la consecuencia de los
   dos puntos anteriores (ruta + verbo).

**Lección:** si un DTO de actualización se siente "sucio" (muchos campos
obligatorios, id incluido), revisar primero la ruta y el verbo HTTP antes
de asumir que el problema es solo el DTO — frecuentemente el DTO solo
refleja un problema de diseño más arriba en la cadena.

**Por qué el diseño de este proyecto lo evita:** `PATCH /clientes/:id`
(id en la URL) + `UpdateClienteDto extends PartialType(CreateClienteDto)`
(todo opcional) — permite mandar solo `{ "telefono": "..." }` sin repetir
el resto, que es el comportamiento correcto de un PATCH real.

### Parámetro `tx` opcional para participar en transacciones compartidas
**Dónde:** `InventarioService.registrarMovimiento()`, `calcularStock()`

**El problema que resuelve:** un método necesita poder ejecutarse TANTO
dentro de una transacción abierta por otro servicio (ej. `VentasService`)
COMO de forma independiente, sin duplicar la lógica en dos versiones.

```typescript
async metodo(
  ...,
  tx: PrismaTransactionClient | PrismaService = this.prisma,
) { ... }
```

**Dos conceptos separados en esa firma, que no hay que confundir:**
- *Opcional con valor por defecto* (`= this.prisma`): si no pasan nada,
  usa la conexión normal, fuera de transacción.
- *Unión de tipos* (`|`): el valor que SÍ pasen puede tener una de dos
  formas distintas y ambas son válidas — el `tx` real que Prisma entrega
  dentro de `$transaction(async (tx) => {...})` NO es del mismo tipo que
  `PrismaService`, aunque tengan los mismos métodos disponibles
  (`.producto`, `.inventario`, etc.) — TypeScript exige declarar
  explícitamente ambos tipos posibles.

**Por qué existe `PrismaTransactionClient` como tipo propio (con `Omit`),
en vez de importar el tipo que Prisma ya define internamente:** con el
generador `"prisma-client"` + `moduleFormat: "cjs"` (la configuración de
este proyecto), ese tipo interno de Prisma no queda expuesto para
importación directa, a diferencia del generador clásico `"prisma-client-js"`.
Se reconstruye manualmente: toma `PrismaClient` completo y le quita
(`Omit`) los métodos que un `tx` de transacción no tiene sentido que
tenga (`$connect`, `$disconnect`, `$transaction`, etc.) — porque ya estás
conectada y no puedes anidar otra transacción dentro de la actual.

**Por qué vale la pena el patrón:** sin él, tendría que existir un
`registrarMovimiento` y otro `registrarMovimientoEnTransaccion`, duplicando
toda la lógica de validación de stock — justo la duplicación de lógica de
negocio real que DRY busca evitar (a diferencia del caso de soft-delete/
findOne, donde decidimos que la duplicación SÍ era aceptable por ser trivial).

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

## Herramientas y depuración

### Postman: variables de Environment y el modal "Secrets Detected"
Al pegar un JWT en una variable de Environment, Postman lo detecta
como secreto y ofrece Secure/Override/Remove. En una sesión, "Remove"
dejó el campo vacío en vez de conservar el valor pegado — causó una
prueba de RBAC con resultado falso (parecía que el rol no cambiaba).

Lección: después de cualquier acción sobre ese modal, verificar
explícitamente que el valor SÍ quedó guardado (ej. con `GET /auth/profile`,
que refleja el rol del token actual) antes de asumir que la variable
se actualizó correctamente.

## Convención de commits (Conventional Commits)

| Tipo | Cuándo se usa | Ejemplo en este proyecto |
|---|---|---|
| `feat` | Funcionalidad nueva — un endpoint, un módulo, una capacidad que no existía | `feat: implement Clientes CRUD module` |
| `fix` | Corrección de un bug — algo que no funcionaba como debía | `fix: use JwtModule.registerAsync to avoid race condition reading JWT_SECRET` |
| `chore` | Configuración, dependencias, tareas de mantenimiento — sin lógica de negocio | `chore: install JWT, Passport and bcrypt dependencies` |
| `docs` | Solo documentación — README, comentarios extensos, notas | `docs: add personal learning notes for interview prep` |
| `refactor` | Cambia el diseño/estructura de algo que ya funcionaba, sin agregar funcionalidad nueva ni corregir un bug | `refactor: use lightweight select in Clientes findAll, include inactive records` |

**Regla para decidir entre `feat` y `refactor`:** si el endpoint/comportamiento es nuevo, es `feat`. Si ya existía y solo cambia cómo está construido por dentro (o su contrato de respuesta), es `refactor`.
