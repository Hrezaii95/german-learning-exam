import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import type { D1Database } from "../src/types.js";

/** Real SQLite fixture, with the subset of D1 used by API handlers. */
export function createTestDb(migrate = true): D1Database & { sqlite: DatabaseSync; close(): void } {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON");
  class Statement {
    constructor(readonly sql: string, readonly values: unknown[] = []) {}
    bind(...values: unknown[]) { return new Statement(this.sql, values); }
    async first(column?: string) {
      const row = sqlite.prepare(this.sql).get(...this.values as never[]) as Record<string, unknown> | undefined;
      return column ? row?.[column] ?? null : row ?? null;
    }
    async all() {
      const results = sqlite.prepare(this.sql).all(...this.values as never[]);
      return { success: true, results, meta: { changes: 0 } };
    }
    async run() {
      const result = sqlite.prepare(this.sql).run(...this.values as never[]);
      return { success: true, results: [], meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) } };
    }
    async raw() { return (await this.all()).results.map(row => Object.values(row)); }
  }
  let batchQueue: Promise<void> = Promise.resolve();
  const db = {
    sqlite,
    prepare: (sql: string) => new Statement(sql),
    async batch(statements: Statement[]) {
      const previous = batchQueue;
      let release!: () => void;
      batchQueue = new Promise<void>(resolve => { release = resolve; });
      await previous;
      sqlite.exec("BEGIN");
      try {
        const result = [];
        for (const statement of statements) {
          const returnsRows = /^\s*(SELECT|WITH|PRAGMA)/i.test(statement.sql) || /\bRETURNING\b/i.test(statement.sql);
          result.push(await (returnsRows ? statement.all() : statement.run()));
        }
        sqlite.exec("COMMIT");
        return result;
      } catch (error) { sqlite.exec("ROLLBACK"); throw error; }
      finally { release(); }
    },
    async exec(sql: string) { sqlite.exec(sql); return { count: 1, duration: 0 }; },
    close() { sqlite.close(); },
  };
  if (migrate) sqlite.exec(readFileSync(new URL("../migrations/0001_platform.sql", import.meta.url), "utf8"));
  return db as unknown as D1Database & { sqlite: DatabaseSync; close(): void };
}
