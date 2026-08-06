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
    expect(generated).toContain("from '@alternative-design-and-media/rentman-api-connector';");
    expect(generated).toContain('WithCustomFields');
    expect(generated).toContain('CustomFieldMap');
    expect(generated).toContain('RentmanProject');
    expect(generated).toContain('// Source: config/custom-fields.config.json');
    expect(generated).toContain('// Run `npx generate-rentman-custom-fields` to regenerate.');
    expect(generated).not.toContain("from '../custom-fields.js'");
  });

  it('generates RentmanCustomFields interface extending CustomFieldMap', () => {
    const projectRoot = createTempDir();
    const configPath = join(projectRoot, 'custom-fields.config.json');
    const generatedPath = join(projectRoot, 'src', 'generated', 'custom-fields.generated.ts');

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
          {
            id: 102,
            name: 'serial_prefix',
            belongs_to: 'equipment',
            type: 'text',
            input_fields_group: 'General',
            required: false,
            default_value: null,
          },
          {
            id: 103,
            name: 'reference',
            belongs_to: 'projectequipment',
            type: 'text',
            input_fields_group: 'Extra',
            required: false,
            default_value: null,
          },
        ],
        null,
        2,
      ),
      'utf8',
    );

    execFileSync(
      process.execPath,
      [tsxCliPath, scriptPath],
      { cwd: projectRoot, encoding: 'utf8' },
    );

    const generated = readFileSync(generatedPath, 'utf8');

    // RentmanCustomFields interface is generated
    expect(generated).toContain('export interface RentmanCustomFields extends CustomFieldMap {');
    // project (facade: projects) is included
    expect(generated).toContain('  projects: ProjectCustomFields;');
    // equipment (facade: equipment) is included
    expect(generated).toContain('  equipment: EquipmentCustomFields;');
    // projectequipment has no direct facade property → NOT included in RentmanCustomFields
    expect(generated).not.toContain('  projectEquipment:');
    expect(generated).not.toContain('  projectequipment:');
  });

  it('accepts belongs_to: "task" and emits Task types without a facade property', () => {
    const projectRoot = createTempDir();
    const configPath = join(projectRoot, 'custom-fields.config.json');
    const generatedPath = join(projectRoot, 'src', 'generated', 'custom-fields.generated.ts');

    writeFileSync(
      configPath,
      JSON.stringify(
        [
          // A model that DOES have a facade property. Without this the
          // RentmanCustomFields interface would be empty and the "task is not
          // in there" assertions below would pass for the wrong reason.
          {
            id: 101,
            name: 'budget',
            belongs_to: 'project',
            type: 'price',
            input_fields_group: 'General',
            required: false,
            default_value: null,
          },
          // Real-world names on purpose: every live task field is accented
          // Hungarian, and one of them contains a space. An ASCII snake_case
          // fixture would prove nothing about what actually ships.
          {
            id: 251,
            name: 'Prioritás',
            belongs_to: 'task',
            type: 'dropdown',
            input_fields_group: 'General',
            required: false,
            default_value: null,
            options: [
              { id: 1, name: 'Magas' },
              { id: 2, name: 'Alacsony' },
            ],
          },
          {
            id: 257,
            name: 'Kemény határidő',
            belongs_to: 'task',
            type: 'dropdown',
            input_fields_group: 'General',
            required: false,
            default_value: null,
            options: [
              { id: 0, name: 'Igen' },
              { id: 1, name: 'Nem' },
            ],
          },
          {
            id: 254,
            name: 'Kezdés',
            belongs_to: 'task',
            type: 'datetime',
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

    // Would throw `belongs_to has unknown value "task"` before 2.6.0.
    execFileSync(process.execPath, [tsxCliPath, scriptPath], {
      cwd: projectRoot,
      encoding: 'utf8',
    });

    const generated = readFileSync(generatedPath, 'utf8');

    // The model type is imported and the section is generated.
    expect(generated).toContain('RentmanTask');
    expect(generated).toContain('export interface TaskCustomFields {');
    expect(generated).toContain('export type TaskWithCustom = WithCustomFields<RentmanTask, TaskCustomFields>;');
    // Accented / spaced names survive into quoted interface keys and sanitised
    // helper identifiers.
    expect(generated).toContain("'Prioritás'?:");
    expect(generated).toContain("'Kemény határidő'?:");
    expect(generated).toContain("'Kezdés'?: string;");

    // The facade list is genuinely populated …
    expect(generated).toContain('export interface RentmanCustomFields extends CustomFieldMap {');
    expect(generated).toContain('  projects: ProjectCustomFields;');
    // … and task is deliberately absent from it: CustomFieldMap has no `tasks`
    // key, so a facade entry here would not type-check for consumers.
    expect(generated).not.toContain('  tasks: TaskCustomFields;');
    expect(generated).not.toContain('  task: TaskCustomFields;');
  });

  it('rejects --config when the value is missing', () => {
    expect(() =>
      execFileSync(process.execPath, [tsxCliPath, scriptPath, '--config', '--help'], {
        encoding: 'utf8',
      }),
    ).toThrowError(/Missing value for --config/);
  });
});
