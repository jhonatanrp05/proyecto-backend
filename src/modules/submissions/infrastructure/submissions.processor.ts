import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../../shared/prisma';
import { SUBMISSIONS_QUEUE } from '../application/submissions.service';
import { SqlRunnerService } from './sql-runner.service';
import { SqlAnalyzerService } from '../../recommendations/application/sql-analyzer.service';

interface EvaluateJobData {
  submissionId: string;
}

@Processor(SUBMISSIONS_QUEUE)
export class SubmissionsProcessor extends WorkerHost {
  private readonly logger = new Logger(SubmissionsProcessor.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    private readonly sqlRunner: SqlRunnerService,
    private readonly sqlAnalyzer: SqlAnalyzerService,
  ) {
    super();
  }

  async process(job: Job<EvaluateJobData>): Promise<void> {
    const { submissionId } = job.data;
    this.logger.log(`Procesando submission ${submissionId}`);

    await this.prisma.submission.update({
      where: { id: submissionId },
      data: { status: 'RUNNING' },
    });

    try {
      const submission = await this.prisma.submission.findUnique({
        where: { id: submissionId },
        include: {
          challenge: {
            include: {
              schema: true,
              seedData: true,
              expectedResult: true,
            },
          },
        },
      });

      if (!submission) {
        this.logger.error(`Submission ${submissionId} no encontrada`);
        return;
      }

      const { challenge } = submission;

      if (!challenge.schema || !challenge.expectedResult) {
        await this.finalize(submissionId, 'RUNTIME_ERROR', 0, 0, [
          {
            caseId: 1,
            status: 'ERROR',
            message:
              'El reto no tiene esquema o resultado esperado configurado',
          },
        ]);
        return;
      }

      const runnerOutput = await this.sqlRunner.run({
        ddlScript: challenge.schema.ddlScript,
        seedScript: challenge.seedData?.insertScript ?? '',
        studentQuery: submission.query,
        timeLimitMs: challenge.timeLimit,
      });

      if (runnerOutput.status === 'TIMEOUT') {
        await this.finalize(
          submissionId,
          'TIME_LIMIT_EXCEEDED',
          0,
          challenge.timeLimit,
          [],
        );
        return;
      }

      if (runnerOutput.status === 'SYNTAX_ERROR') {
        await this.finalize(
          submissionId,
          'SYNTAX_ERROR',
          0,
          runnerOutput.executionTimeMs,
          [],
        );
        return;
      }

      if (runnerOutput.status === 'RUNTIME_ERROR') {
        await this.finalize(
          submissionId,
          'RUNTIME_ERROR',
          0,
          runnerOutput.executionTimeMs,
          [],
        );
        return;
      }

      // Compare results
      const expected = challenge.expectedResult.outputJson as Record<
        string,
        unknown
      >[];
      const actual = runnerOutput.rows;
      const resultCorrect = this.compareResults(expected, actual);

      const tests = [
        {
          caseId: 1,
          status: resultCorrect ? 'OK' : 'WRONG',
          rowsExpected: expected.length,
          rowsReturned: actual.length,
        },
      ];

      const score = this.calculateScore(
        resultCorrect,
        runnerOutput.executionTimeMs,
        challenge.timeLimit,
      );

      const finalStatus = resultCorrect
        ? score < 70
          ? 'OPTIMIZATION_REQUIRED'
          : 'ACCEPTED'
        : 'WRONG_ANSWER';

      await this.finalize(
        submissionId,
        finalStatus,
        score,
        runnerOutput.executionTimeMs,
        tests,
      );

      // Generate recommendations asynchronously (don't block finalization)
      this.generateRecommendations(
        submissionId,
        submission.query,
        challenge.schema?.ddlScript ?? '',
        runnerOutput.executionTimeMs,
        challenge.timeLimit,
      ).catch((err) =>
        this.logger.warn(
          `Recomendaciones no generadas para ${submissionId}: ${err?.message}`,
        ),
      );

      this.logger.log(
        `Submission ${submissionId} → ${finalStatus} (score: ${score})`,
      );
    } catch (err: any) {
      this.logger.error(
        `Error evaluando submission ${submissionId}: ${err?.message}`,
      );
      await this.finalize(submissionId, 'RUNTIME_ERROR', 0, 0, []).catch(
        () => {},
      );
    }
  }

  private async generateRecommendations(
    submissionId: string,
    query: string,
    ddlScript: string,
    executionTimeMs: number,
    timeLimitMs: number,
  ): Promise<void> {
    const analysis = this.sqlAnalyzer.analyze({
      query,
      ddlScript,
      executionTimeMs,
      timeLimitMs,
    });
    await this.prisma.recommendation.upsert({
      where: { submissionId },
      create: {
        submissionId,
        explanation: analysis.explanation,
        suggestions: analysis.suggestions,
        indexSuggestions: analysis.indexSuggestions,
        rewrittenQuery: analysis.rewrittenQuery,
      },
      update: {
        explanation: analysis.explanation,
        suggestions: analysis.suggestions,
        indexSuggestions: analysis.indexSuggestions,
        rewrittenQuery: analysis.rewrittenQuery,
      },
    });
  }

  private compareResults(
    expected: Record<string, unknown>[],
    actual: Record<string, unknown>[],
  ): boolean {
    if (expected.length !== actual.length) return false;
    const normalize = (rows: Record<string, unknown>[]) =>
      rows
        .map((r) =>
          Object.fromEntries(
            Object.entries(r).map(([k, v]) => [
              k.toLowerCase(),
              String(v ?? ''),
            ]),
          ),
        )
        .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    return (
      JSON.stringify(normalize(expected)) === JSON.stringify(normalize(actual))
    );
  }

  private calculateScore(
    correct: boolean,
    execTimeMs: number,
    timeLimitMs: number,
  ): number {
    if (!correct) return 0;
    const correctnessScore = 60;
    const ratio = Math.min(execTimeMs / timeLimitMs, 1);
    const timeScore = Math.round(15 * (1 - ratio));
    return correctnessScore + timeScore + 25; // 25 base for reaching evaluation
  }

  private async finalize(
    submissionId: string,
    status: string,
    score: number,
    executionTimeMs: number,
    tests: unknown[],
  ): Promise<void> {
    await this.prisma.submission.update({
      where: { id: submissionId },
      data: {
        status: status as any,
        result: {
          upsert: {
            create: { status, score, executionTimeMs, tests: tests as any },
            update: { status, score, executionTimeMs, tests: tests as any },
          },
        },
      },
    });
  }
}
