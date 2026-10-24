import * as fs from 'node:fs'
import * as path from 'node:path'
import React from 'react'
import { cleanup, render } from '@testing-library/react-native'
import { closeDatabase } from '@infrastructure/database/connection'
import { App } from '../App'

// Prevents the real update checker from making a live network request
// against the KSS server during this render-only test.
jest.mock('@infrastructure/updates/updateService', () => ({
  checkForUpdate: jest.fn().mockResolvedValue(null)
}))

// option A: the files are in memory; the encrypted store is the one file on disk
const DB_FILE = path.join(process.cwd(), `azar-store.test-${process.env.AZAR_TEST_DB_TAG}.db`)

describe('App', () => {
  afterEach(async () => {
    // unmount first: a still-mounted app would open the store again after the close below, and keep the file
    // locked for the next test file on this worker
    await cleanup()
    closeDatabase()
    if (fs.existsSync(DB_FILE)) {
      fs.unlinkSync(DB_FILE)
    }
  })

  it('renders the Welcome screen once initialized, for a user with no existing session', async () => {
    const { findByText } = await render(<App />)
    expect(await findByText('همهٔ فایل‌ها و مشتری‌هایتان در یک جا')).toBeTruthy()
    expect(await findByText('شروع')).toBeTruthy()
  })
})
