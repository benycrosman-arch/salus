"use client"

type CompressOptions = {
  maxDimension?: number
  quality?: number
  maxBytes?: number
}

// Anthropic vision rejects images over ~5 MB and only accepts JPEG/PNG/WebP.
// Phone photos are routinely 6–12 MB and iOS captures HEIC, so an untouched
// upload fails as either "image too large" or an invalid media type. Re-encoding
// through a canvas normalizes both: bounded dimensions, guaranteed JPEG.
const DEFAULTS: Required<CompressOptions> = {
  maxDimension: 1536,
  quality: 0.82,
  maxBytes: 4_500_000,
}

export async function compressImageToDataUrl(
  file: File,
  options: CompressOptions = {},
): Promise<string> {
  const { maxDimension, quality, maxBytes } = { ...DEFAULTS, ...options }

  const source = await loadImage(file)
  const scale = Math.min(1, maxDimension / Math.max(source.width, source.height))
  const w = Math.max(1, Math.round(source.width * scale))
  const h = Math.max(1, Math.round(source.height * scale))

  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext("2d")
  if (!ctx) return readAsDataUrl(file)
  ctx.drawImage(source, 0, 0, w, h)
  if ("close" in source) source.close()

  let q = quality
  let dataUrl = canvas.toDataURL("image/jpeg", q)
  // A base64 string is ~4/3 of the raw byte size; step quality down until the
  // decoded payload fits the budget, so we never ship an over-limit image.
  while (dataUrl.length * 0.75 > maxBytes && q > 0.4) {
    q = Math.round((q - 0.1) * 100) / 100
    dataUrl = canvas.toDataURL("image/jpeg", q)
  }
  return dataUrl
}

async function loadImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      // `from-image` bakes EXIF orientation into pixels so portrait photos
      // aren't drawn sideways.
      return await createImageBitmap(file, { imageOrientation: "from-image" })
    } catch {
      // Fall through to <img> decode (some browsers can't bitmap HEIC).
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new window.Image()
    img.decoding = "async"
    img.src = url
    await img.decode()
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error("Falha ao ler a imagem"))
    reader.readAsDataURL(file)
  })
}
