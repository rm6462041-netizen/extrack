import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = join(process.cwd(), 'src');
const allowed = new Set(['components/Landing/legalDocuments.js']);
const extensions = /\.(?:js|jsx|ts|tsx)$/;
const forbidden = /\b(?:cloudflare|r2|s3|bucket|object storage|archive|backend|server storage|sql|database (?:table|schema)|internal endpoint|worker queue|sync job|import job)\b/i;
const rawError = /(?:setFormError|setError|notify|alert)\(\s*(?:data|event\.response)[?.\w]+|message:\s*data\.(?:message|error)/;

const files = [];
const visit = (directory) => readdirSync(directory).forEach((name) => {
  const path = join(directory, name);
  if (statSync(path).isDirectory()) visit(path);
  else if (extensions.test(name)) files.push(path);
});
visit(root);

const failures = [];
for (const file of files) {
  const name = relative(root, file).replaceAll('\\', '/');
  if (allowed.has(name)) continue;
  const source = readFileSync(file, 'utf8');
  source.split(/\r?\n/).forEach((line, index) => {
    const quotedOrRendered = /['"`][^'"`]*(?:cloudflare|r2|s3|bucket|object storage|archive|backend|server storage|sql|database |internal endpoint|worker queue|sync job|import job)[^'"`]*['"`]|>[^<]+</i.test(line);
    if ((quotedOrRendered && forbidden.test(line)) || rawError.test(line)) failures.push(`${name}:${index + 1}`);
  });
}

if (failures.length) {
  console.error(`Frontend disclosure check failed:\n${failures.join('\n')}`);
  process.exit(1);
}

console.log('Frontend disclosure check passed.');
