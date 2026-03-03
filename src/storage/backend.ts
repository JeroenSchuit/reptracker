// TypeScript type anchor - tsc resolves this file since it has no platform suffix.
// At runtime, Metro always prefers backend.native.ts (native) or backend.web.ts (web)
// over this file, so this code is never executed.
export { repo } from './backend.native';
