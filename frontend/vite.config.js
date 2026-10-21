import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'

// A unique id per build. The app compares it with /version.json to update
// itself, and the service worker uses it to refresh its cache.
const BUILD_ID = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)

function buildVersionPlugin() {
  let outDir = 'dist'
  return {
    name: 'arthaledger-build-version',
    apply: 'build',
    configResolved(config) { outDir = path.resolve(config.root, config.build.outDir) },
    closeBundle() {
      fs.writeFileSync(path.join(outDir, 'version.json'), JSON.stringify({ build: BUILD_ID }))
      const sw = path.join(outDir, 'sw.js')
      if (fs.existsSync(sw)) {
        fs.writeFileSync(sw, fs.readFileSync(sw, 'utf8').replaceAll('__BUILD_ID__', BUILD_ID))
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({ fastRefresh: false }),
    tailwindcss(),
    buildVersionPlugin(),
  ],
  define: {
    __BUILD_ID__: JSON.stringify(BUILD_ID),
  },
  server: {
    port: 5173,
  },
})
