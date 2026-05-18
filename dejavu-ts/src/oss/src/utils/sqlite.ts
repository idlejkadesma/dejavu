import fs from "fs";
import os from "os";
import path from "path";

export function getDefaultVectorStoreDbPath(): string {
  return path.join(os.homedir(), ".dejavu", "vector_store.db");
}

export function ensureSQLiteDirectory(dbPath: string): void {
  if (!dbPath || dbPath === ":memory:" || dbPath.startsWith("file:")) {
    return;
  }

  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}
