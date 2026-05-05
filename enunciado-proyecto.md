

# Proyecto Final

## Plataforma inteligente para evaluación y optimización de SQL

## Introducción

Construir una plataforma backend que permita evaluar automáticamente consultas SQL enviadas por estudiantes, similar a un juez online, pero orientado al aprendizaje de bases de datos, análisis de rendimiento y optimización de consultas.

El sistema debe permitir que un profesor cree retos SQL, defina esquemas de base de datos, cargue o genere datos de prueba, configure resultados esperados y evalúe automáticamente las soluciones enviadas por los estudiantes.

Además de validar si una consulta produce el resultado correcto, la plataforma deberá analizar su rendimiento y generar recomendaciones en lenguaje natural mediante un asistente inteligente.

---

## Objetivo general

Diseñar e implementar el MVP de una plataforma backend para evaluar automáticamente consultas SQL, medir su rendimiento y generar recomendaciones inteligentes de optimización, siguiendo:

* Clean Architecture
* Procesamiento asíncrono
* Ejecución controlada con Docker
* Organización académica por cursos y evaluaciones

---

## Reglas del proyecto

* Modalidad: equipos de máximo 4 estudiantes
* Duración: 5 semanas
* Entregas: 2 parciales
* Arquitectura: Clean Architecture
* Stack sugerido: Node.js + NestJS, PostgreSQL, Redis, Docker Compose, JWT

---

# Módulos a desarrollar

---

## Módulo 1 — Gestión de usuarios, roles y cursos

### Roles del sistema

* ADMIN
* PROFESSOR
* STUDENT

### Permisos

#### ADMIN

* Gestionar usuarios
* Gestionar profesores
* Gestionar cursos
* Consultar información

#### PROFESSOR

* Crear cursos
* Inscribir estudiantes
* Crear retos SQL
* Crear evaluaciones
* Revisar resultados
* Consultar reportes

#### STUDENT

* Ver cursos inscritos
* Consultar retos
* Enviar soluciones SQL
* Consultar resultados
* Ver recomendaciones

---

### Autenticación

Uso de **JWT**:

* Login con email/password
* Retorna token con rol
* Validación en endpoints protegidos

---

### Gestión de cursos

```json
{
  "name": "Bases de Datos II",
  "code": "BD2-2026",
  "period": "2026-1",
  "group": "1",
  "professorId": "prof-101"
}
```

Cada curso incluye:

* Nombre
* Código
* Periodo
* Profesor
* Estudiantes
* Retos
* Evaluaciones

---

## Módulo 2 — Retos SQL y datos de prueba

### Ejemplo de reto

```json
{
  "title": "Clientes con más de tres compras",
  "description": "Consulta SQL para clientes con más de 3 compras",
  "difficulty": "Medium",
  "tags": ["SELECT", "JOIN", "GROUP BY", "HAVING"],
  "databaseEngine": "PostgreSQL",
  "timeLimit": 2000,
  "status": "published"
}
```

### Estados

* draft
* published
* archived

---

### Esquema

```sql
CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  city VARCHAR(80)
);

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  customer_id INT,
  total DECIMAL(10,2),
  created_at DATE
);
```

---

### Datos de prueba

```sql
INSERT INTO customers (name, city) VALUES
('Ana Pérez', 'Bogotá'),
('Carlos Ruiz', 'Medellín');

INSERT INTO orders (customer_id, total, created_at) VALUES
(1, 150000, '2026-01-10');
```

---

### Generador de datos

Configuración:

```json
{
  "table": "orders",
  "rows": 10000,
  "fields": {
    "total": { "type": "decimal", "min": 10000, "max": 5000000 },
    "created_at": { "type": "date" }
  }
}
```

---

## Módulo 3 — Evaluación automática

### Submission

```json
{
  "id": "subm-101",
  "query": "SELECT ...",
  "status": "QUEUED"
}
```

### Estados

* QUEUED
* RUNNING
* ACCEPTED
* WRONG_ANSWER
* SYNTAX_ERROR
* TIME_LIMIT_EXCEEDED
* RUNTIME_ERROR
* OPTIMIZATION_REQUIRED

---

### Flujo

1. Guardar submission
2. Enviar a cola
3. Crear DB temporal
4. Ejecutar query
5. Comparar resultado
6. Medir tiempo
7. Calificar

---

### Resultado

```json
{
  "status": "ACCEPTED",
  "score": 100,
  "executionTimeMs": 120
}
```

---

### Evaluación

* Resultado: 60%
* Tiempo: 15%
* Uso SQL: 10%
* Claridad: 5%
* Mejora: 10%

---

## Módulo 4 — Procesamiento asíncrono

### Flujo

```
API → Redis → Worker → Docker → Resultado
```

### API

* Recibir submission
* Enviar a cola
* Consultar estado

### Worker

* Consumir cola
* Ejecutar runner
* Guardar resultado

---

### Docker

```bash
docker run --rm \
  --memory 512m \
  --cpus 0.5 \
  postgres:16
```

---

### Requisitos

* DB aislada
* Ambiente temporal
* Control de CPU/memoria
* Eliminación del contenedor

---

## Módulo 5 — Asistente inteligente

### Analiza

* Query
* Esquema
* Joins
* Filtros
* Tiempo

### Genera

* Explicación
* Recomendaciones
* Índices
* Reescritura

---

### Ejemplo

Consulta:

```sql
SELECT * FROM orders o
JOIN customers c ON o.customer_id = c.id
WHERE c.city = 'Bogotá';
```

Recomendaciones:

* Evitar `SELECT *`
* Crear índices
* Optimizar joins

---

### Reescritura

```sql
SELECT DISTINCT c.name
FROM customers c
JOIN orders o ON c.id = o.customer_id
WHERE o.total > 100000;
```

---

### Implementación

* Reglas
* IA
* Híbrido

---

## Módulo 6 — Evaluaciones

### Ejemplo

* Parcial SQL
* 4 retos
* Duración: 90 min
* Intentos: 3

---

## Componentes

1. API (NestJS)
2. PostgreSQL
3. Redis
4. Worker
5. Runner Docker
6. Servicio IA

---

## Flujo general

1. Profesor crea curso
2. Crea reto
3. Define esquema
4. Publica
5. Estudiante envía query
6. Se evalúa
7. Se generan recomendaciones

---

## Entregas

### Parcial (Semana 2)

* Arquitectura
* CRUD
* JWT
* Docker base

### Final (Semana 5)

* Evaluador SQL
* Worker + Redis
* Docker runner
* IA
* Reportes

---

## Rúbrica

| Criterio       | %  |
| -------------- | -- |
| Arquitectura   | 10 |
| API y auth     | 10 |
| Gestión        | 15 |
| Datos          | 10 |
| Evaluador      | 20 |
| Docker + Redis | 15 |
| IA             | 10 |
| Reportes       | 10 |

**Total: 100%**

