/**
 * The app's release version, checked against the KSS update file by the update checker
 * (@infrastructure/updates/updateService). Read from package.json, which android/app/build.gradle's versionName
 * also reads, so a release changes it in one place. (1.5.3 shipped still saying 1.5.2 here, so it kept offering
 * itself as an update — Amin #5325.)
 */
// an import, not require(): the web build (#5183) has no require and stayed blank since 1.5.4 (found for #5543)
import packageJson from '../../package.json'

export const APP_VERSION: string = packageJson.version
