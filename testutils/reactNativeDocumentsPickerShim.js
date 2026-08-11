/**
 * Jest-only stand-in for @react-native-documents/picker (mapped in
 * jest.config.js). Its package ships an ESM-only `lib/module` build that
 * Jest's CommonJS transform can't parse, and its native module doesn't
 * exist under Jest anyway — tests that need specific `pick`/
 * `keepLocalCopy`/`saveDocuments` behavior mock this module themselves
 * per-test, this is just a safe default.
 */
const errorCodes = Object.freeze({
  OPERATION_CANCELED: 'OPERATION_CANCELED',
  IN_PROGRESS: 'ASYNC_OP_IN_PROGRESS',
  UNABLE_TO_OPEN_FILE_TYPE: 'UNABLE_TO_OPEN_FILE_TYPE',
  NULL_PRESENTER: 'NULL_PRESENTER'
})

function isErrorWithCode(error) {
  return Boolean(error) && typeof error === 'object' && 'code' in error
}

module.exports = {
  pick: () => Promise.resolve([]),
  pickDirectory: () => Promise.resolve({}),
  keepLocalCopy: () => Promise.resolve([]),
  saveDocuments: () => Promise.resolve([]),
  isKnownType: () => ({}),
  errorCodes,
  isErrorWithCode,
  types: {}
}
