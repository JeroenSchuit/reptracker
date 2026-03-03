// Web stubs: SQLite is not available in the browser.
// AppContext imports these for error-recovery on native; they are no-ops on web.

export async function resetDatabaseFiles(): Promise<void> {
  // No-op on web
}

export async function initFreshDatabase(): Promise<void> {
  // No-op on web
}

// The following are never called on web but must be exported to satisfy
// imports that Metro might pick up transitively.
export async function getDatabase(): Promise<never> {
  throw new Error('SQLite is not available on web');
}

export async function closeDatabase(): Promise<void> {
  // No-op on web
}
