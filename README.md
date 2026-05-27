# SQL Platform Backend

Backend de una plataforma académica para crear cursos, retos SQL, evaluaciones, envíos de soluciones y procesamiento asíncrono de submissions. Está construido con NestJS, Prisma, PostgreSQL, Redis y BullMQ.

La API expone autenticación con JWT, autorización por roles, documentación Swagger y un worker separado para procesar envíos de consultas SQL.

## Contenido

- [SQL Platform Backend](#sql-platform-backend)
  - [Contenido](#contenido)
  - [Características](#características)
  - [Stack técnico](#stack-técnico)
  - [Arquitectura](#arquitectura)
  - [Requisitos](#requisitos)
  - [Variables de entorno](#variables-de-entorno)
  - [Instalación y ejecución](#instalación-y-ejecución)
    - [Opción 1: entorno local](#opción-1-entorno-local)
    - [Opción 2: Docker Compose](#opción-2-docker-compose)
  - [Scripts disponibles](#scripts-disponibles)
  - [Autenticación y roles](#autenticación-y-roles)
  - [Modelo de datos](#modelo-de-datos)
  - [Tabla de endpoints](#tabla-de-endpoints)
    - [Auth](#auth)
    - [Users](#users)
    - [Courses](#courses)
    - [Challenges](#challenges)
    - [Assessments](#assessments)
    - [Submissions](#submissions)
    - [Recommendations](#recommendations)
  - [Ejemplos de payloads](#ejemplos-de-payloads)
    - [Registro](#registro)
    - [Login](#login)
    - [Crear curso](#crear-curso)
    - [Crear reto](#crear-reto)
    - [Cargar esquema de reto](#cargar-esquema-de-reto)
    - [Cargar datos semilla](#cargar-datos-semilla)
    - [Definir resultado esperado](#definir-resultado-esperado)
    - [Generar datos automáticamente](#generar-datos-automáticamente)
    - [Crear evaluación](#crear-evaluación)
    - [Enviar solución SQL](#enviar-solución-sql)
  - [Procesamiento de submissions](#procesamiento-de-submissions)
  - [Pruebas](#pruebas)
  - [Swagger](#swagger)
  - [Validación de requests](#validación-de-requests)

## Características

- Registro e inicio de sesión de usuarios.
- Autenticación JWT con estrategia Passport.
- Autorización por roles: `ADMIN`, `PROFESSOR`, `STUDENT`.
- Gestión de usuarios, cursos e inscripciones.
- Creación y administración de retos SQL.
- Carga de esquema DDL, datos semilla y resultado esperado por reto.
- Generación automática de datos de prueba con Faker.
- Gestión de evaluaciones asociadas a cursos y retos.
- Envío de soluciones SQL por estudiantes.
- Cola BullMQ en Redis para procesar submissions de forma asíncrona.
- Persistencia con PostgreSQL y Prisma.
- Swagger disponible en `/api/docs`.

## Stack técnico

| Capa | Tecnología |
| --- | --- |
| Runtime | Node.js 22 |
| Framework | NestJS 11 |
| Lenguaje | TypeScript |
| ORM | Prisma 7 |
| Base de datos | PostgreSQL |
| Cola / jobs | Redis + BullMQ |
| Autenticación | JWT + Passport |
| Validación | class-validator + class-transformer |
| Documentación API | Swagger / OpenAPI |
| Contenedores | Docker + Docker Compose |
| Pruebas | Jest + Supertest |

## Arquitectura

El código está organizado por módulos de dominio dentro de `src/modules`:

```text
src/
  modules/
    auth/             Autenticación, login, registro y JWT
    users/            Gestión administrativa de usuarios
    courses/          Cursos e inscripción de estudiantes
    challenges/       Retos SQL y contenido asociado
    assessments/      Evaluaciones sobre retos
    submissions/      Envíos de soluciones SQL
    recommendations/  Recomendaciones de optimización (módulo no montado actualmente)
  shared/
    constants/        Roles y constantes globales
    decorators/       @Roles, @Public, @CurrentUser
    filters/          Filtros HTTP
    guards/           JwtAuthGuard y RolesGuard
    prisma/           PrismaService y PrismaModule
  worker/
    main.ts           Entrada del worker de submissions
    worker.module.ts  Módulo de procesamiento asíncrono
```

La aplicación usa una mezcla de arquitectura modular y separación por capas:

- `presentation`: controladores HTTP.
- `application`: servicios, casos de uso y DTOs.
- `domain`: entidades, contratos y repositorios.
- `infrastructure`: persistencia, procesadores y adaptadores.

## Requisitos

- Node.js 22 o superior.
- npm.
- PostgreSQL.
- Redis.
- Docker y Docker Compose, opcional para levantar dependencias y servicios completos.

## Variables de entorno

Crea un archivo `.env` a partir de `.env.example`:

```bash
cp .env.example .env
```

Variables usadas por el proyecto:

| Variable | Ejemplo | Descripción |
| --- | --- | --- |
| `PORT` | `3000` | Puerto HTTP de la API. |
| `NODE_ENV` | `development` | Entorno de ejecución. |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/sqlplatform` | URL de conexión a PostgreSQL usada por Prisma. |
| `REDIS_HOST` | `localhost` | Host de Redis para BullMQ. |
| `REDIS_PORT` | `6379` | Puerto de Redis. |
| `JWT_SECRET` | `dev-secret` | Secreto para firmar y validar tokens JWT. |
| `JWT_EXPIRES_IN` | `7d` | Tiempo de expiración del JWT leído por `AuthModule`. |

> Nota: `.env.example` define `JWT_EXPIRATION`, pero el código actual lee `JWT_EXPIRES_IN` y usa `7d` como fallback si no existe.

## Instalación y ejecución

### Opción 1: entorno local

1. Instalar dependencias:

```bash
npm install
```

2. Configurar `.env`:

```bash
cp .env.example .env
```

3. Levantar PostgreSQL y Redis localmente.

4. Generar cliente Prisma:

```bash
npm run prisma:generate
```

5. Sincronizar o migrar la base de datos:

```bash
npm run prisma:migrate
```

Si el proyecto no tiene migraciones versionadas todavía, durante desarrollo también puedes sincronizar el esquema con:

```bash
npx prisma db push
```

6. Ejecutar la API:

```bash
npm run start:dev
```

7. En otra terminal, ejecutar el worker:

```bash
npm run start:worker
```

La API quedará disponible en:

```text
http://localhost:3000
```

Swagger quedará disponible en:

```text
http://localhost:3000/api/docs
```

### Opción 2: Docker Compose

El archivo `docker-compose.yml` define servicios para:

- `api`: aplicación NestJS.
- `worker`: consumidor de la cola de submissions.
- `postgres`: base de datos PostgreSQL 16.
- `redis`: Redis 7.
- `migrate`: aplicación de migraciones Prisma.

Ejecutar:

```bash
docker compose up --build
```

Puertos expuestos:

| Servicio | Puerto |
| --- | --- |
| API | `3000` |
| PostgreSQL | `5432` |
| Redis | `6379` |

Dentro de Docker, la API y el worker usan:

```text
DATABASE_URL=postgresql://admin:secret@postgres:5432/sqlplatform?schema=public
REDIS_HOST=redis
```

## Scripts disponibles

| Script | Descripción |
| --- | --- |
| `npm run build` | Genera Prisma Client y compila NestJS. |
| `npm run prisma:generate` | Genera el cliente Prisma. |
| `npm run prisma:migrate` | Ejecuta `prisma migrate dev`. |
| `npm run prisma:studio` | Abre Prisma Studio. |
| `npm run start` | Ejecuta la API en modo normal. |
| `npm run start:dev` | Ejecuta la API en modo watch. |
| `npm run start:debug` | Ejecuta la API con debug y watch. |
| `npm run start:prod` | Ejecuta `dist/main`. |
| `npm run start:worker` | Ejecuta el worker en modo watch. |
| `npm run start:worker:prod` | Ejecuta el worker compilado. |
| `npm run lint` | Ejecuta ESLint con autofix. |
| `npm run format` | Formatea archivos TypeScript. |
| `npm run test` | Ejecuta pruebas unitarias. |
| `npm run test:e2e` | Ejecuta pruebas e2e. |
| `npm run test:cov` | Ejecuta pruebas con cobertura. |

## Autenticación y roles

Todos los endpoints están protegidos por JWT globalmente, excepto los marcados con `@Public()`:

- `POST /auth/register`
- `POST /auth/login`

Para consumir endpoints protegidos, enviar el token como Bearer token:

```http
Authorization: Bearer <token>
```

Roles disponibles:

| Rol | Descripción |
| --- | --- |
| `ADMIN` | Administra usuarios y puede consultar o modificar recursos globales según endpoint. |
| `PROFESSOR` | Crea cursos, retos, evaluaciones y gestiona estudiantes. |
| `STUDENT` | Consulta contenido publicado y envía soluciones SQL. |

El registro público crea usuarios con el rol por defecto definido en Prisma: `STUDENT`.

## Modelo de datos

Entidades principales en `prisma/schema.prisma`:

| Entidad | Descripción |
| --- | --- |
| `User` | Usuario con email, contraseña hasheada, nombre y rol. |
| `Course` | Curso creado por un profesor. |
| `CourseStudent` | Relación muchos a muchos entre cursos y estudiantes. |
| `Challenge` | Reto SQL asociado a un curso y a un profesor creador. |
| `ChallengeSchema` | Script DDL del reto. |
| `SeedData` | Script de datos de prueba del reto. |
| `ExpectedResult` | Query correcta y salida esperada del reto. |
| `Submission` | Envío de una solución SQL por un estudiante. |
| `SubmissionResult` | Resultado de evaluación de un submission. |
| `Recommendation` | Recomendaciones asociadas a un submission. |
| `Assessment` | Evaluación asociada a un curso y a un conjunto de retos. |

Estados de reto:

```text
draft | published | archived
```

Estados de submission:

```text
QUEUED | RUNNING | ACCEPTED | WRONG_ANSWER | SYNTAX_ERROR |
TIME_LIMIT_EXCEEDED | RUNTIME_ERROR | OPTIMIZATION_REQUIRED
```

## Tabla de endpoints

Base URL local:

```text
http://localhost:3000
```

### Auth

| Método | Ruta | Auth | Roles | Descripción | Body / parámetros |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/auth/register` | No | Público | Registra un usuario y retorna token JWT. | `email`, `name`, `password` |
| `POST` | `/auth/login` | No | Público | Inicia sesión y retorna token JWT. | `email`, `password` |

### Users

| Método | Ruta | Auth | Roles | Descripción | Body / parámetros |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/users` | Sí | `ADMIN` | Lista todos los usuarios. | - |
| `GET` | `/users/:id` | Sí | `ADMIN` | Obtiene un usuario por ID. | `id` |
| `PATCH` | `/users/:id` | Sí | `ADMIN` | Actualiza nombre, email o rol de un usuario. | `id`, body parcial |
| `DELETE` | `/users/:id` | Sí | `ADMIN` | Elimina un usuario. | `id` |
| `GET` | `/users/:id/report` | Sí | `PROFESSOR`, `STUDENT` | Reporte de desempeño de estudiante. Actualmente retorna `{}`. | `id` |

### Courses

| Método | Ruta | Auth | Roles | Descripción | Body / parámetros |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/courses` | Sí | `PROFESSOR` | Crea un curso para el profesor autenticado. | `name`, `code`, `period`, `group` |
| `GET` | `/courses` | Sí | `PROFESSOR`, `ADMIN` | Lista cursos. | - |
| `GET` | `/courses/:id` | Sí | `PROFESSOR`, `STUDENT`, `ADMIN` | Obtiene un curso por ID. | `id` |
| `PATCH` | `/courses/:id` | Sí | `PROFESSOR`, `ADMIN` | Actualiza un curso. El profesor solo puede actualizar sus cursos. | `id`, body parcial |
| `DELETE` | `/courses/:id` | Sí | `PROFESSOR`, `ADMIN` | Elimina un curso. El profesor solo puede eliminar sus cursos. | `id` |
| `POST` | `/courses/:id/students` | Sí | `PROFESSOR` | Inscribe un estudiante en un curso propio. | `id`, `studentId` |
| `DELETE` | `/courses/:id/students/:studentId` | Sí | `PROFESSOR` | Retira un estudiante de un curso propio. | `id`, `studentId` |
| `GET` | `/courses/:id/report` | Sí | `PROFESSOR` | Analíticas del curso. Actualmente retorna `{}`. | `id` |
| `GET` | `/courses/:id/leaderboard` | Sí | `PROFESSOR`, `STUDENT` | Ranking de estudiantes del curso. Actualmente retorna `[]`. | `id` |

### Challenges

| Método | Ruta | Auth | Roles | Descripción | Body / parámetros |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/challenges` | Sí | `PROFESSOR` | Crea un reto en estado `draft`. | `title`, `description`, `difficulty`, `tags`, `databaseEngine`, `timeLimit`, `courseId` |
| `GET` | `/challenges` | Sí | `PROFESSOR`, `STUDENT` | Lista retos. Para estudiantes filtra solo publicados. | Query opcional: `courseId` |
| `GET` | `/challenges/:id` | Sí | `PROFESSOR`, `STUDENT` | Obtiene un reto por ID. Para estudiantes solo si está publicado. | `id` |
| `PATCH` | `/challenges/:id` | Sí | `PROFESSOR` | Actualiza datos básicos del reto. | `id`, body parcial |
| `PATCH` | `/challenges/:id/status` | Sí | `PROFESSOR` | Cambia estado del reto. | `id`, `status` |
| `POST` | `/challenges/:id/schema` | Sí | `PROFESSOR` | Carga o reemplaza el DDL del reto. | `id`, `ddlScript` |
| `POST` | `/challenges/:id/seed-data` | Sí | `PROFESSOR` | Carga datos de prueba manuales. | `id`, `insertScript` |
| `POST` | `/challenges/:id/expected-result` | Sí | `PROFESSOR` | Define query correcta y resultado esperado. | `id`, `query`, `outputJson` |
| `POST` | `/challenges/:id/generate-data` | Sí | `PROFESSOR` | Genera datos de prueba automáticamente con Faker. | `id`, `tables` |
| `GET` | `/challenges/:id/stats` | Sí | `PROFESSOR` | Estadísticas del reto. Actualmente retorna `{}`. | `id` |

### Assessments

| Método | Ruta | Auth | Roles | Descripción | Body / parámetros |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/assessments` | Sí | `PROFESSOR` | Crea una evaluación SQL. | `name`, `description`, `startDate`, `endDate`, `duration`, `maxAttempts`, `visibility`, `courseId`, `challengeIds` |
| `GET` | `/assessments` | Sí | `PROFESSOR`, `STUDENT` | Lista evaluaciones disponibles. | - |
| `GET` | `/assessments/:id` | Sí | `PROFESSOR`, `STUDENT` | Obtiene una evaluación por ID. | `id` |
| `PATCH` | `/assessments/:id` | Sí | `PROFESSOR` | Actualiza una evaluación. | `id`, body parcial |

### Submissions

| Método | Ruta | Auth | Roles | Descripción | Body / parámetros |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/submissions` | Sí | `STUDENT` | Envía una solución SQL y la encola para evaluación. | `challengeId`, `query`, `engine` |
| `GET` | `/submissions/:id` | Sí | `STUDENT`, `PROFESSOR`, `ADMIN` | Consulta el estado y resultado de un submission. | `id` |

### Recommendations

Existe un `RecommendationsController` con la ruta `GET /submissions/:id/recommendations`, pero `RecommendationsModule` no está importado en `AppModule`, por lo que este endpoint no queda montado en la API actual.

| Método | Ruta | Auth | Roles | Estado | Descripción |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/submissions/:id/recommendations` | Sí | `STUDENT`, `PROFESSOR` | No montado | Retornaría recomendaciones de optimización. Actualmente el controlador retorna `{}`. |

## Ejemplos de payloads

### Registro

```json
{
  "email": "john@example.com",
  "name": "John Doe",
  "password": "password123"
}
```

Respuesta esperada:

```json
{
  "token": "<jwt>",
  "user": {
    "id": "<uuid>",
    "email": "john@example.com",
    "name": "John Doe",
    "role": "STUDENT"
  }
}
```

### Login

```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

### Crear curso

```json
{
  "name": "Bases de Datos II",
  "code": "BD2-2026",
  "period": "2026-1",
  "group": "1"
}
```

### Crear reto

```json
{
  "title": "Clientes con más de 3 compras",
  "description": "Escribe una query que retorne los clientes con más de 3 compras.",
  "difficulty": "Medium",
  "tags": ["SELECT", "JOIN", "GROUP BY"],
  "databaseEngine": "PostgreSQL",
  "timeLimit": 2000,
  "courseId": "00000000-0000-0000-0000-000000000000"
}
```

### Cargar esquema de reto

```json
{
  "ddlScript": "CREATE TABLE customers (id SERIAL PRIMARY KEY, name VARCHAR(100));"
}
```

### Cargar datos semilla

```json
{
  "insertScript": "INSERT INTO customers (name) VALUES ('Ana'), ('Luis');"
}
```

### Definir resultado esperado

```json
{
  "query": "SELECT name FROM customers WHERE id > 3;",
  "outputJson": [
    { "name": "Ana" },
    { "name": "Luis" }
  ]
}
```

### Generar datos automáticamente

```json
{
  "tables": [
    {
      "table": "customers",
      "rows": 100,
      "fields": {
        "name": { "type": "string" },
        "created_at": {
          "type": "date",
          "from": "2026-01-01",
          "to": "2026-12-31"
        }
      }
    },
    {
      "table": "orders",
      "rows": 1000,
      "fields": {
        "customer_id": {
          "type": "foreign_key",
          "references": "customers.id"
        },
        "total": {
          "type": "decimal",
          "min": 10000,
          "max": 500000
        },
        "status": {
          "type": "enum",
          "values": ["PENDING", "PAID", "CANCELLED"]
        }
      }
    }
  ]
}
```

### Crear evaluación

```json
{
  "name": "Parcial 1 SQL",
  "description": "Evaluación sobre joins y subconsultas",
  "startDate": "2026-05-15T08:00:00Z",
  "endDate": "2026-05-15T10:00:00Z",
  "duration": 120,
  "maxAttempts": 3,
  "visibility": true,
  "courseId": "00000000-0000-0000-0000-000000000000",
  "challengeIds": [
    "11111111-1111-1111-1111-111111111111",
    "22222222-2222-2222-2222-222222222222"
  ]
}
```

### Enviar solución SQL

```json
{
  "challengeId": "11111111-1111-1111-1111-111111111111",
  "query": "SELECT * FROM customers WHERE city = 'Bogotá';",
  "engine": "postgresql"
}
```

## Procesamiento de submissions

Cuando un estudiante envía una solución:

1. `POST /submissions` crea un registro `Submission` con estado inicial `QUEUED`.
2. El servicio publica un job `evaluate` en la cola BullMQ llamada `submissions`.
3. El worker (`npm run start:worker`) consume el job desde Redis.
4. El procesador cambia el estado a `RUNNING`.
5. La implementación actual es un stub: espera aproximadamente 1.5 segundos y marca el submission como `ACCEPTED`, con score `100`.

Para que el flujo funcione completo en desarrollo deben estar activos:

- API NestJS.
- Redis.
- PostgreSQL.
- Worker de submissions.

## Pruebas

Ejecutar pruebas unitarias:

```bash
npm run test
```

Ejecutar pruebas e2e:

```bash
npm run test:e2e
```

Ejecutar cobertura:

```bash
npm run test:cov
```

## Swagger

La documentación interactiva está disponible en:

```text
http://localhost:3000/api/docs
```

Swagger está configurado con Bearer Auth, por lo que se puede pegar el JWT desde el botón de autorización y probar endpoints protegidos.

## Validación de requests

La API usa un `ValidationPipe` global con:

- `whitelist: true`: elimina propiedades no definidas en DTOs.
- `forbidNonWhitelisted: true`: rechaza propiedades extra.
- `transform: true`: transforma tipos cuando aplica.

Esto significa que los payloads deben respetar estrictamente los DTOs definidos en cada módulo.



