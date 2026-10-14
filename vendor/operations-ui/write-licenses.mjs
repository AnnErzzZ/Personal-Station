import { readFile, readdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = fileURLToPath(new URL('.', import.meta.url))
const lock = JSON.parse(await readFile(path.join(root, 'package-lock.json'), 'utf8'))
const entries = ['Third-party notices for the operations platform demo controls.\nRuntime and build dependency licenses are included below.']
for (const [location, metadata] of Object.entries(lock.packages).sort(([a], [b]) => a.localeCompare(b))) {
  if (!location) continue
  const directory = path.join(root, location)
  let files
  try { files = await readdir(directory) } catch { continue } // Platform-specific optional packages may be absent.
  const licenses = files.filter((name) => /^(licen[sc]e|copying|notice)(\.|$)/i.test(name))
  const body = await Promise.all(licenses.map(async (name) => `${name}\n${await readFile(path.join(directory, name), 'utf8')}`))
  entries.push(`${location.replace(/^node_modules\//, '')} ${metadata.version}\nLicense: ${metadata.license ?? 'See bundled license'}\n${body.join('\n')}`)
}
await writeFile(new URL('../../public/work/operations-platform/controls/THIRD-PARTY-LICENSES.txt', import.meta.url), entries.join('\n\n' + '='.repeat(72) + '\n\n') + '\n')
