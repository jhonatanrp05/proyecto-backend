import { Injectable, Logger } from '@nestjs/common';
import * as Dockerode from 'dockerode';
import { Client } from 'pg';

export interface SqlRunnerInput {
  ddlScript: string;
  seedScript: string;
  studentQuery: string;
  timeLimitMs: number;
  // Consulta de referencia opcional (la "solución del profesor"). Si viene, se
  // ejecuta como superusuario en el mismo sandbox tras DDL+seed, y sus filas se
  // devuelven como `referenceRows` para que el processor las use como fuente de
  // verdad al comparar (evita mismatches de tipos DECIMAL/DATE vs JSON estático).
  referenceQuery?: string;
}

export type SqlRunnerStatus =
  | 'OK'
  | 'TIMEOUT'
  | 'SYNTAX_ERROR'
  | 'RUNTIME_ERROR';

export interface SqlRunnerOutput {
  status: SqlRunnerStatus;
  rows: Record<string, unknown>[];
  referenceRows?: Record<string, unknown>[];
  executionTimeMs: number;
  errorMessage?: string;
  executionPlan?: string;
}

@Injectable()
export class SqlRunnerService {
  private readonly logger = new Logger(SqlRunnerService.name);
  private readonly docker = new Dockerode();
  private readonly DB_PASSWORD = 'runner_secret';
  private readonly DB_NAME = 'evaldb';
  private readonly DB_USER = 'postgres';
  private readonly IMAGE = 'postgres:16';

