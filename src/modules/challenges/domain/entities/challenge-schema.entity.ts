export class ChallengeSchema {
  id!: string;
  challengeId!: string;
  ddlScript!: string; // Texto plano con los CREATE TABLE
  createdAt!: Date;
  updatedAt!: Date;

  constructor(partial: Partial<ChallengeSchema>) {
    Object.assign(this, partial);
  }

  /**
   * Valida que el script no esté vacío y tenga al menos un CREATE TABLE.
   * Validación básica — la validación real ocurre al ejecutarlo en Docker.
   */
  isValid(): boolean {
    if (!this.ddlScript || this.ddlScript.trim().length === 0) return false;
    return this.ddlScript.toUpperCase().includes('CREATE TABLE');
  }
}
