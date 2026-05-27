import { PrismaClient, Role } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcrypt';

dotenv.config();

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });
const seedPassword = process.env.SEED_DEFAULT_PASSWORD ?? 'Pass1234!';

// IDs fijos (UUID v4 válidos) para que las sesiones en el navegador
// (localStorage) sigan siendo válidas tras re-ejecutar el seed y para que
// pasen los validadores @IsUUID(4) del backend.
const ADMIN_ID = '11111111-1111-4111-8111-111111111111';
const PROFESSOR_OAK_ID = 'bc96c53e-3f1f-4fdc-9366-d64e0d61768e';
const PROFESSOR_BIRCH_ID = '22222222-2222-4222-8222-222222222222';
const STUDENT_ASH_ID = '33333333-3333-4333-8333-333333333333';
const STUDENT_MISTY_ID = '44444444-4444-4444-8444-444444444444';
const STUDENT_BROCK_ID = '55555555-5555-4555-8555-555555555555';
const STUDENT_GARY_ID = '66666666-6666-4666-8666-666666666666';
const STUDENT_MAY_ID = '77777777-7777-4777-8777-777777777777';
const STUDENT_DAWN_ID = '88888888-8888-4888-8888-888888888888';

const COURSE_DB_ID = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaa1';
const COURSE_ALGO_ID = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaa2';
const COURSE_WEB_ID = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaa3';

const STATUS_BY_INDEX = [
  'ACCEPTED',
  'WRONG_ANSWER',
  'ACCEPTED',
  'OPTIMIZATION_REQUIRED',
  'SYNTAX_ERROR',
  'ACCEPTED',
  'TIME_LIMIT_EXCEEDED',
  'ACCEPTED',
] as const;

type SubStatus = (typeof STATUS_BY_INDEX)[number];

function scoreForStatus(status: SubStatus): number {
  switch (status) {
    case 'ACCEPTED':
      return 90 + Math.floor(Math.random() * 11); // 90-100
    case 'OPTIMIZATION_REQUIRED':
      return 60 + Math.floor(Math.random() * 20); // 60-79
    case 'WRONG_ANSWER':
      return 20 + Math.floor(Math.random() * 30); // 20-49
    default:
      return 0;
  }
}

function execMsForStatus(status: SubStatus): number {
  if (status === 'TIME_LIMIT_EXCEEDED') return 9000 + Math.floor(Math.random() * 1000);
  return 200 + Math.floor(Math.random() * 1800);
}

