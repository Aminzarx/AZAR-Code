/**
 * One schema version bump, per docs/architecture/migration-strategy.md:
 * versions are monotonic and sequential, each runs inside a single
 * transaction, and `statements` are applied in order.
 */
export type Migration = {
  version: number
  description: string
  statements: readonly string[]
}
