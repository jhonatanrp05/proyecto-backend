import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AiRecommendationService {
  private readonly openai: OpenAI;
  private readonly logger = new Logger(AiRecommendationService.name);

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY') || process.env.OPENAI_API_KEY;
    this.openai = new OpenAI({
      apiKey: apiKey,
    });
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
      this.logger.log('Solicitando análisis al LLM...');
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o', // Puedes cambiarlo a gpt-3.5-turbo o el modelo que prefieras
        response_format: { type: 'json_object' },
        temperature: 0.2, // Temperatura baja para respuestas más deterministas y analíticas
        messages: [
          {
            role: 'system',
            content: `Eres un experto administrador de bases de datos PostgreSQL y tutor de SQL. 
Debes analizar la consulta SQL proporcionada por un estudiante y devolver tu análisis estrictamente en formato JSON con la siguiente estructura exacta:
{
  "explanation": "string (Explicación detallada de los problemas de rendimiento o estilo en la consulta, de forma pedagógica)",
  "suggestions": ["string" (Lista de sugerencias paso a paso para mejorar la consulta y las buenas prácticas)],
  "indexSuggestions": ["string" (Lista de sentencias DDL completas para crear índices recomendados, ej: 'CREATE INDEX idx_name ON table(col);'. Si no hay sugerencias, devuelve un arreglo vacío)],
  "rewrittenQuery": "string (La consulta SQL reescrita y optimizada de forma correcta)"
}
Asegúrate de que la salida sea un objeto JSON válido y no contenga ningún texto adicional fuera de él.`,
          },
          {
            role: 'user',
            content: `Analiza esta consulta SQL:

Esquema de la base de datos (DDL):
${schema}

Consulta enviada por el estudiante:
${query}

Tiempo de ejecución actual: ${executionTime} ms

Problemas detectados por análisis estático (AST):
${JSON.stringify(staticIssues, null, 2)}
`,
          },
        ],
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('La respuesta del LLM está vacía');
      }

      const jsonResponse = JSON.parse(content);
      
      return {
        explanation: jsonResponse.explanation || 'No se proporcionó explicación.',
        suggestions: Array.isArray(jsonResponse.suggestions) ? jsonResponse.suggestions : [],
        indexSuggestions: Array.isArray(jsonResponse.indexSuggestions) ? jsonResponse.indexSuggestions : [],
        rewrittenQuery: jsonResponse.rewrittenQuery || query,
      };
    } catch (error: any) {
      this.logger.error(`Error generando recomendación con IA: ${error.message}`);
      throw new Error('No se pudo generar la recomendación de IA debido a un error interno.');
    }
  }
}
