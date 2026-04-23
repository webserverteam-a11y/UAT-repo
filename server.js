// Entry point for production hosting (e.g. Hostinger).
// Registers tsx so Node can execute TypeScript files directly,
// then boots the Express server.
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register('tsx/esm', pathToFileURL('./'));

await import('./server/index.ts');
