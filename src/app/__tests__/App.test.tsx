import * as fs from 'node:fs'
import * as path from 'node:path'
import React from 'react'
import { render } from '@testing-library/react-native'
import { closeDatabase } from '@infrastructure/database/connection'
import { App } from '../App'

const DB_FILE = path.join(process.cwd(), `azar.test-${process.env.JEST_WORKER_ID}.db`)

describe('App', () => {
  afterEach(() => {
    closeDatabase()
    if (fs.existsSync(DB_FILE)) {
      fs.unlinkSync(DB_FILE)
    }
  })

  it('renders the Welcome screen once initialized, for a user with no existing session', async () => {
    const { findByText } = await render(<App />)
    expect(await findByText('به آزار خوش آمدید')).toBeTruthy()
    expect(await findByText('شروع کنید')).toBeTruthy()
  })
})
