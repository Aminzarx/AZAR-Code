module.exports = {
  root: true,
  extends: '@react-native',
  rules: {
    // Business logic must never live inside UI components (§Phase 5 control rule).
    // No enforceable lint rule for this yet — reviewed manually until an
    // architectural-boundary lint rule is introduced in a later phase.
  }
}
