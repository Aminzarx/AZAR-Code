/**
 * Single source of truth for the app's release version, checked against
 * GitHub Releases by the update checker
 * (@infrastructure/updates/updateService). Bump this alongside
 * package.json's "version" and android/app/build.gradle's versionName on
 * every release tag.
 */
export const APP_VERSION = '1.0.0'
