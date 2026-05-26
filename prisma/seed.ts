import { PrismaClient, Role } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';

dotenv.config();

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Iniciando seeder para el módulo Recommendations...');

  // 1. Limpiar la base de datos (Opcional, en cascada)
  console.log('🧹 Limpiando base de datos...');
  await prisma.submission.deleteMany();
  await prisma.challengeSchema.deleteMany();
  await prisma.challenge.deleteMany();
  await prisma.course.deleteMany();
  await prisma.user.deleteMany();

  // 2. Crear Usuarios (Student y Professor)
  console.log('👤 Creando usuarios...');
  const professor = await prisma.user.create({
    data: {
      email: 'profesor@ejemplo.com',
      password: 'hashed_password', // Mock
      name: 'Profesor Oak',
      role: Role.PROFESSOR,
    },
  });

  const student = await prisma.user.create({
    data: {
      email: 'alumno@ejemplo.com',
      password: 'hashed_password', // Mock
      name: 'Ash Ketchum',
      role: Role.STUDENT,
    },
  });

  // 3. Crear Curso
  console.log('📚 Creando curso...');
  const course = await prisma.course.create({
    data: {
      name: 'Bases de Datos Avanzadas',
      code: 'DB-401',
      period: '2026-1',
      group: 'A1',
      professorId: professor.id,
    },
  });

  // 4. Crear Reto (Challenge) con Esquema (ChallengeSchema)
  console.log('🎯 Creando challenge...');
  const challenge = await prisma.challenge.create({
    data: {
      title: 'Análisis de Ventas',
      description: 'Optimiza consultas sobre el esquema de ventas y clientes.',
      difficulty: 'INTERMEDIATE',
      tags: ['JOIN', 'OPTIMIZATION', 'INDEXES'],
      databaseEngine: 'postgresql',
      timeLimit: 1000,
      courseId: course.id,
      createdBy: professor.id,
      schema: {
        create: {
          ddlScript: `CREATE TABLE customers (id INT PRIMARY KEY, name VARCHAR(100), registration_date DATE); CREATE TABLE orders (id INT PRIMARY KEY, customer_id INT, total DECIMAL, order_date DATE);`,
        },
      },
    },
  });

  // 5. Crear Submissions (Los Casos de Prueba)
  console.log('📝 Creando submissions de prueba...');

  // Submission 1 (Caso SELECT *)
  await prisma.submission.create({
    data: {
      engine: 'postgresql',
      query: 'SELECT * FROM orders JOIN customers ON orders.customer_id = customers.id;',
      studentId: student.id,
      challengeId: challenge.id,
    },
  });

  // Submission 2 (Caso Función en WHERE)
  await prisma.submission.create({
    data: {
      engine: 'postgresql',
      query: 'SELECT name FROM customers WHERE EXTRACT(YEAR FROM registration_date) = 2023;',
      studentId: student.id,
      challengeId: challenge.id,
    },
  });

  // Submission 3 (Caso de Optimización de Índices)
  await prisma.submission.create({
    data: {
      engine: 'postgresql',
      query: "SELECT c.name, SUM(o.total) FROM customers c JOIN orders o ON c.id = o.customer_id WHERE c.name LIKE '%Gomez%' GROUP BY c.name ORDER BY SUM(o.total) DESC;",
      studentId: student.id,
      challengeId: challenge.id,
    },
  });

  console.log('Seed completado con éxito!');
}

main()
  .catch((e) => {
    console.error('Error ejecutando el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
