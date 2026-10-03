import { cac } from 'cac'
import c from 'picocolors'

const cli = cac('{{repo}}')

cli.command('').action(() => {
  console.error(c.red('Not implemented yet'))
  process.exitCode = 1
})

cli.help()
cli.parse()
