import type { Migration } from '../types'
import { migration0001InitialSchema } from './0001_initial_schema'

/**
 * Ordered by version, ascending — docs/architecture/migration-strategy.md
 * requires monotonic, sequential, never-reused version numbers.
 */
export const migrations: readonly Migration[] = [migration0001InitialSchema]
