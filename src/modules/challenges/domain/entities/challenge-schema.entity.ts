export class ChallengeSchema {
  id!: string;
  challengeId!: string;
  ddlScript!: string;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(partial: Partial<ChallengeSchema>) {
    Object.assign(this, partial);
  }

  /**
   * Valida que el script no esté vacío y tenga al menos un CREATE TABLE.
   */
  isValid(): boolean {
    if (!this.ddlScript || this.ddlScript.trim().length === 0) return false;
    return this.ddlScript.toUpperCase().includes('CREATE TABLE');
  }
}
