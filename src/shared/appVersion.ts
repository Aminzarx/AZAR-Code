/**
 * The app's release version, checked against the KSS update file by the update checker
 * (@infrastructure/updates/updateService). Read from package.json, which android/app/build.gradle's versionName
 * also reads, so a release changes it in one place. (1.5.3 shipped still saying 1.5.2 here, so it kept offering
 * itself as an update — Amin #5325.)
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
export const APP_VERSION: string = require('../../package.json').version
