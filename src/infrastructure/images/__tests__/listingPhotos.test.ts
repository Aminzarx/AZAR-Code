import { NativeModules, PermissionsAndroid, Platform } from 'react-native'

const native = {
  toWebpData: jest.fn(),
  takePhoto: jest.fn(),
  removeShot: jest.fn(),
  pickImages: jest.fn()
}

describe('listing photos (Amin #5062)', () => {
  let photos: typeof import('../listingPhotos')

  beforeEach(() => {
    jest.resetModules()
    Platform.OS = 'android'
    NativeModules.AzarImage = native
    native.toWebpData.mockReset().mockResolvedValue({ base64: 'UklG', bytes: 120_000, width: 1600, height: 1200 })
    native.takePhoto.mockReset()
    native.removeShot.mockReset().mockResolvedValue(true)
    native.pickImages.mockReset()
    jest.spyOn(PermissionsAndroid, 'request').mockResolvedValue(PermissionsAndroid.RESULTS.GRANTED)
    photos = require('../listingPhotos') as typeof import('../listingPhotos')
  })

  it('every picture becomes a WebP with a long side of at most 1600 px at quality 80, converted in memory', async () => {
    expect(photos.PHOTO_MAX_SIDE).toBe(1600)
    expect(photos.PHOTO_QUALITY).toBe(80)
    await photos.convertPhoto('content://media/1')
    expect(native.toWebpData).toHaveBeenCalledWith('content://media/1', 1600, 80)
  })

  it('gallery (Amin #5416): several at once in the photo picker, never more than the room left', async () => {
    native.pickImages.mockResolvedValue(['content://a', 'content://b', 'content://c'])
    const added = await photos.pickPhotos(2)
    expect(native.pickImages).toHaveBeenCalledWith(2)
    expect(added).toHaveLength(2)
    expect(native.toWebpData.mock.calls.map((c) => c[0])).toEqual(['content://a', 'content://b'])
  })

  it('gallery closed = nothing added', async () => {
    native.pickImages.mockResolvedValue([])
    expect(await photos.pickPhotos(3)).toEqual([])
  })

  it('camera: the temporary shot is deleted once converted, even when converting fails', async () => {
    native.takePhoto.mockResolvedValue({ uri: 'file:///cache/camera/shot-1.jpg', path: '/cache/camera/shot-1.jpg' })
    expect((await photos.takePhoto())?.bytes).toBe(120_000)
    expect(native.removeShot).toHaveBeenCalledWith('/cache/camera/shot-1.jpg')

    native.removeShot.mockClear()
    native.toWebpData.mockRejectedValue(new Error('not_an_image'))
    await expect(photos.takePhoto()).rejects.toThrow('not_an_image')
    expect(native.removeShot).toHaveBeenCalledWith('/cache/camera/shot-1.jpg')
  })

  it('camera: no permission → a clear error, the camera is not opened', async () => {
    jest.spyOn(PermissionsAndroid, 'request').mockResolvedValue(PermissionsAndroid.RESULTS.DENIED)
    await expect(photos.takePhoto()).rejects.toBeInstanceOf(photos.CameraPermissionError)
    expect(native.takePhoto).not.toHaveBeenCalled()
  })
})
