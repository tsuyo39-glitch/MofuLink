import imageCompression from 'browser-image-compression'

export async function compressImage(file: File): Promise<Blob> {
  return imageCompression(file, {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 1280,
    useWebWorker: true,
  })
}
