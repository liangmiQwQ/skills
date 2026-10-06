import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import { expect, it } from 'vite-plus/test'

const bin = fileURLToPath(new URL('../bin/{{repo}}.mjs', import.meta.url))

// Runs the built binary, so `build` must run before `test`, like CI does.
function run(...args: string[]) {
  // oxlint-disable-next-line node/no-sync -- blocking is fine in a test
  return spawnSync(process.execPath, [bin, ...args], { encoding: 'utf8' })
}

it('prints usage with --help', () => {
  const { status, stdout } = run('--help')
  expect(status).toBe(0)
  expect(stdout).toContain('Usage')
})

it('default command is not implemented', () => {
  const { status, stderr } = run()
  expect(status).toBe(1)
  expect(stderr).toContain('Not implemented yet')
})
