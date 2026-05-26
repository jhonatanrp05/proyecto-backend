import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AiRecommendationService {
  private readonly genAI: GoogleGenerativeAI;
  private readonly logger = new Logger(AiRecommendationService.name);

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      this.logger.warn('GEMINI_API_KEY no está configurada en las variables de entorno');
    }
    this.genAI = new GoogleGenerativeAI(apiKey || '');
  }

  async generateFeedback(
    query: string,
    schema: string,
    executionTime: number,
    staticIssues: any[]
  ): Promise<{
    explanation: string;
    suggestions: string[];
    indexSuggestions: string[];
    rewrittenQuery: string;
  }> {
    try {
      this.logger.log('Solicitando análisis a Gemini...');
      const model = this.genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      const prompt = `
Eres un experto administrador de bases de datos PostgreSQL y tutor de SQL. 
Debes analizar la consulta SQL proporcionada por un estudiante y devolver tu análisis estrictamente en formato JSON con la siguiente estructura exacta:
{
  "explanation": "string con la explicacion detallada",
  "suggestions": ["array de strings con sugerencias de buenas practicas"],
  "indexSuggestions": ["array de strings con sentencias DDL CREATE INDEX sugeridas"],
  "rewrittenQuery": "string con el SQL optimizado"
}
Asegúrate de que la salida sea un objeto JSON válido y no contenga ningún texto adicional fuera de él.

Analiza esta consulta SQL:

Esquema de la base de datos (DDL):
${schema}

Consulta enviada por el estudiante:
${query}

Tiempo de ejecución actual: ${executionTime} ms

Problemas detectados por análisis estático (AST):
${JSON.stringify(staticIssues, null, 2)}
`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const content = response.text();

      if (!content) {
        throw new Error('La respuesta de Gemini está vacía');
      }

      const jsonResponse = JSON.parse(content);
      
      return {
        explanation: jsonResponse.explanation || 'No se proporcionó explicación.',
        suggestions: Array.isArray(jsonResponse.suggestions) ? jsonResponse.suggestions : [],
        indexSuggestions: Array.isArray(jsonResponse.indexSuggestions) ? jsonResponse.indexSuggestions : [],
        rewrittenQuery: jsonResponse.rewrittenQuery || query,
      };
    } catch (error: any) {
      this.logger.error(`Error generando recomendación con Gemini: ${error.message}`);
      throw new Error('No se pudo generar la recomendación de IA debido a un error interno.');
    }
  }
}
