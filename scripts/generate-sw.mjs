/**
 * Generates public/firebase-messaging-sw.js from the template,
 * substituting %VITE_xxx% placeholders with actual env vars.
 * Runs before both `vite dev` and `vite build`.
 */
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

// Parse a .env file and populate process.env (non-overwriting)
function loadEnvFile(path) {
  if (!existsSync(path)) return
  readFileSync(path, 'utf-8').split('\n').forEach(line => {
    const m = line.match(/^([^#=\s][^=]*)=(.*)$/)
    if (!m) return
    const key = m[1].trim()
    const val = m[2].trim().replace(/^["']|["']$/g, '')
    if (!(key in process.env)) process.env[key] = val
  })
}

loadEnvFile(resolve(root, '.env'))
loadEnvFile(resolve(root, '.env.local'))

const templatePath = resolve(root, 'public', 'firebase-messaging-sw.template.js')
const outputPath   = resolve(root, 'public', 'firebase-messaging-sw.js')

if (!existsSync(templatePath)) {
  console.warn('[generate-sw] template not found, skipping.')
  process.exit(0)
}

const result = readFileSync(templatePath, 'utf-8').replace(/%(\w+)%/g, (_, key) => {
  const val = process.env[key]
  if (!val) console.warn(`[generate-sw] env var ${key} is not set`)
  return val || ''
})

writeFileSync(outputPath, result)
console.log('[generate-sw] firebase-messaging-sw.js generated ✓')
