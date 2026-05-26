import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AiRecommendationService {
  private readonly genAI: GoogleGenerativeAI;
  private readonly logger = new Logger(AiRecommendationService.name);

  constructor(private readonly configService: ConfigService) {
    // Usamos GEMINI_API_KEY según tu configuración en el .env
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');

    if (!apiKey) {
      this.logger.error('La variable GEMINI_API_KEY no está configurada.');
    }

    this.genAI = new GoogleGenerativeAI(apiKey || '');
  }

  async generateFeedback(
    query: string,
    schema: string,
    executionTime: number,
    evaluationStatus: string,
    executionPlan?: string,
  ): Promise<{
    explanation: string;
    suggestions: string[];
    indexSuggestions: string[];
    rewrittenQuery: string;
  }> {
    try {
      this.logger.log('Solicitando análisis al LLM (Google Gemini)...');

      const model = this.genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      // Prompt alineado al Módulo 5 del enunciado (líneas 504–534).
      // Inputs requeridos por la Opción 2 (líneas 614–624):
      // consulta, esquema, tiempo de ejecución y resultado de evaluación.
      const prompt = `Eres un experto administrador de bases de datos PostgreSQL y tutor de SQL. Analizas la consulta SQL de un estudiante y produces retroalimentación pedagógica accionable.

DEBES analizar los siguientes ejes:
- La consulta SQL completa.
- El esquema de tablas (DDL).
- Los campos usados en filtros (WHERE).
- Los campos usados en joins (JOIN ... ON).
- Los campos usados en agrupaciones (GROUP BY).
- Los campos usados en ordenamientos (ORDER BY).
- El tiempo de ejecución medido.
- El resultado de la evaluación automática (si la consulta produjo el resultado esperado o no).
- Posibles problemas de rendimiento.
- Posibles oportunidades de mejora.

DEBES generar:
- Una explicación en lenguaje natural (qué hace la consulta, qué problemas tiene, qué se puede mejorar y cuál es el impacto esperado de cada mejora).
- Recomendaciones de optimización específicas y accionables.
- Sugerencia de índices, expresadas como sentencias DDL CREATE INDEX completas y válidas.
- Advertencias sobre malas prácticas detectadas (SELECT *, ausencia de WHERE, funciones sobre columnas indexadas en WHERE, subconsultas IN que pueden ser JOIN, etc.).
- Propuesta de reescritura de la consulta cuando aplique. Si no hay una mejora clara o la consulta ya está bien escrita, devuelve la misma consulta sin cambios.
- Explicación del posible impacto de cada mejora propuesta (incluida en la explicación o en cada sugerencia).

Responde estrictamente en JSON con esta estructura exacta y sin texto fuera del objeto:
{
  "explanation": "string con explicación en lenguaje natural, incluyendo el impacto esperado de las mejoras",
  "suggestions": ["array de strings con recomendaciones de optimización y advertencias sobre malas prácticas"],
  "indexSuggestions": ["array de strings con sentencias DDL CREATE INDEX completas"],
  "rewrittenQuery": "string con la consulta optimizada (o la consulta original si no hay mejora aplicable)"
}

--- ENTRADA ---

Esquema de la base de datos (DDL):
${schema}

Consulta enviada por el estudiante:
${query}

Tiempo de ejecución medido: ${executionTime} ms

Resultado de la evaluación automática: ${evaluationStatus}
${
  executionPlan
    ? `\nPlan de ejecución (EXPLAIN ANALYZE):\n${executionPlan}\n`
    : ''
}`;

      const result = await model.generateContent(prompt);
      const content = result.response.text();

      if (!content) {
        throw new Error('La respuesta de Gemini está vacía');
      }

      // 4. Parseamos el JSON devuelto
      const jsonResponse = JSON.parse(content);

      return {
        explanation: jsonResponse.explanation || 'No se proporcionó explicación.',
        suggestions: Array.isArray(jsonResponse.suggestions)
          ? jsonResponse.suggestions
          : [],
        indexSuggestions: Array.isArray(jsonResponse.indexSuggestions)
          ? jsonResponse.indexSuggestions
          : [],
        rewrittenQuery: jsonResponse.rewrittenQuery || query,
      };

    } catch (error: any) {
      this.logger.error(`Error generando recomendación con IA: ${error.message}`);
      throw new Error('No se pudo generar la recomendación de IA debido a un error interno.');
    }
  }
}