async function main() {
  console.log('Seed: limpiando base de datos...');
  await prisma.recommendation.deleteMany();
  await prisma.submissionResult.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.assessmentAttempt.deleteMany();
  await prisma.assessmentChallenge.deleteMany();
  await prisma.assessment.deleteMany();
  await prisma.expectedResult.deleteMany();
  await prisma.seedData.deleteMany();
  await prisma.challengeSchema.deleteMany();
  await prisma.challenge.deleteMany();
  await prisma.courseStudent.deleteMany();
  await prisma.course.deleteMany();
  await prisma.user.deleteMany();

  console.log('Seed: creando usuarios...');
  const hashedPassword = await bcrypt.hash(seedPassword, 10);

  const admin = await prisma.user.create({
    data: {
      id: ADMIN_ID,
      email: process.env.SEED_ADMIN_EMAIL ?? 'admin@test.com',
      password: hashedPassword,
      name: 'Admin',
      role: Role.ADMIN,
    },
  });

  const professorOak = await prisma.user.create({
    data: {
      id: PROFESSOR_OAK_ID,
      email: process.env.SEED_PROFESSOR_EMAIL ?? 'prof@test.com',
      password: hashedPassword,
      name: 'Profesor Oak',
      role: Role.PROFESSOR,
    },
  });

  const professorBirch = await prisma.user.create({
    data: {
      id: PROFESSOR_BIRCH_ID,
      email: 'birch@test.com',
      password: hashedPassword,
      name: 'Profesor Birch',
      role: Role.PROFESSOR,
    },
  });

  const studentsData = [
    { id: STUDENT_ASH_ID, email: process.env.SEED_STUDENT_EMAIL ?? 'student@test.com', name: 'Ash Ketchum' },
    { id: STUDENT_MISTY_ID, email: 'misty@test.com', name: 'Misty Waterflower' },
    { id: STUDENT_BROCK_ID, email: 'brock@test.com', name: 'Brock Harrison' },
    { id: STUDENT_GARY_ID, email: 'gary@test.com', name: 'Gary Oak' },
    { id: STUDENT_MAY_ID, email: 'may@test.com', name: 'May Maple' },
    { id: STUDENT_DAWN_ID, email: 'dawn@test.com', name: 'Dawn Berlitz' },
  ];

  const students = [] as Awaited<ReturnType<typeof prisma.user.create>>[];
  for (const s of studentsData) {
    students.push(
      await prisma.user.create({
        data: {
          id: s.id,
          email: s.email,
          password: hashedPassword,
          name: s.name,
          role: Role.STUDENT,
        },
      }),
    );
  }

  console.log('Seed: creando cursos...');
  const courseDB = await prisma.course.create({
    data: {
      id: COURSE_DB_ID,
      name: 'Bases de Datos Avanzadas',
      code: 'DB-401',
      period: '2026-1',
      group: 'A1',
      professorId: professorOak.id,
    },
  });

  const courseAlgo = await prisma.course.create({
    data: {
      id: COURSE_ALGO_ID,
      name: 'Algoritmia II',
      code: 'ALGO-202',
      period: '2026-1',
      group: 'B2',
      professorId: professorOak.id,
    },
  });

  const courseWeb = await prisma.course.create({
    data: {
      id: COURSE_WEB_ID,
      name: 'Desarrollo Web',
      code: 'WEB-301',
      period: '2026-1',
      group: 'C1',
      professorId: professorBirch.id,
    },
  });

  console.log('Seed: matriculando estudiantes...');
  // Oak / DB: todos los estudiantes
  for (const s of students) {
    await prisma.courseStudent.create({
      data: { courseId: courseDB.id, studentId: s.id },
    });
  }
  // Oak / Algo: 4 estudiantes
  for (const s of students.slice(0, 4)) {
    await prisma.courseStudent.create({
      data: { courseId: courseAlgo.id, studentId: s.id },
    });
  }
  // Birch / Web: 3 estudiantes (incluyendo a Ash para que tenga curso de otro profe)
  for (const s of [students[0], students[2], students[4]]) {
    await prisma.courseStudent.create({
      data: { courseId: courseWeb.id, studentId: s.id },
    });
  }

  console.log('Seed: creando challenges...');
  type ChallengeBlueprint = {
    title: string;
    description: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    tags: string[];
    courseId: string;
    createdBy: string;
    ddl: string;
    // INSERT statements coherentes con el DDL; el runner los ejecuta tras el DDL
    // y antes de la reference query, así que tablas, columnas y volumetría deben
    // alinearse con lo que la consulta de referencia espera leer.
    insertScript: string;
    expectedQuery: string;
    expectedOutput: Record<string, unknown>[];
  };

  const challengeBlueprints: ChallengeBlueprint[] = [
    {
      title: 'Top 5 clientes por ventas',
      description: 'Devuelve los 5 clientes con mayor monto total en orders.',
      difficulty: 'Medium',
      tags: ['JOIN', 'AGGREGATE', 'ORDER BY'],
      courseId: courseDB.id,
      createdBy: professorOak.id,
      ddl: 'CREATE TABLE customers (id INT PRIMARY KEY, name VARCHAR(100)); CREATE TABLE orders (id INT PRIMARY KEY, customer_id INT, total DECIMAL);',
      insertScript: `
        INSERT INTO customers (id, name) VALUES
          (1, 'Cliente A'),
          (2, 'Cliente B'),
          (3, 'Cliente C'),
          (4, 'Cliente D'),
          (5, 'Cliente E'),
          (6, 'Cliente F');
        INSERT INTO orders (id, customer_id, total) VALUES
          (1, 1, 5000), (2, 1, 4800),
          (3, 2, 4000), (4, 2, 3400),
          (5, 3, 3500),
          (6, 4, 2000),
          (7, 5, 1500),
          (8, 6, 100);
      `,
      expectedQuery:
        'SELECT c.name, SUM(o.total) AS total FROM customers c JOIN orders o ON o.customer_id = c.id GROUP BY c.name ORDER BY total DESC LIMIT 5;',
      expectedOutput: [
        { name: 'Cliente A', total: 9800 },
        { name: 'Cliente B', total: 7400 },
        { name: 'Cliente C', total: 3500 },
        { name: 'Cliente D', total: 2000 },
        { name: 'Cliente E', total: 1500 },
      ],
    },
    {
      title: 'Optimización de WHERE',
      description: 'Evita funciones sobre columnas en el WHERE.',
      difficulty: 'Easy',
      tags: ['WHERE', 'OPTIMIZATION'],
      courseId: courseDB.id,
      createdBy: professorOak.id,
      ddl: 'CREATE TABLE customers (id INT PRIMARY KEY, name VARCHAR(100), registration_date DATE);',
      insertScript: `
        INSERT INTO customers (id, name, registration_date) VALUES
          (1, 'Cliente X', DATE '2023-06-15'),
          (2, 'Cliente Y', DATE '2022-12-31'),
          (3, 'Cliente Z', DATE '2024-01-01'),
          (4, 'Cliente W', DATE '2023-11-30');
      `,
      expectedQuery:
        "SELECT name FROM customers WHERE registration_date >= DATE '2023-01-01' AND registration_date < DATE '2024-01-01';",
      expectedOutput: [{ name: 'Cliente X' }, { name: 'Cliente W' }],
    },
    {
      title: 'JOIN con índice cubriente',
      description: 'Optimiza un JOIN aprovechando un índice cubriente.',
      difficulty: 'Hard',
      tags: ['JOIN', 'INDEX'],
      courseId: courseDB.id,
      createdBy: professorOak.id,
      ddl: 'CREATE TABLE orders (id INT PRIMARY KEY, customer_id INT, order_date DATE);',
      insertScript: `
        INSERT INTO orders (id, customer_id, order_date) VALUES
          (100, 1, DATE '2024-03-01'),
          (101, 1, DATE '2024-04-15'),
          (102, 1, DATE '2023-12-31'),
          (103, 2, DATE '2024-05-10'),
          (104, 2, DATE '2023-08-22');
      `,
      expectedQuery:
        "SELECT id FROM orders WHERE customer_id = 1 AND order_date >= DATE '2024-01-01';",
      expectedOutput: [{ id: 100 }, { id: 101 }],
    },
    {
      title: 'Búsqueda binaria',
      description: 'Implementa búsqueda binaria sobre arreglo ordenado.',
      difficulty: 'Easy',
      tags: ['SEARCH', 'ARRAY'],
      courseId: courseAlgo.id,
      createdBy: professorOak.id,
      ddl: 'CREATE TABLE numbers (id INT PRIMARY KEY, value INT);',
      insertScript: `
        INSERT INTO numbers (id, value) VALUES
          (1, 5), (2, 10), (3, 17), (4, 22), (5, 30),
          (6, 35), (7, 42), (8, 56), (9, 70), (10, 88);
      `,
      expectedQuery: 'SELECT id FROM numbers WHERE value = 42;',
      expectedOutput: [{ id: 7 }],
    },
    {
      title: 'Recorrido en grafo',
      description: 'Encuentra el camino más corto entre dos nodos.',
      difficulty: 'Hard',
      tags: ['GRAPH', 'BFS'],
      courseId: courseAlgo.id,
      createdBy: professorOak.id,
      ddl: 'CREATE TABLE edges (id INT PRIMARY KEY, src INT, dst INT, weight INT);',
      insertScript: `
        INSERT INTO edges (id, src, dst, weight) VALUES
          (1, 1, 2, 3),
          (2, 2, 3, 4),
          (3, 3, 1, 5),
          (4, 2, 4, 7);
      `,
      expectedQuery: 'SELECT id, src, dst, weight FROM edges WHERE src = 1;',
      expectedOutput: [{ id: 1, src: 1, dst: 2, weight: 3 }],
    },
    {
      title: 'CRUD de productos',
      description: 'Diseña endpoints CRUD para una tabla products.',
      difficulty: 'Medium',
      tags: ['CRUD', 'REST'],
      courseId: courseWeb.id,
      createdBy: professorBirch.id,
      ddl: 'CREATE TABLE products (id INT PRIMARY KEY, name VARCHAR(100), price DECIMAL);',
      insertScript: `
        INSERT INTO products (id, name, price) VALUES
          (1, 'Bola', 10),
          (2, 'Cuerda', 25),
          (3, 'Aro', 8);
      `,
      expectedQuery: 'SELECT id, name, price FROM products ORDER BY name;',
      expectedOutput: [
        { id: 3, name: 'Aro', price: 8 },
        { id: 1, name: 'Bola', price: 10 },
        { id: 2, name: 'Cuerda', price: 25 },
      ],
    },
  ];

  const createdChallenges = [] as Array<{ id: string; courseId: string; title: string }>;
  for (const c of challengeBlueprints) {
    const challenge = await prisma.challenge.create({
      data: {
        title: c.title,
        description: c.description,
        difficulty: c.difficulty,
        tags: c.tags,
        databaseEngine: 'postgresql',
        timeLimit: 5000,
        status: 'published',
        courseId: c.courseId,
        createdBy: c.createdBy,
        schema: { create: { ddlScript: c.ddl } },
        seedData: {
          create: {
            insertScript: c.insertScript,
          },
        },
        expectedResult: {
          create: {
            query: c.expectedQuery,
            outputJson: c.expectedOutput as unknown as object,
          },
        },
      },
    });
    createdChallenges.push({
      id: challenge.id,
      courseId: challenge.courseId,
      title: challenge.title,
    });
  }

  console.log('Seed: creando submissions con resultados...');
  // Para cada estudiante matriculado en un curso, generar 1-2 submissions
  // por challenge del curso, con resultados variados.
  let submissionIndex = 0;
  for (const challenge of createdChallenges) {
    const enrollments = await prisma.courseStudent.findMany({
      where: { courseId: challenge.courseId },
      select: { studentId: true },
    });
    for (const { studentId } of enrollments) {
      const submissionsPerStudent = 1 + (submissionIndex % 2);
      for (let i = 0; i < submissionsPerStudent; i++) {
        const status = STATUS_BY_INDEX[submissionIndex % STATUS_BY_INDEX.length];
        const score = scoreForStatus(status);
        const execMs = execMsForStatus(status);
        submissionIndex++;

        await prisma.submission.create({
          data: {
            engine: 'postgresql',
            query: `SELECT * FROM example WHERE id = ${i + 1};`,
            status,
            studentId,
            challengeId: challenge.id,
            result: {
              create: {
                status,
                score,
                executionTimeMs: execMs,
                tests: [
                  { name: 'case_1', passed: status === 'ACCEPTED' },
                  { name: 'case_2', passed: status === 'ACCEPTED' || status === 'OPTIMIZATION_REQUIRED' },
                ],
              },
            },
          },
        });
      }
    }
  }

  console.log('Seed: creando assessments...');
  const now = new Date();
  const oneWeek = 7 * 24 * 60 * 60 * 1000;

  const challengesByCourse = new Map<string, string[]>();
  for (const c of createdChallenges) {
    const list = challengesByCourse.get(c.courseId) ?? [];
    list.push(c.id);
    challengesByCourse.set(c.courseId, list);
  }

  // Evaluación ACTIVA en curso DB
  const activeAssessment = await prisma.assessment.create({
    data: {
      name: 'Parcial 1: SQL Básico',
      description: 'Evaluación parcial con 2 challenges.',
      startDate: new Date(now.getTime() - oneWeek),
      endDate: new Date(now.getTime() + oneWeek),
      duration: 60,
      maxAttempts: 3,
      visibility: true,
      courseId: courseDB.id,
    },
  });
  const dbChallenges = challengesByCourse.get(courseDB.id) ?? [];
  for (let i = 0; i < Math.min(2, dbChallenges.length); i++) {
    await prisma.assessmentChallenge.create({
      data: {
        assessmentId: activeAssessment.id,
        challengeId: dbChallenges[i],
        order: i + 1,
      },
    });
  }

  // Evaluación PROGRAMADA (futura) en Algo
  const scheduledAssessment = await prisma.assessment.create({
    data: {
      name: 'Quiz Algoritmia',
      description: 'Quiz corto sobre estructuras de datos.',
      startDate: new Date(now.getTime() + oneWeek),
      endDate: new Date(now.getTime() + 2 * oneWeek),
      duration: 45,
      maxAttempts: 2,
      visibility: true,
      courseId: courseAlgo.id,
    },
  });
  const algoChallenges = challengesByCourse.get(courseAlgo.id) ?? [];
  for (let i = 0; i < algoChallenges.length; i++) {
    await prisma.assessmentChallenge.create({
      data: {
        assessmentId: scheduledAssessment.id,
        challengeId: algoChallenges[i],
        order: i + 1,
      },
    });
  }

  // Un intento de evaluación de Ash sobre el parcial activo
  await prisma.assessmentAttempt.create({
    data: {
      assessmentId: activeAssessment.id,
      studentId: STUDENT_ASH_ID,
      startedAt: new Date(now.getTime() - 3 * 60 * 60 * 1000),
      finishedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      score: 85,
    },
  });

  console.log('Seed completado.');
  console.log('Credenciales:');
  console.log(`  Admin:     ${admin.email}     / ${seedPassword}`);
  console.log(`  Profesor:  ${professorOak.email}      / ${seedPassword}`);
  console.log(`  Profesor:  ${professorBirch.email}     / ${seedPassword}`);
  console.log(`  Estudiante: ${students[0].email}  / ${seedPassword}`);
  console.log(`  (otros estudiantes: misty/brock/gary/may/dawn @test.com)`);
}

main()
  .catch((e) => {
    console.error('Error ejecutando el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
