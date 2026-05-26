export class Recommendation {
  constructor(
    public readonly id: string,
    public readonly submissionId: string,
    public readonly explanation: string,
    public readonly suggestions: any,
    public readonly indexSuggestions: any,
    public readonly rewrittenQuery?: string | null,
    public readonly createdAt?: Date
  ) {}
}
