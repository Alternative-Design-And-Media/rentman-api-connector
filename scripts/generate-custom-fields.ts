import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const CONFIG_PATH = join(root, 'custom-fields.config.json');
const OUTPUT_PATH = join(root, 'src', 'generated', 'custom-fields.generated.ts');
const SECTION_HEADER_WIDTH = 74;

type Primitive = string | number | boolean | null;

type RentmanCustomFieldType =
  | 'text'
  | 'formatted_text'
  | 'linked_item'
  | 'link'
  | 'phone'
  | 'yes_no'
  | 'color'
  | 'date'
  | 'datetime'
  | 'decimal'
  | 'dropdown'
  | 'integer'
  | 'long_text'
  | 'price';

type RentmanLinkedItemType = 'contact' | 'crew';

type RentmanCustomFieldModel =
  | 'project'
  | 'subproject'
  | 'projectfunction'
  | 'projectcrew'
  | 'projectequipment'
  | 'projectvehicle'
  | 'equipment'
  | 'serialnumber'
  | 'subrental'
  | 'contact'
  | 'contactperson'
  | 'crew'
  | 'repair';

interface RentmanDropdownOption {
  id: number;
  name: string;
}

interface RentmanCustomFieldDefinition {
  id: number;
  name: string;
  belongs_to: RentmanCustomFieldModel;
  type: RentmanCustomFieldType;
  input_fields_group: string;
  required: boolean;
  default_value?: Primitive;
  options?: RentmanDropdownOption[];
  linked_item_type?: RentmanLinkedItemType;
}

const CUSTOM_FIELD_TYPES: readonly RentmanCustomFieldType[] = [
  'text',
  'formatted_text',
  'linked_item',
  'link',
  'phone',
  'yes_no',
  'color',
  'date',
  'datetime',
  'decimal',
  'dropdown',
  'integer',
  'long_text',
  'price',
];

const LINKED_ITEM_TYPES: readonly RentmanLinkedItemType[] = ['contact', 'crew'];

const CUSTOM_FIELD_MODELS: readonly RentmanCustomFieldModel[] = [
  'project',
  'subproject',
  'projectfunction',
  'projectcrew',
  'projectequipment',
  'projectvehicle',
  'equipment',
  'serialnumber',
  'subrental',
  'contact',
  'contactperson',
  'crew',
  'repair',
];

const MODEL_TYPE_IMPORTS: Record<RentmanCustomFieldModel, string> = {
  project: 'RentmanProject',
  subproject: 'RentmanSubProject',
  projectfunction: 'RentmanProjectFunction',
  projectcrew: 'RentmanProjectCrew',
  projectequipment: 'RentmanProjectEquipment',
  projectvehicle: 'RentmanProjectVehicle',
  equipment: 'RentmanEquipmentItem',
  serialnumber: 'RentmanSerialNumber',
  subrental: 'RentmanSubrental',
  contact: 'RentmanContact',
  contactperson: 'RentmanContactPerson',
  crew: 'RentmanCrewMember',
  repair: 'RentmanRepair',
};

const MODEL_PASCAL_NAMES: Record<RentmanCustomFieldModel, string> = {
  project: 'Project',
  subproject: 'SubProject',
  projectfunction: 'ProjectFunction',
  projectcrew: 'ProjectCrew',
  projectequipment: 'ProjectEquipment',
  projectvehicle: 'ProjectVehicle',
  equipment: 'Equipment',
  serialnumber: 'SerialNumber',
  subrental: 'Subrental',
  contact: 'Contact',
  contactperson: 'ContactPerson',
  crew: 'Crew',
  repair: 'Repair',
};

