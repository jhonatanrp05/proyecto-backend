export class ExpectedResult {
  id!: string;
  challengeId!: string;
  query!: string;     
  outputJson!: Record<string, unknown>[]; // El resultado esperado como array de objetos JSON
  createdAt!: Date;
  updatedAt!: Date;

  constructor(partial: Partial<ExpectedResult>) {
    Object.assign(this, partial);
  }

  /**
   * Compara un resultado obtenido con el resultado esperado.
   * Compara fila a fila ignorando el orden de las columnas dentro de cada fila.
   * El orden de las filas SÍ importa.
   */
  matches(obtainedResult: Record<string, unknown>[]): boolean {
    if (obtainedResult.length !== this.outputJson.length) return false;

    return this.outputJson.every((expectedRow, index) => {
      const obtainedRow = obtainedResult[index];
      const expectedKeys = Object.keys(expectedRow);
      const obtainedKeys = Object.keys(obtainedRow);

      if (expectedKeys.length !== obtainedKeys.length) return false;

      return expectedKeys.every((key) => {
        // Comparación como string para evitar problemas de tipos (number vs string de la BD)
        return String(expectedRow[key]) === String(obtainedRow[key]);
      });
    });
  }
}
