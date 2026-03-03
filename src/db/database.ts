import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;
// Shared promise so concurrent callers wait for the same init instead of
// each trying to run migrations in parallel (which causes UNIQUE constraint
// failures on the migrations table).
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) {
    return Promise.resolve(db);
  }
  if (!initPromise) {
    initPromise = (async () => {
      db = await SQLite.openDatabaseAsync('reptracker.db');
      await runMigrations(db);
      return db;
    })().catch((err) => {
      // Reset so callers can retry after a reset
      initPromise = null;
      db = null;
      throw err;
    });
  }
  return initPromise;
}

/**
 * Deletes the SQLite directory and re-initialises the database from scratch.
 * Call this when openDatabaseAsync fails with a "non-normal file" error.
 */
export async function resetDatabaseFiles(): Promise<void> {
  // Reset the in-flight promise and close any open connection
  initPromise = null;
  if (db) {
    try {
      await db.closeAsync();
    } catch {
      // ignore – we're resetting anyway
    }
    db = null;
  }

  // Remove the corrupted SQLite directory using expo-file-system v19 API
  try {
    const { Directory, Paths } = await import('expo-file-system');
    const sqliteDir = new Directory(Paths.document, 'SQLite');
    // delete() throws if the path does not exist – that is fine, just ignore it
    sqliteDir.delete();
  } catch {
    // Best-effort: carry on even if the delete fails
  }
}

export async function initFreshDatabase(): Promise<SQLite.SQLiteDatabase> {
  // Reset the promise so getDatabase() re-initialises on the next call
  initPromise = null;
  db = await SQLite.openDatabaseAsync('reptracker.db');
  await runMigrations(db);
  return db;
}

async function runMigrations(database: SQLite.SQLiteDatabase): Promise<void> {
  // Create migrations table if not exists
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version INTEGER NOT NULL UNIQUE,
      applied_at INTEGER NOT NULL
    );
  `);

  const result = await database.getFirstAsync<{ max_version: number | null }>(
    'SELECT MAX(version) as max_version FROM migrations'
  );
  const currentVersion = result?.max_version ?? 0;

  // Migration 1: Initial schema
  if (currentVersion < 1) {
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS daily_logs (
        dateKey TEXT PRIMARY KEY,
        pushups INTEGER NOT NULL DEFAULT 0,
        pullups INTEGER NOT NULL DEFAULT 0,
        situps INTEGER NOT NULL DEFAULT 0,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        goal_pushups INTEGER NULL,
        goal_pullups INTEGER NULL,
        goal_situps INTEGER NULL,
        reminders_enabled INTEGER NOT NULL DEFAULT 0,
        reminder_time_1 TEXT NULL,
        reminder_time_2 TEXT NULL,
        reminder_only_if_incomplete INTEGER NOT NULL DEFAULT 1,
        reminder_message TEXT NULL,
        onboarding_complete INTEGER NOT NULL DEFAULT 0
      );

      INSERT OR IGNORE INTO settings (id) VALUES (1);
      INSERT INTO migrations (version, applied_at) VALUES (1, ${Date.now()});
    `);
  }

  // Migration 2: Add badges table
  if (currentVersion < 2) {
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS unlocked_badges (
        badgeId TEXT PRIMARY KEY,
        unlockedAt INTEGER NOT NULL
      );

      INSERT INTO migrations (version, applied_at) VALUES (2, ${Date.now()});
    `);
  }
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
  }
}
