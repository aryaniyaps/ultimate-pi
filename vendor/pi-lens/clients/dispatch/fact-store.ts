import { normalizeMapKey } from "../path-utils.js";

export interface ReadonlyFactStore {
  getFileFact<T>(filePath: string, factId: string): T | undefined;
  hasFileFact(filePath: string, factId: string): boolean;
  getSessionFact<T>(factId: string): T | undefined;
  hasSessionFact(factId: string): boolean;
}

export class FactStore implements ReadonlyFactStore {
  private readonly fileFacts = new Map<string, Map<string, unknown>>();
  private readonly sessionFacts = new Map<string, unknown>();

  // All file-keyed methods normalize the path internally via normalizeMapKey().
  // Callers always pass raw/resolved paths — normalization is not their concern.

  getFileFact<T>(filePath: string, factId: string): T | undefined {
    return this.fileFacts.get(normalizeMapKey(filePath))?.get(factId) as T | undefined;
  }

  setFileFact(filePath: string, factId: string, value: unknown): void {
    const key = normalizeMapKey(filePath);
    let facts = this.fileFacts.get(key);
    if (!facts) {
      facts = new Map();
      this.fileFacts.set(key, facts);
    }
    facts.set(factId, value);
  }

  hasFileFact(filePath: string, factId: string): boolean {
    return this.fileFacts.get(normalizeMapKey(filePath))?.has(factId) ?? false;
  }

  /** Clear facts for one specific file only. Use at the start of each per-file dispatch call.
   *  Preserves facts for other files computed in the same turn.
   *  Normalizes filePath internally — callers pass raw paths. */
  clearFileFactsFor(filePath: string): void {
    this.fileFacts.delete(normalizeMapKey(filePath));
  }

  /** Clear all file facts across all paths. Reserve for explicit full resets only —
   *  do NOT use in the normal per-file dispatch path. */
  clearFileFacts(): void {
    this.fileFacts.clear();
  }

  getSessionFact<T>(factId: string): T | undefined {
    return this.sessionFacts.get(factId) as T | undefined;
  }

  setSessionFact(factId: string, value: unknown): void {
    this.sessionFacts.set(factId, value);
  }

  hasSessionFact(factId: string): boolean {
    return this.sessionFacts.has(factId);
  }

  /** Call on session reset only. Clears everything including tool cache and baselines. */
  clearAll(): void {
    this.fileFacts.clear();
    this.sessionFacts.clear();
  }
}
