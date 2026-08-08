import type { Migration } from '../types'
import { migration0001InitialSchema } from './0001_initial_schema'
import { migration0002Properties } from './0002_properties'

/**
 * Ordered by version, ascending — docs/architecture/migration-strategy.md
 * requires monotonic, sequential, never-reused version numbers.
 */
export const migrations: readonly Migration[] = [
  migration0001InitialSchema,
  migration0002Properties
]
