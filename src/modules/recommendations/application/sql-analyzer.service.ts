import { Injectable } from '@nestjs/common';

export interface AnalysisInput {
  query: string;
  ddlScript: string;
  executionTimeMs: number;
  timeLimitMs: number;
}

export interface AnalysisOutput {
  explanation: string;
  suggestions: string[];
  indexSuggestions: string[];
  rewrittenQuery?: string;
}

@Injectable()
export class SqlAnalyzerService {
  analyze(input: AnalysisInput): AnalysisOutput {
    const { query, ddlScript, executionTimeMs, timeLimitMs } = input;
    const upper = query.toUpperCase();
    const suggestions: string[] = [];
    const indexSuggestions: string[] = [];
    let rewrittenQuery: string | undefined;

    // Rule 1: SELECT *
    if (/SELECT\s+\*/.test(upper)) {
      suggestions.push(
        'Evita usar SELECT *. Especifica solo las columnas que necesitas para reducir el volumen de datos transferido.',
      );
    }

    // Rule 2: no WHERE clause on potentially large query
    if (!upper.includes('WHERE') && !upper.includes('LIMIT')) {
      suggestions.push(
        'La consulta no tiene cláusula WHERE ni LIMIT. Considera filtrar los datos para evitar escaneos completos de tabla.',
      );
    }

    // Rule 3: function on column in WHERE (non-sargable)
    if (
      /WHERE\s+\w+\s*\(/.test(upper) ||
      /WHERE.*\b(YEAR|MONTH|DAY|LOWER|UPPER|TO_CHAR)\s*\(/.test(upper)
    ) {
      suggestions.push(
        'Usar funciones sobre columnas en la cláusula WHERE impide el uso de índices (non-sargable). Considera reescribir el filtro usando rangos directos sobre la columna.',
      );
    }

    // Rule 4: subquery with IN that could be a JOIN
    if (/\bIN\s*\(\s*SELECT\b/.test(upper)) {
      suggestions.push(
        'La subconsulta con IN puede reemplazarse por un JOIN, que en muchos casos el optimizador ejecuta más eficientemente.',
      );
      rewrittenQuery = this.suggestInToJoin(query);
    }

    // Rule 5: DISTINCT without obvious need
    if (upper.includes('DISTINCT') && upper.includes('GROUP BY')) {
      suggestions.push(
        'Tienes DISTINCT y GROUP BY juntos. GROUP BY ya agrupa filas únicas por los campos indicados; DISTINCT puede ser redundante.',
      );
    }

    // Rule 6: slow execution
    if (executionTimeMs > timeLimitMs * 0.7) {
      suggestions.push(
        `La consulta tardó ${executionTimeMs}ms, cerca del límite de ${timeLimitMs}ms. Revisa índices y evita operaciones costosas.`,
      );
    }

    // Rule 7: ORDER BY without index hint
    if (upper.includes('ORDER BY')) {
      const orderByColumns = this.extractOrderByColumns(query);
      for (const col of orderByColumns) {
        const tableName = this.guessTableForColumn(col, ddlScript);
        if (tableName) {
          indexSuggestions.push(
            `CREATE INDEX idx_${tableName}_${col} ON ${tableName}(${col});`,
          );
        }
      }
      if (indexSuggestions.length > 0) {
        suggestions.push(
          'Si el ORDER BY se ejecuta frecuentemente, considera agregar índices sobre las columnas de ordenamiento.',
        );
      }
    }

    // Rule 8: JOIN columns without index
    const joinColumns = this.extractJoinColumns(query);
    for (const { table, column } of joinColumns) {
      const indexName = `idx_${table}_${column}`;
      const suggestion = `CREATE INDEX ${indexName} ON ${table}(${column});`;
      if (!indexSuggestions.includes(suggestion)) {
        indexSuggestions.push(suggestion);
      }
    }
    if (
      joinColumns.length > 0 &&
      !suggestions.some((s) => s.includes('índices'))
    ) {
      suggestions.push(
        'Asegúrate de que las columnas usadas en JOIN tengan índices para evitar nested loop scans.',
      );
    }

    // Rule 9: WHERE filter columns
    const whereColumns = this.extractWhereColumns(query);
    for (const { table, column } of whereColumns) {
      const indexName = `idx_${table}_${column}`;
      const suggestion = `CREATE INDEX ${indexName} ON ${table}(${column});`;
      if (!indexSuggestions.includes(suggestion)) {
        indexSuggestions.push(suggestion);
      }
    }

    const explanation = this.buildExplanation(
      suggestions,
      indexSuggestions,
      executionTimeMs,
    );

    return {
      explanation,
      suggestions,
      indexSuggestions: [...new Set(indexSuggestions)],
      rewrittenQuery,
    };
  }

  private buildExplanation(
    suggestions: string[],
    indexSuggestions: string[],
    executionTimeMs: number,
  ): string {
    if (suggestions.length === 0 && indexSuggestions.length === 0) {
      return `La consulta se ejecutó en ${executionTimeMs}ms y no presenta problemas evidentes de optimización.`;
    }
    const parts: string[] = [
      `La consulta se ejecutó en ${executionTimeMs}ms.`,
      suggestions.length > 0
        ? `Se encontraron ${suggestions.length} oportunidad(es) de mejora.`
        : '',
      indexSuggestions.length > 0
        ? `Se sugieren ${indexSuggestions.length} índice(s) para mejorar el rendimiento.`
        : '',
    ];
    return parts.filter(Boolean).join(' ');
  }

  private extractOrderByColumns(query: string): string[] {
    const match = query.match(/ORDER\s+BY\s+([^;]+?)(?:\s+LIMIT|\s+HAVING|$)/i);
    if (!match) return [];
    return match[1]
      .split(',')
      .map((c) => c.trim().split(/\s+/)[0].split('.').pop() ?? '')
      .filter(Boolean);
  }

  private extractJoinColumns(
    query: string,
  ): { table: string; column: string }[] {
    const results: { table: string; column: string }[] = [];
    const regex =
      /JOIN\s+(\w+)\s+(?:\w+\s+)?ON\s+\w+\.(\w+)\s*=\s*(\w+)\.(\w+)/gi;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(query)) !== null) {
      results.push({
        table: match[1].toLowerCase(),
        column: match[4].toLowerCase(),
      });
    }
    return results;
  }

  private extractWhereColumns(
    query: string,
  ): { table: string; column: string }[] {
    const results: { table: string; column: string }[] = [];
    const whereMatch = query.match(
      /WHERE\s+(.+?)(?:GROUP\s+BY|ORDER\s+BY|HAVING|LIMIT|$)/is,
    );
    if (!whereMatch) return results;
    const whereClause = whereMatch[1];
    const colWithTable = /(\w+)\.(\w+)\s*(?:=|>|<|>=|<=|!=|LIKE|IN)/gi;
    let match: RegExpExecArray | null;
    while ((match = colWithTable.exec(whereClause)) !== null) {
      results.push({
        table: match[1].toLowerCase(),
        column: match[2].toLowerCase(),
      });
    }
    return results;
  }

  private guessTableForColumn(
    column: string,
    ddlScript: string,
  ): string | null {
    const tableRegex = /CREATE\s+TABLE\s+(\w+)\s*\(([^;]+)\)/gi;
    let match: RegExpExecArray | null;
    while ((match = tableRegex.exec(ddlScript)) !== null) {
      const tableName = match[1];
      const tableDef = match[2];
      if (new RegExp(`\\b${column}\\b`, 'i').test(tableDef)) {
        return tableName.toLowerCase();
      }
    }
    return null;
  }

  private suggestInToJoin(query: string): string {
    return (
      '-- Considera reescribir la subconsulta con IN como un JOIN:\n' +
      query.replace(
        /(\w+)\s+IN\s*\(\s*SELECT\s+(\w+)\s+FROM\s+(\w+)([^)]*)\)/gi,
        (_, col, subCol, subTable, rest) =>
          `EXISTS (SELECT 1 FROM ${subTable} WHERE ${subTable}.${subCol} = <tabla_principal>.${col}${rest})`,
      )
    );
  }
}
