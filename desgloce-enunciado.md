# Proyecto Final — Plataforma inteligente para evaluación y optimización de SQL

> **Modalidad:** Equipos de máximo 4 estudiantes (adaptado a 5)  
> **Duración:** 5 semanas · 2 entregas parciales  
> **Arquitectura requerida:** Clean Architecture  
> **Stack principal:** Node.js + NestJS, PostgreSQL, Redis, Docker Compose, JWT

---

## Tabla de contenidos

1. [Resumen general](#resumen-general)
2. [Stack tecnológico](#stack-tecnológico)
3. [Requisitos funcionales](#requisitos-funcionales)
4. [Requisitos no funcionales](#requisitos-no-funcionales)
5. [Módulos del sistema](#módulos-del-sistema)
6. [Flujo general del sistema](#flujo-general-del-sistema)
7. [Distribución del equipo (5 desarrolladores)](#distribución-del-equipo-5-desarrolladores)
8. [Paso a paso — Cómo se implementa](#paso-a-paso--cómo-se-implementa)
9. [Entregas y rúbrica](#entregas-y-rúbrica)

---

## Resumen general

El sistema es un **juez online orientado al aprendizaje de SQL**. Permite que:

- Un **profesor** cree retos SQL, defina esquemas de base de datos, cargue o genere datos de prueba y configure resultados esperados.
- Un **estudiante** envíe soluciones SQL que el sistema evalúa automáticamente.
- Un **asistente inteligente** analice cada query y genere recomendaciones de optimización en lenguaje natural (obligatorio).

---

## Stack tecnológico

### Obligatorio (definido por el proyecto)

| Tecnología | Uso |
|---|---|
| **NestJS + Node.js** | Framework principal para la API REST |
| **PostgreSQL** | Base de datos principal de la plataforma |
| **Redis + BullMQ** | Cola de procesamiento asíncrono de submissions |
| **Docker / Docker Compose** | Ejecución aislada de queries de estudiantes |
| **JWT** | Autenticación y manejo de sesiones |
| **Clean Architecture** | Patrón de diseño obligatorio |
| **GitHub** | Control de versiones — commits individuales evaluados |

### Recomendado / a elegir por el equipo

| Tecnología | Uso |
|---|---|
| **TypeORM o Prisma** | ORM para interacción con PostgreSQL |
| **@faker-js/faker** | Generación de datos aleatorios de prueba |
| **Swagger / OpenAPI** | Documentación de la API (NestJS tiene soporte nativo) |
| **Claude API o GPT API** | Asistente IA para el Módulo 5 |
| **class-validator + class-transformer** | Validación de DTOs en NestJS |
| **Jest** | Testing unitario (recomendado, no obligatorio) |
| **bcrypt** | Hash de contraseñas |

### Estructura de capas — Clean Architecture

```
src/
├── domain/           # Entidades, interfaces, repositorios abstractos (sin dependencias)
├── application/      # Casos de uso (use cases), DTOs, servicios de aplicación
├── infrastructure/   # Implementaciones concretas: TypeORM, Redis, Docker, APIs externas
└── presentation/     # Controladores NestJS, Guards, Middlewares, Pipes
```

---

## Requisitos funcionales

### RF-01 — Autenticación y roles

- El sistema maneja 3 roles: `ADMIN`, `PROFESSOR`, `STUDENT`
- Login con correo y contraseña retorna un JWT
- Cada petición protegida valida el token y verifica permisos por rol
- **ADMIN:** gestiona usuarios, profesores, cursos e información general
- **PROFESSOR:** crea cursos, inscribe estudiantes, crea retos, crea evaluaciones, revisa resultados y reportes
- **STUDENT:** ve cursos inscritos, consulta retos publicados, envía soluciones, consulta resultados y recomendaciones

### RF-02 — Gestión de cursos

- CRUD completo de cursos
- Cada curso tiene: nombre, código/NRC, periodo académico, profesor responsable, estudiantes inscritos, retos y evaluaciones asociadas
- El profesor puede inscribir y desinscribir estudiantes

### RF-03 — Gestión de retos SQL

- CRUD de retos con campos mínimos: `title`, `description`, `difficulty`, `tags`, `databaseEngine`, `timeLimit`, `status`, `courseId`, `createdBy`
- Estados del reto:

| Estado | Significado |
|---|---|
| `draft` | En construcción, no visible para estudiantes |
| `published` | Disponible para resolver |
| `archived` | Ya no disponible |

- El profesor carga el **esquema DDL** (CREATE TABLE) del reto
- El profesor carga **datos de prueba** (INSERT INTO) manualmente
- El profesor define el **resultado esperado** de la query correcta

### RF-04 — Generador de datos aleatorios

- El profesor configura cuántos registros generar por tabla
- Parámetros configurables por campo:
  - `foreign_key` — referencia a otra tabla (respeta integridad referencial)
  - `decimal` — valores con `min` y `max`
  - `date` — rango `from` / `to`
  - `enum` — lista de valores posibles
  - Porcentaje de valores nulos permitidos
- El sistema genera los INSERTs respetando las relaciones entre tablas

### RF-05 — Envío de soluciones (submissions)

- El estudiante selecciona un reto publicado y envía una query SQL
- El sistema registra la submission con estado `QUEUED`
- El estudiante puede consultar el estado y resultado de su submission

**Estados de submission:**

| Estado | Significado |
|---|---|
| `QUEUED` | En espera de evaluación |
| `RUNNING` | La query se está ejecutando |
| `ACCEPTED` | Resultado correcto |
| `WRONG_ANSWER` | El resultado no coincide |
| `SYNTAX_ERROR` | Error de sintaxis en la query |
| `TIME_LIMIT_EXCEEDED` | Superó el tiempo permitido |
| `RUNTIME_ERROR` | Falló durante la ejecución |
| `OPTIMIZATION_REQUIRED` | Funciona pero tiene bajo rendimiento |

### RF-06 — Evaluación automática

El sistema debe ejecutar este flujo por cada submission:

1. Registrar la submission
2. Enviar a la cola de Redis (BullMQ)
3. El worker consume el job
4. Preparar el esquema DDL del reto
5. Cargar los datos de prueba
6. Ejecutar la query del estudiante en contenedor Docker aislado
7. Comparar el resultado obtenido con el resultado esperado
8. Medir el tiempo de ejecución
9. Calcular el puntaje
10. Solicitar recomendaciones al asistente IA
11. Guardar el resultado final
12. El estudiante puede consultar retroalimentación

**Criterios de evaluación:**

| Criterio | Peso |
|---|---|
| Resultado correcto | 60% |
| Tiempo de ejecución | 15% |
| Uso adecuado de SQL | 10% |
| Claridad de la consulta | 5% |
| Recomendaciones atendidas / mejora posterior | 10% |

### RF-07 — Ejecución aislada con Docker

- Cada evaluación se ejecuta en un contenedor Docker temporal
- El runner usa la imagen `postgres:16`
- Aplica límites: `--memory 512m --cpus 0.5`
- El contenedor se destruye al finalizar (`--rm`)
- **Nunca se ejecuta sobre la base de datos principal**

```bash
docker run --rm \
  --memory 512m \
  --cpus 0.5 \
  -e POSTGRES_PASSWORD=test \
  postgres:16
```

### RF-08 — Asistente inteligente de optimización SQL (OBLIGATORIO)

El asistente analiza:
- La query enviada por el estudiante
- El esquema de tablas
- Campos usados en filtros, JOINs, agrupaciones y ordenamientos
- Tiempo de ejecución
- Posibles problemas de rendimiento

El asistente genera:
- Explicación en lenguaje natural
- Recomendaciones de optimización
- Sugerencia de índices (con DDL `CREATE INDEX`)
- Advertencias sobre malas prácticas
- Propuesta de reescritura de la query cuando aplique
- Explicación del impacto esperado de cada mejora

**Malas prácticas que debe detectar (mínimo):**
- Uso de `SELECT *`
- Ausencia de filtros en tablas grandes
- Funciones dentro del `WHERE` (ej. `YEAR(col)`)
- JOINs sobre columnas sin índice
- Ordenamientos costosos sin índice
- Subconsultas con `IN` que pueden reemplazarse por `JOIN`

**Formas válidas de implementación:**
- Opción A — Motor de reglas propias
- Opción B — Integración con Claude API / GPT API
- Opción C — Híbrido (reglas + IA generativa)

### RF-09 — Evaluaciones / parciales

- El profesor crea evaluaciones compuestas por N retos SQL
- Cada evaluación tiene: nombre, descripción, fecha inicio, fecha cierre, duración, intentos máximos, curso asociado, visibilidad de resultados
- El sistema valida la ventana de tiempo e intentos al recibir una submission

### RF-10 — Reportes y leaderboard

- Reporte por curso: todos los estudiantes con su puntaje promedio
- Reporte por estudiante: historial de submissions y resultados
- Reporte por reto: estadísticas de intentos, tasa de éxito, tiempo promedio
- Leaderboard: ranking de estudiantes por puntaje dentro de un curso

---

## Requisitos no funcionales

| # | Requisito | Descripción |
|---|---|---|
| RNF-01 | **Clean Architecture** | Separación estricta en capas: domain, application, infrastructure, presentation. Sin dependencias invertidas. |
| RNF-02 | **Seguridad** | JWT en cada request protegido. Guards por rol. Las queries de estudiantes nunca se ejecutan sobre la BD principal. |
| RNF-03 | **Procesamiento asíncrono** | La evaluación nunca bloquea la respuesta HTTP. Redis + BullMQ desacoplan el envío de la ejecución. |
| RNF-04 | **Aislamiento de ejecución** | Cada query corre en contenedor efímero con límites de CPU y RAM. Destruido al finalizar. |
| RNF-05 | **Documentación** | README completo + Swagger/OpenAPI en cada endpoint + video demostrativo. |
| RNF-06 | **Colaboración en GitHub** | Cada desarrollador hace commits en su rama. Los commits individuales son evaluados. |
| RNF-07 | **Docker Compose** | Todos los servicios (API, Worker, PostgreSQL, Redis) levantados con un solo comando. |
| RNF-08 | **Escalabilidad del worker** | El worker debe poder correr como proceso separado para no acoplar la ejecución a la API. |

---

## Módulos del sistema

### Módulo 1 — Usuarios, roles y cursos

**Peso en rúbrica:** 10% (API + auth) + parte del 15% (cursos)

**Entidades principales:**
- `User` (id, email, password, role, createdAt)
- `Course` (id, name, code, period, group, professorId, students[])

**Endpoints:**
```
POST   /auth/register
POST   /auth/login
GET    /users                    [ADMIN]
GET    /users/:id                [ADMIN]
PATCH  /users/:id                [ADMIN]
DELETE /users/:id                [ADMIN]
POST   /courses                  [PROFESSOR]
GET    /courses                  [PROFESSOR, ADMIN]
GET    /courses/:id              [PROFESSOR, STUDENT]
PATCH  /courses/:id              [PROFESSOR]
DELETE /courses/:id              [PROFESSOR, ADMIN]
POST   /courses/:id/students     [PROFESSOR]
DELETE /courses/:id/students/:studentId [PROFESSOR]
```

---

### Módulo 2 — Retos SQL y datos de prueba

**Peso en rúbrica:** 15% (gestión) + 10% (esquemas + generador)

**Entidades principales:**
- `Challenge` (id, title, description, difficulty, tags, databaseEngine, timeLimit, status, courseId, createdBy)
- `ChallengeSchema` (id, challengeId, ddlScript)
- `SeedData` (id, challengeId, insertScript)
- `ExpectedResult` (id, challengeId, query, outputJson)

**Endpoints:**
```
POST   /challenges                         [PROFESSOR]
GET    /challenges                         [PROFESSOR, STUDENT]
GET    /challenges/:id                     [PROFESSOR, STUDENT]
PATCH  /challenges/:id                     [PROFESSOR]
PATCH  /challenges/:id/status              [PROFESSOR]
POST   /challenges/:id/schema              [PROFESSOR]
POST   /challenges/:id/seed-data           [PROFESSOR]
POST   /challenges/:id/expected-result     [PROFESSOR]
POST   /challenges/:id/generate-data       [PROFESSOR]
```

---

### Módulo 3 — Envío y evaluación de soluciones

**Peso en rúbrica:** 20%

**Entidades principales:**
- `Submission` (id, studentId, challengeId, engine, query, status, createdAt)
- `SubmissionResult` (id, submissionId, status, score, executionTimeMs, tests[])

**Endpoints:**
```
POST   /submissions                        [STUDENT]
GET    /submissions/:id                    [STUDENT, PROFESSOR]
GET    /submissions/:id/result             [STUDENT, PROFESSOR]
GET    /submissions/:id/feedback           [STUDENT]
GET    /challenges/:id/submissions         [PROFESSOR]
```

---

### Módulo 4 — Ejecución aislada y procesamiento asíncrono

**Peso en rúbrica:** 15%

**Componentes:**
- **Cola BullMQ:** job `evaluate-submission` con payload `{ submissionId }`
- **Worker:** proceso Node.js independiente que consume la cola
- **Runner:** script que ejecuta docker run y captura el resultado

**Flujo interno:**
```
API → BullMQ Queue → Worker → Runner Docker → Resultado → DB
```

**El runner debe:**
1. Crear BD temporal en contenedor postgres:16
2. Ejecutar DDL del reto
3. Cargar seed data
4. Ejecutar query del estudiante con timeout
5. Capturar filas resultantes en JSON
6. Destruir el contenedor

---

### Módulo 5 — Asistente inteligente de optimización SQL (OBLIGATORIO)

**Peso en rúbrica:** 10%

**Entidades:**
- `Recommendation` (id, submissionId, explanation, suggestions[], indexSuggestions[], rewrittenQuery)

**Endpoints:**
```
GET    /submissions/:id/recommendations    [STUDENT, PROFESSOR]
```

**Prompt base para el modelo IA:**
```
Analiza esta query SQL:
[QUERY DEL ESTUDIANTE]

Esquema de tablas:
[DDL DEL RETO]

Tiempo de ejecución: [Xms]
Resultado: [ACCEPTED | WRONG_ANSWER | OPTIMIZATION_REQUIRED]

Genera:
1. Explicación de problemas detectados
2. Recomendaciones de optimización
3. Índices sugeridos con DDL
4. Query reescrita mejorada si aplica
```

---

### Módulo 6 — Evaluaciones, reportes y leaderboard

**Peso en rúbrica:** 10%

**Entidades principales:**
- `Assessment` (id, name, description, startDate, endDate, duration, maxAttempts, courseId, challengeIds[], visibility)
- `AssessmentResult` (id, assessmentId, studentId, totalScore, completedAt)

**Endpoints:**
```
POST   /assessments                        [PROFESSOR]
GET    /assessments                        [PROFESSOR, STUDENT]
GET    /assessments/:id                    [PROFESSOR, STUDENT]
PATCH  /assessments/:id                    [PROFESSOR]
GET    /courses/:id/report                 [PROFESSOR]
GET    /courses/:id/leaderboard            [PROFESSOR, STUDENT]
GET    /students/:id/report                [PROFESSOR, STUDENT]
GET    /challenges/:id/stats               [PROFESSOR]
```

---

## Flujo general del sistema

```
Profesor
  │
  ├── 1. Crea curso
  ├── 2. Inscribe estudiantes
  ├── 3. Crea reto SQL (draft)
  ├── 4. Carga esquema DDL
  ├── 5. Carga datos de prueba (manual o generador)
  ├── 6. Define resultado esperado
  └── 7. Publica el reto (published)

Estudiante
  │
  ├── 8. Consulta reto publicado
  └── 9. Envía solución SQL

API NestJS
  │
  ├── 10. Registra submission (estado: QUEUED)
  └── 11. Encola job en Redis (BullMQ)

Worker SQL
  │
  └── 12. Consume job de la cola

Runner Docker
  │
  ├── 13. Levanta contenedor postgres:16 temporal
  ├── 14. Ejecuta DDL del reto
  ├── 15. Carga datos de prueba
  ├── 16. Ejecuta query del estudiante (con timeout)
  ├── 17. Compara resultado vs esperado
  ├── 18. Mide tiempo de ejecución
  └── 19. Destruye el contenedor

Worker (post-ejecución)
  │
  ├── 20. Calcula puntaje final
  ├── 21. Solicita recomendaciones al Asistente IA
  └── 22. Guarda resultado final en DB

Estudiante
  └── 23. Consulta retroalimentación y recomendaciones

Profesor
  └── 24. Consulta reportes y calificaciones
```

---

## Distribución del equipo (5 desarrolladores)

### Dev 1 — Auth, usuarios y cursos (Módulo 1 completo)

**Responsabilidades:**
- Setup del proyecto NestJS con estructura Clean Architecture
- Configuración inicial de Docker Compose (API + PostgreSQL + Redis)
- Entidades `User`, `Role`, `Course` con TypeORM
- `JwtStrategy`, `JwtAuthGuard`, `RolesGuard`
- Endpoints: `/auth/register`, `/auth/login`, CRUD `/users`, CRUD `/courses`
- Inscripción de estudiantes a cursos
- Swagger base de la API
- Variables de entorno y configuración global

**Tareas puntuales:**
- [ ] Inicializar repo GitHub con estructura de ramas
- [ ] Configurar `docker-compose.yml` con postgres y redis
- [ ] Crear módulo `users` con Clean Architecture
- [ ] Implementar login + JWT con bcrypt
- [ ] Crear Guards de autenticación y roles
- [ ] CRUD completo de cursos
- [ ] Endpoint para inscribir/desinscribir estudiantes
- [ ] Configurar Swagger en `main.ts`

---

### Dev 2 — Retos SQL y generador de datos (Módulo 2 completo)

**Responsabilidades:**
- Entidades `Challenge`, `ChallengeSchema`, `SeedData`, `ExpectedResult`
- CRUD de retos con estados y transiciones
- Endpoint para cargar esquema DDL (texto plano)
- Endpoint para cargar datos INSERT manuales
- Endpoint para definir resultado esperado
- Generador de datos aleatorios con `@faker-js/faker`

**Tareas puntuales:**
- [ ] Crear entidad `Challenge` con todos sus campos
- [ ] Implementar máquina de estados (draft → published → archived)
- [ ] Endpoint `POST /challenges/:id/schema` (guarda texto DDL)
- [ ] Endpoint `POST /challenges/:id/seed-data` (guarda INSERTs)
- [ ] Endpoint `POST /challenges/:id/expected-result`
- [ ] Servicio de generación de datos: parsear config JSON → generar INSERTs
- [ ] Respetar relaciones FK al generar datos
- [ ] Soporte para tipos: `foreign_key`, `decimal`, `date`, `enum`, nulos

---

### Dev 3 — Runner Docker y procesamiento asíncrono (Módulos 3 + 4)

**Responsabilidades:**
- Entidad `Submission` con sus 8 estados
- `POST /submissions` + encolar en BullMQ
- Worker como proceso Node.js independiente
- Runner que ejecuta la query en contenedor Docker temporal
- Comparación de resultados y cálculo de puntaje

**Tareas puntuales:**
- [ ] Crear entidad `Submission` y `SubmissionResult`
- [ ] `POST /submissions` — registrar y encolar
- [ ] `GET /submissions/:id` — consultar estado
- [ ] Configurar BullMQ: producer en API, consumer en Worker
- [ ] Worker: proceso separado que consume la cola
- [ ] Runner: `docker run --rm --memory 512m --cpus 0.5 postgres:16`
- [ ] Ejecutar DDL + seed + query dentro del contenedor
- [ ] Capturar output en JSON y medir tiempo de ejecución
- [ ] Comparar filas obtenidas vs filas esperadas
- [ ] Calcular score por criterios y guardar resultado
- [ ] Manejar estados: `SYNTAX_ERROR`, `TIME_LIMIT_EXCEEDED`, `RUNTIME_ERROR`

---

### Dev 4 — Asistente IA de optimización (Módulo 5 completo)

**Responsabilidades:**
- Motor de reglas para detectar malas prácticas SQL
- Generador automático de sugerencias de índices (DDL)
- Integración con API de IA externa (Claude o GPT)
- Propuesta de reescritura de queries
- Endpoint para consultar recomendaciones

**Tareas puntuales:**
- [ ] Parsear la query SQL para detectar patrones (puede usar `node-sql-parser`)
- [ ] Regla: detectar `SELECT *`
- [ ] Regla: detectar funciones en `WHERE` que impiden uso de índices
- [ ] Regla: detectar subconsultas con `IN` reemplazables por `JOIN`
- [ ] Regla: detectar `ORDER BY` en campos no indexados
- [ ] Regla: detectar ausencia de `WHERE` en tablas grandes
- [ ] Generador de `CREATE INDEX` sugeridos según campos usados
- [ ] Construir prompt con query + DDL + tiempo + resultado de reglas
- [ ] Integrar Claude API o GPT API para recomendaciones en lenguaje natural
- [ ] Guardar `Recommendation` entity en BD
- [ ] Endpoint `GET /submissions/:id/recommendations`

---

### Dev 5 — Evaluaciones, reportes y documentación (Módulo 6 completo)

**Responsabilidades:**
- Entidades `Assessment` y `AssessmentChallenge`
- CRUD de evaluaciones con validación de ventana de tiempo e intentos
- Reportes por curso, estudiante y reto
- Leaderboard
- README completo y video demostrativo

**Tareas puntuales:**
- [ ] Entidad `Assessment` con fecha inicio, cierre, duración e intentos máximos
- [ ] CRUD `/assessments` con validación de permisos
- [ ] Asociar N retos a una evaluación
- [ ] Validar ventana de tiempo al recibir submissions de evaluación
- [ ] Validar máximo de intentos por estudiante por evaluación
- [ ] `GET /courses/:id/report` — todos los estudiantes con score promedio
- [ ] `GET /students/:id/report` — historial de submissions
- [ ] `GET /courses/:id/leaderboard` — ranking por puntaje
- [ ] `GET /challenges/:id/stats` — tasa de éxito, tiempo promedio
- [ ] README completo: setup, arquitectura, decisiones técnicas
- [ ] `.env.example` con todas las variables de entorno
- [ ] Video demostrativo cubriendo todos los módulos

---

## Paso a paso — Cómo se implementa

### Semana 1 — Base del proyecto (Entrega Parcial 1)

**Paso 1 — Setup del repositorio (Dev 1)**

```bash
# Inicializar proyecto NestJS
npm i -g @nestjs/cli
nest new sql-platform
cd sql-platform

# Instalar dependencias principales
npm install @nestjs/typeorm typeorm pg
npm install @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt
npm install @nestjs/bull bull ioredis
npm install class-validator class-transformer
npm install @nestjs/swagger swagger-ui-express
npm install @faker-js/faker
```

Estructura de carpetas Clean Architecture:
```
src/
├── modules/
│   ├── auth/
│   │   ├── domain/
│   │   ├── application/
│   │   ├── infrastructure/
│   │   └── presentation/
│   ├── users/
│   ├── courses/
│   ├── challenges/
│   ├── submissions/
│   ├── assessments/
│   └── recommendations/
├── shared/
│   ├── guards/
│   ├── decorators/
│   └── filters/
└── main.ts
```

**Paso 2 — Docker Compose inicial (Dev 1)**

```yaml
# docker-compose.yml
version: '3.8'
services:
  api:
    build: .
    ports:
      - "3000:3000"
    env_file: .env
    depends_on:
      - postgres
      - redis

  worker:
    build: .
    command: node dist/worker/main.js
    env_file: .env
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: sqlplatform
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: secret
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7
    ports:
      - "6379:6379"

volumes:
  pgdata:
```

**Paso 3 — Autenticación y usuarios (Dev 1)**

- Crear entidad `User` con TypeORM
- Implementar `AuthService` con registro y login
- Configurar `JwtModule` y `PassportModule`
- Crear `JwtAuthGuard` y `RolesGuard`
- Decorador `@Roles(Role.PROFESSOR)` para proteger endpoints

**Paso 4 — Cursos (Dev 1 + Dev 2 en paralelo)**

- Crear entidad `Course` con relaciones a `User`
- CRUD completo con validación de rol
- Endpoint para inscribir estudiantes

**Paso 5 — Retos SQL básico (Dev 2)**

- Crear entidades `Challenge`, `ChallengeSchema`, `SeedData`, `ExpectedResult`
- CRUD con máquina de estados
- Validar que solo el profesor del curso puede crear retos

**Paso 6 — Worker stub con BullMQ (Dev 3)**

```typescript
// Instalar y configurar BullMQ
// En la API: producer
const job = await this.evaluationQueue.add('evaluate', { submissionId });

// En el worker: consumer (proceso separado)
@Processor('sql-evaluation')
export class EvaluationProcessor {
  @Process('evaluate')
  async handleEvaluation(job: Job) {
    // STUB: solo cambiar estado a ACCEPTED para probar el flujo
    await this.submissionService.updateStatus(job.data.submissionId, 'ACCEPTED');
  }
}
```

---

### Semana 2 — Cierre entrega parcial 1

**Paso 7 — Generador de datos aleatorios (Dev 2)**

```typescript
// Ejemplo de implementación con faker
import { faker } from '@faker-js/faker';

function generateRows(config: GeneratorConfig): string[] {
  const inserts: string[] = [];
  for (let i = 0; i < config.rows; i++) {
    const values = Object.entries(config.fields).map(([field, fieldConfig]) => {
      switch (fieldConfig.type) {
        case 'decimal':
          return faker.number.float({ min: fieldConfig.min, max: fieldConfig.max });
        case 'date':
          return faker.date.between({ from: fieldConfig.from, to: fieldConfig.to });
        case 'enum':
          return faker.helpers.arrayElement(fieldConfig.values);
        case 'foreign_key':
          return faker.helpers.arrayElement(existingIds[fieldConfig.references]);
      }
    });
    inserts.push(`INSERT INTO ${config.table} VALUES (${values.join(', ')});`);
  }
  return inserts;
}
```

**Paso 8 — Documentación Swagger + arquitectura (Dev 1 + Dev 5)**

- Completar decoradores Swagger en todos los controladores
- Generar diagrama de arquitectura para el README
- Preparar documentación de la entrega parcial 1

---

### Semana 3 — Runner real y evaluador

**Paso 9 — Runner Docker real (Dev 3)**

```typescript
// Servicio de ejecución aislada
async executeQuery(ddl: string, seed: string, query: string, timeLimit: number) {
  const containerId = uuidv4();
  
  try {
    // 1. Levantar contenedor
    await exec(`docker run -d --name ${containerId} \
      --memory 512m --cpus 0.5 \
      -e POSTGRES_PASSWORD=test \
      postgres:16`);

    // 2. Esperar a que postgres inicie
    await sleep(2000);

    // 3. Ejecutar DDL
    await exec(`docker exec ${containerId} psql -U postgres -c "${ddl}"`);

    // 4. Cargar seed data
    await exec(`docker exec ${containerId} psql -U postgres -c "${seed}"`);

    // 5. Ejecutar query del estudiante con timeout
    const start = Date.now();
    const result = await execWithTimeout(
      `docker exec ${containerId} psql -U postgres -c "${query}" --csv`,
      timeLimit
    );
    const executionTimeMs = Date.now() - start;

    return { result: parseCSV(result), executionTimeMs };

  } catch (err) {
    if (err.timeout) throw new TimeLimitExceededException();
    if (err.message.includes('syntax')) throw new SyntaxErrorException();
    throw new RuntimeErrorException(err.message);

  } finally {
    // 6. SIEMPRE destruir el contenedor
    await exec(`docker rm -f ${containerId}`);
  }
}
```

**Paso 10 — Comparación de resultados y puntaje (Dev 3)**

```typescript
function compareResults(obtained: any[][], expected: any[][]): ComparisonResult {
  const rowsMatch = obtained.length === expected.length;
  const dataMatch = JSON.stringify(obtained.sort()) === JSON.stringify(expected.sort());
  
  return {
    passed: rowsMatch && dataMatch,
    rowsExpected: expected.length,
    rowsReturned: obtained.length,
  };
}

function calculateScore(result: EvaluationResult): number {
  let score = 0;
  if (result.correct) score += 60;
  if (result.executionTimeMs < result.timeLimit * 0.5) score += 15;
  else if (result.executionTimeMs < result.timeLimit) score += 8;
  // Los otros criterios los puede calcular el asistente IA
  return score;
}
```

**Paso 11 — Motor de reglas SQL (Dev 4)**

```typescript
// Instalar parser
// npm install node-sql-parser

import { Parser } from 'node-sql-parser';

export class SqlAnalyzer {
  analyze(query: string, schema: string, executionTimeMs: number): AnalysisResult {
    const parser = new Parser();
    const ast = parser.astify(query);
    const issues: Issue[] = [];

    // Regla: SELECT *
    if (this.hasSelectStar(ast)) {
      issues.push({
        type: 'SELECT_STAR',
        severity: 'warning',
        message: 'Evita usar SELECT * si no necesitas todas las columnas.',
      });
    }

    // Regla: funciones en WHERE
    if (this.hasFunctionInWhere(ast)) {
      issues.push({
        type: 'FUNCTION_IN_WHERE',
        severity: 'error',
        message: 'Usar funciones en WHERE impide el uso de índices.',
      });
    }

    // Regla: subconsulta IN reemplazable por JOIN
    if (this.hasInSubquery(ast)) {
      issues.push({
        type: 'IN_SUBQUERY',
        severity: 'info',
        message: 'Considera reemplazar la subconsulta con IN por un JOIN.',
      });
    }

    return { issues, indexSuggestions: this.suggestIndexes(ast, schema) };
  }
}
```

**Paso 12 — Integración con API de IA (Dev 4)**

```typescript
async generateRecommendations(submission: Submission, analysis: AnalysisResult) {
  const prompt = `
Eres un experto en optimización SQL. Analiza esta consulta y genera recomendaciones.

Query del estudiante:
${submission.query}

Esquema de tablas:
${submission.challenge.schema.ddl}

Tiempo de ejecución: ${submission.result.executionTimeMs}ms
Problemas detectados: ${JSON.stringify(analysis.issues)}

Genera en español:
1. Explicación breve de los problemas
2. Recomendaciones concretas numeradas
3. Índices sugeridos con DDL exacto
4. Query reescrita mejorada (si aplica)
`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }],
  });

  return this.parseAndSaveRecommendation(submission.id, response.content[0].text);
}
```

---

### Semana 4 — Evaluaciones y reportes

**Paso 13 — Módulo de evaluaciones (Dev 5)**

```typescript
// Validar ventana de tiempo al recibir submission
async validateSubmission(assessmentId: string, studentId: string) {
  const assessment = await this.assessmentRepo.findOne(assessmentId);
  const now = new Date();

  if (now < assessment.startDate || now > assessment.endDate) {
    throw new ForbiddenException('La evaluación no está activa en este momento.');
  }

  const attempts = await this.submissionRepo.countByStudentAndAssessment(
    studentId, assessmentId
  );

  if (attempts >= assessment.maxAttempts) {
    throw new ForbiddenException('Superaste el máximo de intentos permitidos.');
  }
}
```

**Paso 14 — Reportes y leaderboard (Dev 5)**

```sql
-- Leaderboard por curso
SELECT 
  u.id, u.email,
  AVG(sr.score) as avg_score,
  COUNT(s.id) as total_submissions,
  SUM(CASE WHEN s.status = 'ACCEPTED' THEN 1 ELSE 0 END) as accepted
FROM users u
JOIN submissions s ON s.student_id = u.id
JOIN submission_results sr ON sr.submission_id = s.id
JOIN challenges c ON c.id = s.challenge_id
WHERE c.course_id = $1
GROUP BY u.id, u.email
ORDER BY avg_score DESC;
```

---

### Semana 5 — Integración, pulido y entrega

**Paso 15 — Prueba del flujo E2E completo (todos)**

Lista de verificación antes de la entrega final:

- [ ] Registro y login funcionan con JWT
- [ ] Permisos por rol están correctamente aplicados
- [ ] Se puede crear curso, reto, cargar esquema y datos
- [ ] El generador de datos respeta FK y rangos
- [ ] `POST /submissions` encola correctamente en Redis
- [ ] El worker procesa el job y lanza el Runner
- [ ] El Runner ejecuta en Docker y destruye el contenedor
- [ ] El resultado se compara correctamente vs el esperado
- [ ] Los 8 estados de submission funcionan
- [ ] El asistente IA genera recomendaciones
- [ ] Los índices sugeridos tienen DDL correcto
- [ ] Las evaluaciones validan tiempo e intentos
- [ ] Los reportes devuelven datos correctos
- [ ] Swagger documenta todos los endpoints
- [ ] Docker Compose levanta todo con `docker compose up`

**Paso 16 — README final (Dev 5)**

El README debe incluir:

```markdown
# SQL Platform

## Setup rápido
\`\`\`bash
git clone <repo>
cp .env.example .env
docker compose up --build
\`\`\`

## Arquitectura
[Diagrama de componentes]

## Endpoints principales
[Tabla de endpoints con descripción]

## Decisiones técnicas
[Por qué se eligió cada tecnología]

## Autores y contribuciones
[Tabla con cada dev y sus módulos]
\`\`\`
```

---

## Entregas y rúbrica

### Entrega Parcial 1 — Semana 2

| Ítem | Dev responsable |
|---|---|
| Diseño de arquitectura y diagrama de componentes | D1 + todos |
| Modelo de dominio (entidades y relaciones) | D1 + D2 |
| Autenticación con JWT | D1 |
| Gestión básica de usuarios y roles | D1 |
| CRUD de cursos | D1 |
| CRUD de retos SQL | D2 |
| Carga básica de esquemas DDL | D2 |
| Generación inicial de datos de prueba | D2 |
| Docker Compose con API, PostgreSQL y Redis | D1 |
| Worker SQL en modo stub | D3 |
| Documentación inicial de la API (Swagger) | D1 + D5 |

### Entrega Final — Semana 5

| Ítem | Dev responsable |
|---|---|
| Evaluador SQL funcional | D3 |
| Envío de submissions | D3 |
| Procesamiento con Redis/BullMQ | D3 |
| Worker SQL funcional | D3 |
| Runner SQL con Docker | D3 |
| Generador de datos aleatorios completo | D2 |
| Medición de tiempo de ejecución | D3 |
| Comparación contra resultado esperado | D3 |
| Asistente inteligente (OBLIGATORIO) | D4 |
| Recomendaciones de optimización SQL | D4 |
| Sugerencia de índices con DDL | D4 |
| Reescritura sugerida de queries | D4 |
| Evaluaciones / parciales | D5 |
| Reportes por estudiante, reto y curso | D5 |
| Leaderboard | D5 |
| README completo | D5 |
| Video demostrativo | D5 + todos |
| Evidencia de ejecución con Docker Compose | D1 |

### Rúbrica de evaluación

| Criterio | Porcentaje | Dev principal |
|---|---|---|
| Diseño de dominio y Clean Architecture | 10% | D1 (todos) |
| API REST, autenticación y roles | 10% | D1 |
| Gestión de cursos, retos SQL y evaluaciones | 15% | D2 + D5 |
| Gestión de esquemas y generación de datos aleatorios | 10% | D2 |
| Evaluador automático SQL | 20% | D3 |
| Runner SQL con Docker y procesamiento con Redis | 15% | D3 |
| Asistente inteligente de optimización SQL | 10% | D4 |
| Reportes, leaderboard, documentación y video | 10% | D5 |
| **Total** | **100%** | |

> **Nota:** Los commits individuales en GitHub son evaluados por separado para cada estudiante. Cada desarrollador debe trabajar en su propia rama y hacer Pull Requests al branch principal.

---

*Documento generado para el equipo de desarrollo — Proyecto Final BD*