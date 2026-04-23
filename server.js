// Entry point for production hosting (e.g. Hostinger).
// Registers tsx so Node can execute TypeScript files directly,
// then boots the Express server.
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register('tsx/esm', pathToFileURL('./'));

async function main() {
  await import('./server/index.ts');
}
main();
