import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../shared/prisma';
import { SUBMISSIONS_QUEUE } from '../modules/submissions/application/submissions.service';
import { SubmissionsProcessor } from '../modules/submissions/infrastructure/submissions.processor';
import { SqlRunnerService } from '../modules/submissions/infrastructure/sql-runner.service';
import { SqlAnalyzerService } from '../modules/recommendations/application/sql-analyzer.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    PrismaModule,

    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST'),
          port: config.get<number>('REDIS_PORT'),
        },
      }),
    }),

    BullModule.registerQueue({
      name: SUBMISSIONS_QUEUE,
    }),
  ],
  providers: [SubmissionsProcessor, SqlRunnerService, SqlAnalyzerService],
})
export class WorkerModule {}
