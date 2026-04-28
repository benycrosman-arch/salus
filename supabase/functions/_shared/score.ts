// Recompute the meal score server-side so the client cannot inflate it.

export function calculateMealScore(
  fiberDiversityCount: number,
  glycemicImpact: string,
  processedFoodRatio: number,
): number {
  const glycemicNum =
    glycemicImpact === "low" ? 0 : glycemicImpact === "medium" ? 0.5 : 1
  const safeFiber = Math.max(0, Number(fiberDiversityCount) || 0)
  const safeRatio = Math.min(1, Math.max(0, Number(processedFoodRatio) || 0))
  const score =
    (safeFiber / 5) * 40 + (1 - glycemicNum) * 30 + (1 - safeRatio) * 30
  return Math.max(0, Math.min(100, Math.round(score)))
}

export function parseMediaType(image: string): {
  mediaType: "image/jpeg" | "image/png" | "image/webp"
  base64: string
  error?: string
} {
  let mediaType: "image/jpeg" | "image/png" | "image/webp" = "image/jpeg"
  let base64 = image

  if (image.startsWith("data:")) {
    const match = image.match(/^data:(image\/\w+);base64,(.+)$/)
    if (match) {
      const detectedType = match[1]
      if (detectedType === "image/gif") {
        return { mediaType, base64, error: "GIF images are not supported. Please use JPEG, PNG, or WebP." }
      }
      mediaType = detectedType as typeof mediaType
      base64 = match[2]
    }
  }

  return { mediaType, base64 }
}
