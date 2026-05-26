import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { GenerateRecommendationUseCase } from './src/modules/recommendations/application/use-cases/generate-recommendation.use-case';
import { PrismaService } from './src/shared/prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    const prisma = app.get(PrismaService);
    // get any submission
    const submission = await prisma.submission.findFirst();
    if (!submission) {
      console.log('No submission found');
      return;
    }
    const useCase = app.get(GenerateRecommendationUseCase);
    console.log(`Running for submission: ${submission.id}`);
    const result = await useCase.execute(submission.id);
    console.log('Success:', result);
  } catch (error) {
    console.error('Test Error:', error);
  } finally {
    await app.close();
  }
}

bootstrap();
