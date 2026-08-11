import { HttpAuthApiClient } from '../httpAuthApiClient'
import {
  AuthenticationFailureError,
  NetworkFailureError,
  ValidationFailureError
} from '../../../core/auth/errors'

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  } as Response
}

function emptyResponse(status: number): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => null } as Response
}

describe('HttpAuthApiClient', () => {
  const baseUrl = 'https://api.example.test'
  let client: HttpAuthApiClient
  let fetchMock: jest.Mock

  beforeEach(() => {
    fetchMock = jest.fn()
    global.fetch = fetchMock as unknown as typeof fetch
    client = new HttpAuthApiClient(baseUrl)
  })

  it('sends OTP via POST /auth/send-otp', async () => {
    fetchMock.mockResolvedValue(emptyResponse(204))
    await client.sendOtp('+989121234567')
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/auth/send-otp`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ phoneNumber: '+989121234567' })
      })
    )
  })

  it('accepts any code at verify-otp (server owns the decision)', async () => {
    fetchMock.mockResolvedValue(emptyResponse(204))
    await expect(client.verifyOtp('+989121234567', 'anything')).resolves.toBeUndefined()
  })

  it('returns register result on success', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(201, { userId: 'u1', referralCode: 'ABCD1234', sessionToken: 'tok' })
    )
    const result = await client.register('+989121234567', 'AZARSEED')
    expect(result).toEqual({ userId: 'u1', referralCode: 'ABCD1234', sessionToken: 'tok' })
  })

  it('maps a validation error code to ValidationFailureError', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(422, {
        error: { code: 'self_referral', message: 'You cannot use your own referral code.' }
      })
    )
    await expect(client.register('+989121234567', 'OWNCODE1')).rejects.toMatchObject({
      name: 'ValidationFailureError',
      code: 'self_referral'
    })
    await expect(client.register('+989121234567', 'OWNCODE1')).rejects.toBeInstanceOf(
      ValidationFailureError
    )
  })

  it('maps a 401 to AuthenticationFailureError', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(401, {
        error: {
          code: 'authentication_required',
          message: 'Verify your phone number before registering.'
        }
      })
    )
    await expect(client.register('+989121234567', 'AZARSEED')).rejects.toBeInstanceOf(
      AuthenticationFailureError
    )
  })

  it('maps a network failure to NetworkFailureError', async () => {
    fetchMock.mockRejectedValue(new Error('offline'))
    await expect(client.sendOtp('+989121234567')).rejects.toBeInstanceOf(NetworkFailureError)
  })

  it('maps an unrecognized error shape to NetworkFailureError', async () => {
    fetchMock.mockResolvedValue(jsonResponse(500, { error: { code: 'internal_error' } }))
    await expect(client.login('+989121234567')).rejects.toBeInstanceOf(NetworkFailureError)
  })
})
