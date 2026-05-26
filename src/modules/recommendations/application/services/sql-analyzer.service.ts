import { Injectable, Logger } from '@nestjs/common';
import { Parser } from 'node-sql-parser';

export interface SqlIssue {
  issue: string;
  severity: 'warning' | 'error' | 'info';
}

@Injectable()
export class SqlAnalyzerService {
  private readonly parser: Parser;
  private readonly logger = new Logger(SqlAnalyzerService.name);

  constructor() {
    this.parser = new Parser();
  }

  analyze(query: string): SqlIssue[] {
    const issues: SqlIssue[] = [];

    try {
      // Configuramos para base de datos PostgreSQL si es posible, o usamos el generic
      const astOrAsts = this.parser.astify(query, { database: 'postgresql' });
      const asts = Array.isArray(astOrAsts) ? astOrAsts : [astOrAsts];

      for (const ast of asts as any[]) {
        if (ast.type === 'select') {
          // Check for SELECT *
          if (this.hasSelectStar(ast)) {
            issues.push({
              issue: 'Uso de SELECT *',
              severity: 'warning',
            });
          }

          // Check for functions in WHERE clause
          if (ast.where) {
            if (this.hasFunctionInWhere(ast.where)) {
              issues.push({
                issue: 'Uso de funciones en la cláusula WHERE (afecta el rendimiento de los índices)',
                severity: 'warning',
              });
            }
          }
        }
      }
    } catch (error: any) {
      this.logger.error(`Error al analizar la query SQL: ${error.message}`);
      issues.push({
        issue: 'Error de sintaxis SQL o consulta no soportada para análisis',
        severity: 'error',
      });
    }

    return issues;
  }

  private hasSelectStar(ast: any): boolean {
    if (ast.columns === '*') return true;
    if (Array.isArray(ast.columns)) {
      return ast.columns.some((col: any) => {
        return col.expr?.type === 'column_ref' && col.expr?.column === '*';
      });
    }
    return false;
  }

  private hasFunctionInWhere(whereObj: any): boolean {
    if (!whereObj) return false;

    if (Array.isArray(whereObj)) {
      for (const item of whereObj) {
        if (this.hasFunctionInWhere(item)) {
          return true;
        }
      }
      return false;
    }
    
    if (typeof whereObj === 'object') {
      // Verificamos si es una llamada a función
      if (whereObj.type === 'function' || whereObj.type === 'aggr_func') {
        return true;
      }
      
      // Recorremos las propiedades anidadas recursivamente (left, right, args, etc.)
      for (const key in whereObj) {
        if (this.hasFunctionInWhere(whereObj[key])) {
          return true;
        }
      }
    }
    
    return false;
  }
}
