import { createEntries } from './rollup.config'

export default createEntries([
  { file: 'dist/vuex.esm.browser.js', format: 'es', browser: true, transpile: false, env: 'development' },
  { file: 'dist/vuex.esm.browser.min.js', format: 'es', browser: true, transpile: false, minify: true, env: 'production' },
  { file: 'dist/vuex.esm.js', format: 'es', env: 'development' },
  { file: 'dist/vuex.js', format: 'umd', env: 'development' },
  { file: 'dist/vuex.min.js', format: 'umd', minify: true, env: 'production' },
  { file: 'dist/vuex.common.js', format: 'cjs', env: 'development' }
])
