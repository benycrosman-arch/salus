// OpenAI embeddings (text-embedding-3-small, 1536 dim).
// Used to generate query vectors for the food search hybrid ranker.
// If OPENAI_API_KEY is unset, callers should fall back to fuzzy-only search.

export const EMBED_MODEL = "text-embedding-3-small"
export const EMBED_DIM = 1536

export async function embed(text: string): Promise<number[] | null> {
  const apiKey = Deno.env.get("OPENAI_API_KEY")
  if (!apiKey || !text || text.trim().length === 0) return null

  try {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: EMBED_MODEL,
        input: text.slice(0, 8000),
      }),
    })
    if (!res.ok) {
      console.warn(`OpenAI embed ${res.status}`)
      return null
    }
    const data = await res.json() as { data: Array<{ embedding: number[] }> }
    return data.data[0]?.embedding ?? null
  } catch (err) {
    console.warn("embed() failed:", (err as Error).message)
    return null
  }
}

/** Convert a JS number[] to the Postgres vector literal Supabase expects. */
export function toPgVector(v: number[] | null): string | null {
  if (!v) return null
  return `[${v.join(",")}]`
}
