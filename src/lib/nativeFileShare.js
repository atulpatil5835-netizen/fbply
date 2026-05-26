import { Capacitor } from '@capacitor/core'

export function isNativeMobileApp() {
  return Capacitor.isNativePlatform()
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onloadend = () => {
      const result = String(reader.result || '')
      resolve(result.includes(',') ? result.split(',')[1] : result)
    }

    reader.onerror = () => reject(new Error('Unable to prepare file for sharing.'))
    reader.readAsDataURL(blob)
  })
}

export async function shareBlob(blob, fileName, options = {}) {
  const [{ Filesystem, Directory }, { Share }] = await Promise.all([
    import('@capacitor/filesystem'),
    import('@capacitor/share'),
  ])

  const data = await blobToBase64(blob)
  const savedFile = await Filesystem.writeFile({
    path: fileName,
    data,
    directory: Directory.Cache,
    recursive: true,
  })

  await Share.share({
    title: options.title || fileName,
    text: options.text || 'Your FBPly file is ready.',
    url: savedFile.uri,
    dialogTitle: options.dialogTitle || 'Save or share file',
  })

  return savedFile.uri
}

export function sharePdfBlob(blob, fileName) {
  return shareBlob(blob, fileName, {
    title: 'FBPly Financial Report',
    text: 'Your FBPly financial report is ready.',
    dialogTitle: 'Save or share report',
  })
}
