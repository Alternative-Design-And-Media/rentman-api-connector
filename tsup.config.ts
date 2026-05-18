import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: {
      index: 'src/index.ts',
    },
    format: ['cjs', 'esm'],
    dts: true,
    clean: true,
  },
  {
    entry: {
      'scripts/generate-custom-fields': 'scripts/generate-custom-fields.ts',
    },
    format: ['cjs'],
    clean: false,
    banner: {
      js: '#!/usr/bin/env node',
    },
  },
]);
