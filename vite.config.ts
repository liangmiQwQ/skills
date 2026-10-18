import { liangmi } from '@liangmi/vp-config'

// Skill examples are standalone templates, not source files of this repository.
export default await liangmi({ lint: { ignores: ['skills/**'] } })
