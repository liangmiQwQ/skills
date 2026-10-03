import { cli } from '@liangmi/vp-config'

export default cli({
  pack: {
    entry: ['./src/index.ts'],
    deps: {
      onlyBundle: ['cac', 'picocolors']
    }
  }
})
