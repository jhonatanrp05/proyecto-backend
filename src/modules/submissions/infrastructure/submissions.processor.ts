import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../../shared/prisma';
import { SUBMISSIONS_QUEUE } from '../application/submissions.service';
import { SqlRunnerService } from './sql-runner.service';
import { SqlAnalyzerService } from '../../recommendations/application/sql-analyzer.service';
import { AiRecommendationService } from '../../recommendations/infrastructure/services/ai-recommendation.service';

interface EvaluateJobData {
  submissionId: string;
}

@Processor(SUBMISSIONS_QUEUE)
export class SubmissionsProcessor extends WorkerHost {
  private readonly logger = new Logger(SubmissionsProcessor.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    private readonly sqlRunner: SqlRunnerService,
    // Solo se usa como insumo del score (criterio "Uso adecuado de SQL" del Módulo 3).
    // No se usa para producir la recomendación que ve el estudiante.
    private readonly sqlAnalyzer: SqlAnalyzerService,
    // Productor único de recomendaciones (Módulo 5, Opción 2 del enunciado).
    private readonly aiService: AiRecommendationService,
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

      // Análisis estático: alimenta exclusivamente el score del Módulo 3
      // (criterio "Uso adecuado de SQL"). No se usa como recomendación al estudiante.
      const analysis = this.sqlAnalyzer.analyze({
        query: submission.query,
        ddlScript: challenge.schema.ddlScript,
        executionTimeMs: runnerOutput.executionTimeMs,
        timeLimitMs: challenge.timeLimit,
      });

      // Submission previa del mismo estudiante/reto, para evaluar el criterio
      // "Recomendaciones atendidas o mejora posterior" (10% de la rúbrica).
      const previousSuggestionsCount = await this.findPreviousSuggestionsCount(
        submission.studentId,
        submission.challengeId,
        submission.id,
      );

      const score = this.calculateScore({
        correct: resultCorrect,
        executionTimeMs: runnerOutput.executionTimeMs,
        timeLimitMs: challenge.timeLimit,
        query: submission.query,
        currentSuggestionsCount: analysis.suggestions.length,
        previousSuggestionsCount,
      });

      const finalStatus = this.deriveFinalStatus(
        resultCorrect,
        runnerOutput.executionTimeMs,
        challenge.timeLimit,
      );

      await this.finalize(
        submissionId,
        finalStatus,
        score,
        runnerOutput.executionTimeMs,
        tests,
      );

      if (submission.assessmentAttemptId) {
        await this.updateAssessmentAttemptProgress(
          submission.assessmentAttemptId,
        ).catch((err) =>
          this.logger.warn(
            `No se pudo actualizar el intento ${submission.assessmentAttemptId}: ${err?.message}`,
          ),
        );
      }

      // Producir la recomendación llamando al modelo de IA (Opción 2 del enunciado).
      // Si falla, se loguea y el submission queda evaluado sin recomendación.
      void this.generateAiRecommendation(
        submissionId,
        submission.query,
        challenge.schema.ddlScript,
        runnerOutput.executionTimeMs,
        finalStatus,
        runnerOutput.executionPlan,
      ).catch((err) =>
        this.logger.warn(
          `Recomendación de IA no generada para ${submissionId}: ${err?.message}`,
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

  private async generateAiRecommendation(
    submissionId: string,
    query: string,
    schemaDdl: string,
    executionTimeMs: number,
    evaluationStatus: string,
    executionPlan?: string,
  ): Promise<void> {
    const aiFeedback = await this.aiService.generateFeedback(
      query,
      schemaDdl,
      executionTimeMs,
      evaluationStatus,
      executionPlan,
    );
    await this.prisma.recommendation.upsert({
      where: { submissionId },
      create: {
        submissionId,
        explanation: aiFeedback.explanation,
        suggestions: aiFeedback.suggestions,
        indexSuggestions: aiFeedback.indexSuggestions,
        rewrittenQuery: aiFeedback.rewrittenQuery,
      },
      update: {
        explanation: aiFeedback.explanation,
        suggestions: aiFeedback.suggestions,
        indexSuggestions: aiFeedback.indexSuggestions,
        rewrittenQuery: aiFeedback.rewrittenQuery,
      },
    });
  }

  private async findPreviousSuggestionsCount(
    studentId: string,
    challengeId: string,
    currentSubmissionId: string,
  ): Promise<number | null> {
    const previous = await this.prisma.submission.findFirst({
      where: {
        studentId,
        challengeId,
        id: { not: currentSubmissionId },
        status: { notIn: ['QUEUED', 'RUNNING'] },
      },
      orderBy: { createdAt: 'desc' },
      include: { recommendation: true },
    });
    if (!previous?.recommendation) return null;
    const suggestions = previous.recommendation.suggestions;
    return Array.isArray(suggestions) ? suggestions.length : 0;
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

  // Puntaje siguiendo la rúbrica del enunciado (líneas 408–414):
  //   60% resultado · 15% tiempo · 10% uso SQL · 5% claridad · 10% recomendaciones.
  private calculateScore(input: {
    correct: boolean;
    executionTimeMs: number;
    timeLimitMs: number;
    query: string;
    currentSuggestionsCount: number;
    previousSuggestionsCount: number | null;
  }): number {
    if (!input.correct) return 0;

    const correctness = 60;

    const ratio = Math.min(input.executionTimeMs / input.timeLimitMs, 1);
    const time = Math.round(15 * (1 - ratio));

    // Uso adecuado de SQL: se descuentan 2 puntos por cada anti-patrón detectado
    // por SqlAnalyzerService, hasta agotar los 10 puntos.
    const sqlUsage = Math.max(0, 10 - input.currentSuggestionsCount * 2);

    // Claridad: heurística sintáctica simple. Una consulta multilínea y de longitud
    // razonable se considera clara; una línea única o muy larga pierde puntos.
    const trimmed = input.query.trim();
    const hasNewline = /\n/.test(trimmed);
    const tooLong = trimmed.length > 500;
    const clarity = hasNewline ? (tooLong ? 3 : 5) : tooLong ? 0 : 2;

    // Recomendaciones atendidas: si no hay submission previa con análisis,
    // se otorga el total (no hay recomendaciones que atender). Si la hay, se
    // premia haber reducido el número de sugerencias respecto a la anterior.
    let recommendations = 10;
    if (input.previousSuggestionsCount !== null) {
      if (input.currentSuggestionsCount <= input.previousSuggestionsCount) {
        recommendations = 10;
      } else {
        recommendations = 0;
      }
    }

    return correctness + time + sqlUsage + clarity + recommendations;
  }

  // OPTIMIZATION_REQUIRED se asigna cuando la consulta es correcta pero el tiempo
  // se acerca al límite (>70%), tal como define el enunciado: "Funciona, pero
  // tiene bajo rendimiento" (línea 343).
  private deriveFinalStatus(
    correct: boolean,
    executionTimeMs: number,
    timeLimitMs: number,
  ): string {
    if (!correct) return 'WRONG_ANSWER';
    if (executionTimeMs > timeLimitMs * 0.7) return 'OPTIMIZATION_REQUIRED';
    return 'ACCEPTED';
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

  private async updateAssessmentAttemptProgress(
    assessmentAttemptId: string,
  ): Promise<void> {
    const attempt = await this.prisma.assessmentAttempt.findUnique({
      where: { id: assessmentAttemptId },
      select: {
        id: true,
        startedAt: true,
        finishedAt: true,
        assessment: {
          select: {
            endDate: true,
            duration: true,
            challenges: {
              select: {
                challengeId: true,
              },
            },
          },
        },
        submissions: {
          where: {
            result: {
              isNot: null,
            },
          },
          select: {
            challengeId: true,
            result: {
              select: {
                score: true,
              },
            },
          },
        },
      },
    });

    if (!attempt) {
      return;
    }

    const challengeIds = attempt.assessment.challenges.map(
      (assessmentChallenge) => assessmentChallenge.challengeId,
    );

    const bestScoreByChallenge = new Map<string, number>();
    for (const submission of attempt.submissions) {
      const score = submission.result?.score ?? 0;
      const previousBest = bestScoreByChallenge.get(submission.challengeId);

      if (previousBest === undefined || score > previousBest) {
        bestScoreByChallenge.set(submission.challengeId, score);
      }
    }

    const totalScore = challengeIds.reduce(
      (sum, challengeId) => sum + (bestScoreByChallenge.get(challengeId) ?? 0),
      0,
    );

    const aggregatedScore =
      challengeIds.length > 0
        ? Math.round(totalScore / challengeIds.length)
        : 0;

    const now = new Date();
    const attemptDeadline = new Date(
      attempt.startedAt.getTime() + attempt.assessment.duration * 60_000,
    );
    const answeredAllChallenges =
      challengeIds.length > 0 &&
      challengeIds.every((challengeId) =>
        bestScoreByChallenge.has(challengeId),
      );

    const outOfTime = now > attemptDeadline || now > attempt.assessment.endDate;
    const shouldFinish =
      !attempt.finishedAt && (answeredAllChallenges || outOfTime);

    await this.prisma.assessmentAttempt.update({
      where: { id: assessmentAttemptId },
      data: {
        score: aggregatedScore,
        ...(shouldFinish ? { finishedAt: now } : {}),
      },
    });
  }
}