  async run(input: SqlRunnerInput): Promise<SqlRunnerOutput> {
    const containerName = `sql-eval-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const runnerNetwork = process.env.RUNNER_NETWORK;
    const useDockerNetwork = Boolean(runnerNetwork);
    const hostPort = useDockerNetwork ? 0 : await this.getFreePort();
    let container: Dockerode.Container | null = null;

    try {
      await this.ensureImage();

      container = await this.docker.createContainer({
        Image: this.IMAGE,
        name: containerName,
        Env: [
          `POSTGRES_PASSWORD=${this.DB_PASSWORD}`,
          `POSTGRES_DB=${this.DB_NAME}`,
          `POSTGRES_USER=${this.DB_USER}`,
        ],
        HostConfig: {
          AutoRemove: true,
          Memory: 512 * 1024 * 1024, // 512 MB
          NanoCpus: 500_000_000, // 0.5 CPU
          ...(useDockerNetwork
            ? { NetworkMode: runnerNetwork }
            : {
              PortBindings: {
                '5432/tcp': [{ HostPort: String(hostPort) }],
              },
            }),
        },
        ExposedPorts: { '5432/tcp': {} },
      });

      await container.start();
      this.logger.debug(
        useDockerNetwork
          ? `Container ${containerName} started on network ${runnerNetwork}`
          : `Container ${containerName} started on port ${hostPort}`,
      );

      const client = await this.waitForPostgres(
        useDockerNetwork ? containerName : 'localhost',
        useDockerNetwork ? 5432 : hostPort,
      );

      try {
        await client.query(input.ddlScript);
        if (input.seedScript.trim()) {
          await client.query(input.seedScript);
        }

        // Ejecuta la consulta de referencia como superusuario tras DDL+seed.
        // Sus filas son la fuente de verdad para evaluar al estudiante, evitando
        // depender de un JSON estático que puede desincronizarse de los datos
        // sembrados. Un fallo aquí indica un challenge mal configurado, no un
        // fallo del estudiante: se propaga como RUNTIME_ERROR del runner.
        let referenceRows: Record<string, unknown>[] | undefined;
        if (input.referenceQuery?.trim()) {
          try {
            const refResult = await client.query(input.referenceQuery);
            referenceRows = (refResult as any).rows ?? [];
          } catch (refErr: any) {
            await client.end().catch(() => {});
            this.logger.error(
              `Reference query falló: ${refErr?.message}`,
            );
            return {
              status: 'RUNTIME_ERROR',
              rows: [],
              executionTimeMs: 0,
              errorMessage: `Reference query falló: ${refErr?.message}`,
            };
          }
        }

        // El DDL/seed se cargan como superusuario, pero la consulta del estudiante
        // se ejecuta con un rol sin privilegios y solo SELECT. Así no puede escribir,
        // borrar tablas, leer archivos del servidor (pg_read_file) ni ejecutar
        // comandos (COPY ... TO PROGRAM), aunque el contenedor ya sea efímero.
        await client.query(
          `CREATE ROLE sandbox NOSUPERUSER NOCREATEDB NOCREATEROLE NOLOGIN;
           GRANT USAGE ON SCHEMA public TO sandbox;
           GRANT SELECT ON ALL TABLES IN SCHEMA public TO sandbox;`,
        );

        // Límite de tiempo del lado del servidor: Postgres cancela la consulta al
        // superar el límite (error 57014), liberando recursos de inmediato. El
        // Promise.race queda como backstop ante cuelgues de conexión.
        await client.query(
          `SET statement_timeout = ${Math.ceil(input.timeLimitMs)}`,
        );
        await client.query('SET ROLE sandbox');

        const start = Date.now();
        const result = await Promise.race([
          client.query(input.studentQuery),
          this.timeout(input.timeLimitMs + 2000),
        ]);
        const executionTimeMs = Date.now() - start;

        // EXPLAIN ANALYZE en una transacción con ROLLBACK para no modificar datos
        // si la consulta es UPDATE/DELETE/INSERT. Best-effort: si falla no se
        // propaga, simplemente no se incluye el plan en la respuesta.
        const executionPlan = await this.captureExplainPlan(
          client,
          input.studentQuery,
        );

        await client.end();

        return {
          status: 'OK',
          rows: (result as any).rows ?? [],
          referenceRows,
          executionTimeMs,
          executionPlan,
        };
      } catch (err: any) {
        await client.end().catch(() => { });
        return this.classifyError(err);
      }
    } catch (err: any) {
      if (err?.message === '__TIMEOUT__') {
        return {
          status: 'TIMEOUT',
          rows: [],
          executionTimeMs: input.timeLimitMs,
        };
      }
      this.logger.error(`Runner error: ${err?.message}`);
      return {
        status: 'RUNTIME_ERROR',
        rows: [],
        executionTimeMs: 0,
        errorMessage: err?.message,
      };
    } finally {
      if (container) {
        container.stop().catch(() => { });
      }
    }
  }

  // Descarga la imagen del runner si no está presente, evitando que la primera
  // evaluación falle en un entorno limpio.
  private async ensureImage(): Promise<void> {
    const images = await this.docker.listImages({
      filters: { reference: [this.IMAGE] },
    });
    if (images.length > 0) return;

    this.logger.log(`Descargando imagen ${this.IMAGE}...`);
    await new Promise<void>((resolve, reject) => {
      this.docker.pull(
        this.IMAGE,
        (err: any, stream: NodeJS.ReadableStream) => {
          if (err) return reject(err);
          this.docker.modem.followProgress(stream, (e: any) =>
            e ? reject(e) : resolve(),
          );
        },
      );
    });
  }

  private async captureExplainPlan(
    client: Client,
    studentQuery: string,
  ): Promise<string | undefined> {
    try {
      const trimmed = studentQuery.trim().replace(/;\s*$/, '');
      await client.query('BEGIN');
      const explain = await client.query(
        `EXPLAIN (ANALYZE, FORMAT TEXT) ${trimmed}`,
      );
      await client.query('ROLLBACK');
      const lines = (explain.rows as Array<Record<string, string>>).map(
        (r) => r['QUERY PLAN'],
      );
      return lines.join('\n');
    } catch (err: any) {
      await client.query('ROLLBACK').catch(() => { });
      this.logger.debug(`EXPLAIN ANALYZE no disponible: ${err?.message}`);
      return undefined;
    }
  }

  private async waitForPostgres(
    host: string,
    port: number,
    timeoutMs = 30_000,
  ): Promise<Client> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const client = new Client({
        host,
        port,
        user: this.DB_USER,
        password: this.DB_PASSWORD,
        database: this.DB_NAME,
        connectionTimeoutMillis: 2000,
      });
      try {
        await client.connect();
        return client;
      } catch {
        await new Promise((r) => setTimeout(r, 500));
      }
    }
    throw new Error('Postgres container did not become ready in time');
  }

  private timeout(ms: number): Promise<never> {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error('__TIMEOUT__')), ms),
    );
  }

  private classifyError(err: any): SqlRunnerOutput {
    const msg: string = err?.message ?? '';
    if (err?.message === '__TIMEOUT__') {
      return { status: 'TIMEOUT', rows: [], executionTimeMs: 0 };
    }
    // PostgreSQL cancela por statement_timeout con el código 57014
    if (err?.code === '57014') {
      return { status: 'TIMEOUT', rows: [], executionTimeMs: 0 };
    }
    // Error de sintaxis: solo 42601. Otros 42xxx (permiso denegado 42501,
    // tabla/columna inexistente 42P01/42703) son errores de ejecución.
    if (err?.code === '42601' || /syntax error/i.test(msg)) {
      return {
        status: 'SYNTAX_ERROR',
        rows: [],
        executionTimeMs: 0,
        errorMessage: msg,
      };
    }
    return {
      status: 'RUNTIME_ERROR',
      rows: [],
      executionTimeMs: 0,
      errorMessage: msg,
    };
  }

  private async getFreePort(): Promise<number> {
    return new Promise((resolve, reject) => {
      const net = require('net');
      const server = net.createServer();
      server.listen(0, () => {
        const port = server.address().port;
        server.close(() => resolve(port));
      });
      server.on('error', reject);
    });
  }
}
