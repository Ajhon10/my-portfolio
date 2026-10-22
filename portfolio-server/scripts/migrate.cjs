// Explicit release operation. Never run migrations automatically in preview builds.
require('dotenv').config()
const { spawnSync } = require('node:child_process')
if (!process.env.DATABASE_URL && !process.env.DIRECT_URL) {
  console.error('Set DIRECT_URL (or DATABASE_URL for a direct local connection).')
  process.exit(1)
}
const result = spawnSync(process.execPath, [require.resolve('prisma/build/index.js'),
  'migrate', 'deploy', '--schema', './src/database/schema'], {
  stdio: 'inherit',
  env: { ...process.env, DATABASE_URL: process.env.DIRECT_URL || process.env.DATABASE_URL },
})
process.exit(result.status ?? 1)
