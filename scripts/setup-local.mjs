import { localVars, wrangler } from './lib.mjs'
await localVars()
await wrangler(['d1', 'migrations', 'apply', 'portfolio', '--local'])
const { executeSql } = await import('./lib.mjs')
const { seedSql } = await import('./seed.mjs')
await executeSql(seedSql(), false)
console.log('Local database ready. Next: npm run owner:create, then npm run dev.')
