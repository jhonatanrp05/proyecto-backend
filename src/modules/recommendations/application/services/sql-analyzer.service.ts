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

  analyze(query: string, schemaDdl: string = ''): SqlIssue[] {
    const issues: SqlIssue[] = [];
    const indexedColumns = new Set<string>();

    try {
      if (schemaDdl) {
        const ddlAsts = this.parser.astify(schemaDdl, { database: 'postgresql' });
        const ddlArray = Array.isArray(ddlAsts) ? ddlAsts : [ddlAsts];
        
        for (const ast of ddlArray as any[]) {
          if (ast.type === 'create' && ast.keyword === 'table') {
            const tableName = ast.table?.[0]?.table;
            ast.create_definitions?.forEach((def: any) => {
              if (def.primary_key || def.unique) {
                const colName = def.column?.column?.expr?.value;
                if (colName) {
                  indexedColumns.add(colName);
                  if (tableName) indexedColumns.add(`${tableName}.${colName}`);
                }
              }
            });
          } else if (ast.type === 'create' && ast.keyword === 'index') {
            const tableName = ast.table?.table;
            ast.index_columns?.forEach((col: any) => {
              const colName = col.column?.expr?.value;
              if (colName) {
                indexedColumns.add(colName);
                if (tableName) indexedColumns.add(`${tableName}.${colName}`);
              }
            });
          }
        }
      }
    } catch (e) {
      this.logger.warn(`No se pudo parsear el DDL para extraer índices: ${e}`);
    }

    try {
      // Configuramos para base de datos PostgreSQL si es posible, o usamos el generic
      const astOrAsts = this.parser.astify(query, { database: 'postgresql' });
      const asts = Array.isArray(astOrAsts) ? astOrAsts : [astOrAsts];

      for (const ast of asts as any[]) {
        if (['select', 'update', 'delete'].includes(ast.type)) {
          if (!ast.where) {
            issues.push({
              issue: `Ausencia de cláusula WHERE en una consulta ${ast.type.toUpperCase()} (puede causar full table scan o modificar registros masivamente)`,
              severity: 'warning',
            });
          }
        }

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

            if (this.hasInSubquery(ast.where)) {
              issues.push({
                issue: 'Uso de subconsulta con IN (considera reemplazarla por un JOIN para mejor rendimiento)',
                severity: 'warning',
              });
            }
          }

          // Check for ORDER BY on non-indexed columns
          if (ast.orderby) {
            ast.orderby.forEach((orderDef: any) => {
              if (orderDef.expr?.type === 'column_ref') {
                const table = orderDef.expr.table;
                const column = orderDef.expr.column;
                
                let isIndexed = false;
                if (table) {
                  isIndexed = indexedColumns.has(`${table}.${column}`) || indexedColumns.has(column);
                } else {
                  isIndexed = indexedColumns.has(column);
                }

                if (!isIndexed && indexedColumns.size > 0) { // Only warn if we actually parsed some indexes
                  const colName = table ? `${table}.${column}` : column;
                  issues.push({
                    issue: `Uso de ORDER BY en la columna no indexada '${colName}' (puede causar ordenamiento en memoria o disk sort)`,
                    severity: 'warning',
                  });
                }
              }
            });
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

  private hasInSubquery(whereObj: any): boolean {
    if (!whereObj) return false;

    if (Array.isArray(whereObj)) {
      for (const item of whereObj) {
        if (this.hasInSubquery(item)) {
          return true;
        }
      }
      return false;
    }
    
    if (typeof whereObj === 'object') {
      if (
        whereObj.type === 'binary_expr' &&
        typeof whereObj.operator === 'string' &&
        whereObj.operator.toUpperCase() === 'IN' &&
        whereObj.right?.type === 'expr_list' &&
        Array.isArray(whereObj.right.value) &&
        whereObj.right.value.some((v: any) => v.ast?.type === 'select')
      ) {
        return true;
      }
      
      for (const key in whereObj) {
        if (this.hasInSubquery(whereObj[key])) {
          return true;
        }
      }
    }
    
    return false;
  }
}
