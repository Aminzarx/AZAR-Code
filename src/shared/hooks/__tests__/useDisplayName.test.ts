import { renderHook, waitFor, act } from '@testing-library/react-native'
import { useDisplayName } from '../useDisplayName'
import { getDatabase } from '@infrastructure/database/connection'
import { ApplicationSettingsRepository } from '@infrastructure/database/repositories/ApplicationSettingsRepository'

jest.mock('@infrastructure/database/connection')
jest.mock('@infrastructure/database/repositories/ApplicationSettingsRepository')

const mockedGetDatabase = getDatabase as jest.MockedFunction<typeof getDatabase>
const MockedRepository = ApplicationSettingsRepository as jest.MockedClass<
  typeof ApplicationSettingsRepository
>

describe('useDisplayName', () => {
  const mockGet = jest.fn()
  const mockSet = jest.fn()

  beforeEach(() => {
    mockGet.mockReset()
    mockSet.mockReset()
    mockedGetDatabase.mockResolvedValue({} as never)
    MockedRepository.mockImplementation(
      () => ({ get: mockGet, set: mockSet, delete: jest.fn() }) as never
    )
  })

  it('loads a previously stored display name', async () => {
    mockGet.mockResolvedValue('محمد رضایی')

    const { result } = await renderHook(() => useDisplayName())

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.displayName).toBe('محمد رضایی')
    expect(mockGet).toHaveBeenCalledWith('display_name')
  })

  it('returns null when no display name has been set yet', async () => {
    mockGet.mockResolvedValue(null)

    const { result } = await renderHook(() => useDisplayName())

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.displayName).toBeNull()
  })

  it('saves a trimmed display name', async () => {
    mockGet.mockResolvedValue(null)
    mockSet.mockResolvedValue(undefined)

    const { result } = await renderHook(() => useDisplayName())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.setDisplayName('  محمد رضایی  ')
    })

    expect(mockSet).toHaveBeenCalledWith('display_name', 'محمد رضایی')
    expect(result.current.displayName).toBe('محمد رضایی')
  })
})
