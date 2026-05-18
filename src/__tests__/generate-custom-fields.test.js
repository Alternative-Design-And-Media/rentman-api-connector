import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const scriptPath = join(repoRoot, 'scripts', 'generate-custom-fields.ts');
const tsxCliPath = join(repoRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs');

const tempDirs = [];

function createTempDir() {
  const dir = mkdtempSync(join(tmpdir(), 'rentman-custom-fields-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('generate-custom-fields CLI', () => {
  it('supports --config and writes consumer package imports', () => {
    const projectRoot = createTempDir();
    const configPath = join(projectRoot, 'config', 'custom-fields.config.json');
    const generatedPath = join(projectRoot, 'src', 'generated', 'custom-fields.generated.ts');

    mkdirSync(dirname(configPath), { recursive: true });
    writeFileSync(
      configPath,
      JSON.stringify(
        [
          {
            id: 101,
            name: 'budget',
            belongs_to: 'project',
            type: 'price',
            input_fields_group: 'General',
            required: false,
            default_value: null,
          },
        ],
        null,
        2,
      ),
      'utf8',
    );

    const stdout = execFileSync(
      process.execPath,
      [tsxCliPath, scriptPath, '--config', './config/custom-fields.config.json'],
      {
        cwd: projectRoot,
        encoding: 'utf8',
      },
    );

    const generated = readFileSync(generatedPath, 'utf8');

    expect(stdout).toContain(`Generated ${generatedPath} from 1 custom field definition.`);
    expect(generated).toContain(
      "import type { WithCustomFields, RentmanProject } from '@alternative-design-and-media/rentman-api-connector';",
    );
    expect(generated).toContain('// Source: config/custom-fields.config.json');
    expect(generated).toContain('// Run `npx generate-rentman-custom-fields` to regenerate.');
    expect(generated).not.toContain("from '../custom-fields.js'");
  });
});