const TYPE_TO_TS: Record<RentmanCustomFieldType, string> = {
  text: 'string',
  formatted_text: 'string',
  linked_item: 'string',
  link: 'string',
  phone: 'string',
  yes_no: 'boolean',
  color: 'string',
  date: 'string',
  datetime: 'string',
  decimal: 'number',
  dropdown: 'string',
  integer: 'number',
  long_text: 'string',
  price: 'number',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidIdentifier(value: string): boolean {
  return /^[$A-Za-z_][$0-9A-Za-z_]*$/.test(value);
}

function toPascalCase(value: string): string {
  return value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function toUpperSnake(value: string): string {
  const withDelimiters = value.replace(/([a-z0-9])([A-Z])/g, '$1_$2');
  return withDelimiters
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .join('_')
    .toUpperCase();
}

function renderStringLiteral(value: string): string {
  return `'${value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')}'`;
}

function assertInteger(
  entry: Record<string, unknown>,
  key: string,
  label: string,
  errors: string[],
): number | undefined {
  const value = entry[key];
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    errors.push(`${label} must be an integer.`);
    return undefined;
  }
  return value;
}

function assertString(
  entry: Record<string, unknown>,
  key: string,
  label: string,
  errors: string[],
): string | undefined {
  const value = entry[key];
  if (typeof value !== 'string' || value.trim() === '') {
    errors.push(`${label} must be a non-empty string.`);
    return undefined;
  }
  return value;
}

function assertBoolean(
  entry: Record<string, unknown>,
  key: string,
  label: string,
  errors: string[],
): boolean | undefined {
  const value = entry[key];
  if (typeof value !== 'boolean') {
    errors.push(`${label} must be a boolean.`);
    return undefined;
  }
  return value;
}

function validateEntry(
  rawEntry: unknown,
  row: number,
  warnings: string[],
  errors: string[],
): RentmanCustomFieldDefinition | undefined {
  const rowLabel = `custom-fields.config.json row ${row}`;

  if (!isRecord(rawEntry)) {
    errors.push(`${rowLabel} must be an object.`);
    return undefined;
  }

  const id = assertInteger(rawEntry, 'id', `${rowLabel}.id`, errors);
  const name = assertString(rawEntry, 'name', `${rowLabel}.name`, errors);
  const belongs_to_raw = assertString(
    rawEntry,
    'belongs_to',
    `${rowLabel}.belongs_to`,
    errors,
  );
  const type_raw = assertString(rawEntry, 'type', `${rowLabel}.type`, errors);
  const input_fields_group = assertString(
    rawEntry,
    'input_fields_group',
    `${rowLabel}.input_fields_group`,
    errors,
  );
  const required = assertBoolean(rawEntry, 'required', `${rowLabel}.required`, errors);

  if (
    id === undefined ||
    name === undefined ||
    belongs_to_raw === undefined ||
    type_raw === undefined ||
    input_fields_group === undefined ||
    required === undefined
  ) {
    return undefined;
  }

  if (!CUSTOM_FIELD_MODELS.includes(belongs_to_raw as RentmanCustomFieldModel)) {
    errors.push(
      `${rowLabel}.belongs_to has unknown value ${JSON.stringify(belongs_to_raw)}. Supported values: ${CUSTOM_FIELD_MODELS.join(', ')}`,
    );
    return undefined;
  }

  if (!CUSTOM_FIELD_TYPES.includes(type_raw as RentmanCustomFieldType)) {
    errors.push(
      `${rowLabel}.type has unknown value ${JSON.stringify(type_raw)}. Supported values: ${CUSTOM_FIELD_TYPES.join(', ')}`,
    );
    return undefined;
  }

  const belongs_to = belongs_to_raw as RentmanCustomFieldModel;
  const type = type_raw as RentmanCustomFieldType;

  const defaultRaw = rawEntry.default_value;
  const default_value =
    defaultRaw === undefined ||
    defaultRaw === null ||
    typeof defaultRaw === 'string' ||
    typeof defaultRaw === 'number' ||
    typeof defaultRaw === 'boolean'
      ? (defaultRaw as Primitive | undefined)
      : undefined;

  if (rawEntry.default_value !== undefined && default_value === undefined) {
    errors.push(`${rowLabel}.default_value must be string | number | boolean | null.`);
  }

  let options: RentmanDropdownOption[] | undefined;
  if (type === 'dropdown') {
    if (!Array.isArray(rawEntry.options) || rawEntry.options.length === 0) {
      warnings.push(
        `${rowLabel}: type=dropdown but options missing/empty. Falling back to string type for code generation.`,
      );
    } else {
      const parsedOptions: RentmanDropdownOption[] = [];
      for (let index = 0; index < rawEntry.options.length; index += 1) {
        const option = rawEntry.options[index];
        if (!isRecord(option)) {
          errors.push(`${rowLabel}.options[${index}] must be an object.`);
          continue;
        }

        const optionId = assertInteger(
          option,
          'id',
          `${rowLabel}.options[${index}].id`,
          errors,
        );
        const optionName = assertString(
          option,
          'name',
          `${rowLabel}.options[${index}].name`,
          errors,
        );

        if (optionId !== undefined && optionName !== undefined) {
          parsedOptions.push({ id: optionId, name: optionName });
        }
      }

      if (parsedOptions.length > 0) {
        options = parsedOptions;
      }
    }
  } else if (rawEntry.options !== undefined) {
    warnings.push(`${rowLabel}: options provided but ignored because type is ${type}.`);
  }

  let linked_item_type: RentmanLinkedItemType | undefined;
  if (type === 'linked_item') {
    if (rawEntry.linked_item_type === undefined) {
      warnings.push(
        `${rowLabel}: type=linked_item but linked_item_type missing. Falling back to generic string documentation.`,
      );
    } else if (typeof rawEntry.linked_item_type !== 'string') {
      errors.push(`${rowLabel}.linked_item_type must be a string.`);
    } else if (!LINKED_ITEM_TYPES.includes(rawEntry.linked_item_type as RentmanLinkedItemType)) {
      errors.push(
        `${rowLabel}.linked_item_type has unknown value ${JSON.stringify(rawEntry.linked_item_type)}. Supported values: ${LINKED_ITEM_TYPES.join(', ')}`,
      );
    } else {
      linked_item_type = rawEntry.linked_item_type as RentmanLinkedItemType;
    }
  } else if (rawEntry.linked_item_type !== undefined) {
    warnings.push(
      `${rowLabel}: linked_item_type provided but ignored because type is ${type}.`,
    );
  }

  return {
    id,
    name,
    belongs_to,
    type,
    input_fields_group,
    required,
    default_value,
    options,
    linked_item_type,
  };
}

function generateFieldType(field: RentmanCustomFieldDefinition): string {
  if (field.type === 'dropdown' && field.options && field.options.length > 0) {
    const union = field.options.map(option => renderStringLiteral(option.name)).join(' | ');
    return union;
  }

  return TYPE_TO_TS[field.type];
}

function renderFieldComment(field: RentmanCustomFieldDefinition): string {
  let comment = `${field.type} [id: ${field.id}] group: ${field.input_fields_group}`;

  if (field.type === 'dropdown' && field.options && field.options.length > 0) {
    const optionSummary = field.options
      .map(option => `${option.id}=${option.name}`)
      .join(', ');
    comment += ` — Options: ${optionSummary}`;
  }

  if (field.type === 'linked_item' && field.linked_item_type) {
    comment += ` — links to: ${field.linked_item_type}`;
  }

  return comment;
}

function renderInterfaceProperty(field: RentmanCustomFieldDefinition): string {
  const fieldKey = isValidIdentifier(field.name)
    ? field.name
    : renderStringLiteral(field.name);
  const optional = field.required ? '' : '?';
  const fieldType = generateFieldType(field);
  const comment = renderFieldComment(field);

  return `  /** ${comment} */\n  ${fieldKey}${optional}: ${fieldType};`;
}

function renderDropdownHelpers(
  model: RentmanCustomFieldModel,
  field: RentmanCustomFieldDefinition,
  interfaceName: string,
): string {
  if (field.type !== 'dropdown' || !field.options || field.options.length === 0) {
    return '';
  }

  const modelPascal = MODEL_PASCAL_NAMES[model];
  const fieldPascal = toPascalCase(field.name);
  const constantName = `${toUpperSnake(model)}_${toUpperSnake(field.name)}_OPTIONS`;
  const parseFn = `parse${modelPascal}${fieldPascal}`;
  const serializeFn = `serialize${modelPascal}${fieldPascal}`;
  const fieldType = `NonNullable<${interfaceName}[${renderStringLiteral(field.name)}]>`;

  const optionLines = field.options
    .map(option => `  { id: ${option.id}, name: ${renderStringLiteral(option.name)} },`)
    .join('\n');

  return [
    `export const ${constantName} = [`,
    optionLines,
    '] as const;',
    '',
    `/** Converts API integer ID → string name for ${model}.${field.name} */`,
    `export function ${parseFn}(id: number): ${fieldType} {`,
    `  const opt = ${constantName}.find(o => o.id === id);`,
    `  if (!opt) throw new Error(\`Unknown ${model}.${field.name} id: \${id}\`);`,
    '  return opt.name;',
    '}',
    '',
    `/** Converts string name → API integer ID for ${model}.${field.name} */`,
    `export function ${serializeFn}(name: ${fieldType}): number {`,
    `  const opt = ${constantName}.find(o => o.name === name);`,
    `  if (!opt) throw new Error(\`Unknown ${model}.${field.name} name: \${name}\`);`,
    '  return opt.id;',
    '}',
  ].join('\n');
}

function generateFile(definitions: RentmanCustomFieldDefinition[]): string {
  const byModel = new Map<RentmanCustomFieldModel, RentmanCustomFieldDefinition[]>();
  const modelOrder: RentmanCustomFieldModel[] = [];

  for (const definition of definitions) {
    const existing = byModel.get(definition.belongs_to);
    if (!existing) {
      byModel.set(definition.belongs_to, [definition]);
      modelOrder.push(definition.belongs_to);
    } else {
      existing.push(definition);
    }
  }

  const usedTypeImports = modelOrder.map(model => MODEL_TYPE_IMPORTS[model]);
  const sections: string[] = [];

  for (const model of modelOrder) {
    const modelPascal = MODEL_PASCAL_NAMES[model];
    const interfaceName = `${modelPascal}CustomFields`;
    const aliasName = `${modelPascal}WithCustom`;
    const modelType = MODEL_TYPE_IMPORTS[model];
    const fields = byModel.get(model) ?? [];

    const sortedFields = [
      ...fields.filter(field => field.required),
      ...fields.filter(field => !field.required),
    ];

    const interfaceBody = sortedFields
      .map(field => renderInterfaceProperty(field))
      .join('\n');

    const helperBlocks = sortedFields
      .map(field => renderDropdownHelpers(model, field, interfaceName))
      .filter(Boolean)
      .join('\n\n');

    const sectionHeader = `// ─── ${model} ${'─'.repeat(Math.max(1, SECTION_HEADER_WIDTH - model.length))}`;
    const sectionLines = [
      sectionHeader,
      '',
      `export interface ${interfaceName} {`,
      interfaceBody,
      '}',
      `export type ${aliasName} = WithCustomFields<${modelType}, ${interfaceName}>;`,
    ];

    if (helperBlocks) {
      sectionLines.push('', helperBlocks);
    }

    sections.push(sectionLines.join('\n'));
  }

  const headerLines = [
    '// AUTO-GENERATED — do not edit manually.',
    '// Source: custom-fields.config.json',
    '// Run `npm run generate:custom-fields` to regenerate.',
    '',
    "import type { WithCustomFields } from '../custom-fields.js';",
  ];

  if (usedTypeImports.length > 0) {
    headerLines.push(`import type { ${usedTypeImports.join(', ')} } from '../types.js';`);
  }

  headerLines.push('', '');
  const header = headerLines.join('\n');

  return `${header}${sections.join('\n\n')}`.trimEnd() + '\n';
}

function main(): void {
  const warnings: string[] = [];
  const errors: string[] = [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[generate:custom-fields] Failed to read ${CONFIG_PATH}: ${message}`);
    process.exit(1);
  }

  if (!Array.isArray(parsed)) {
    console.error('[generate:custom-fields] Config must be a flat JSON array.');
    process.exit(1);
  }

  const definitions = parsed
    .map((entry, index) => validateEntry(entry, index + 1, warnings, errors))
    .filter((entry): entry is RentmanCustomFieldDefinition => entry !== undefined);

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`[generate:custom-fields] ERROR: ${error}`);
    }
    process.exit(1);
  }

  for (const warning of warnings) {
    console.warn(`[generate:custom-fields] WARNING: ${warning}`);
  }

  const output = generateFile(definitions);
  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, output, 'utf8');

  console.log(
    `[generate:custom-fields] Generated ${OUTPUT_PATH} from ${definitions.length} custom field definitions.`,
  );
}

main();
