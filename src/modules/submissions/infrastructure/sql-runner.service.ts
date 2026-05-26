import { Injectable, Logger } from '@nestjs/common';
import * as Dockerode from 'dockerode';
import { Client } from 'pg';

export interface SqlRunnerInput {
  ddlScript: string;
  seedScript: string;
  studentQuery: string;
  timeLimitMs: number;
}

export type SqlRunnerStatus =
  | 'OK'
  | 'TIMEOUT'
  | 'SYNTAX_ERROR'
  | 'RUNTIME_ERROR';

export interface SqlRunnerOutput {
  status: SqlRunnerStatus;
  rows: Record<string, unknown>[];
  executionTimeMs: number;
  errorMessage?: string;
  // Plan de ejecución capturado con EXPLAIN ANALYZE tras la corrida principal
  // (solo se intenta cuando status === 'OK'). Opcional según el enunciado.
  executionPlan?: string;
}

@Injectable()
export class SqlRunnerService {
  private readonly logger = new Logger(SqlRunnerService.name);
  private readonly docker = new Dockerode();
  private readonly DB_PASSWORD = 'runner_secret';
  private readonly DB_NAME = 'evaldb';
  private readonly DB_USER = 'postgres';

  async run(input: SqlRunnerInput): Promise<SqlRunnerOutput> {
    const containerName = `sql-eval-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    // Si RUNNER_NETWORK está definida (caso docker-compose), el worker y el runner
    // se hablan por la red interna de Docker y no se expone puerto al host. Si no,
    // se mantiene el comportamiento de port-binding al host (worker corriendo nativo).
    const runnerNetwork = process.env.RUNNER_NETWORK;
    const useDockerNetwork = Boolean(runnerNetwork);
    const hostPort = useDockerNetwork ? 0 : await this.getFreePort();
    let container: Dockerode.Container | null = null;

    try {
      container = await this.docker.createContainer({
        Image: 'postgres:16',
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

        const start = Date.now();
        const result = await Promise.race([
          client.query(input.studentQuery),
          this.timeout(input.timeLimitMs),
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
          executionTimeMs,
          executionPlan,
        };
      } catch (err: any) {
        await client.end().catch(() => {});
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
        container.stop().catch(() => {});
      }
    }
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
      await client.query('ROLLBACK').catch(() => {});
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
    // PostgreSQL syntax error codes: 42xxx
    if (err?.code?.startsWith('42') || /syntax error/i.test(msg)) {
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
