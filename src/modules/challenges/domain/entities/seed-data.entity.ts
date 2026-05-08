export class SeedData {
  id!: string;
  challengeId!: string;
  insertScript!: string;
  isGenerated!: boolean;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(partial: Partial<SeedData>) {
    Object.assign(this, partial);
  }

  isValid(): boolean {
    if (!this.insertScript || this.insertScript.trim().length === 0) return false;
    return this.insertScript.toUpperCase().includes('INSERT INTO');
  }
}
