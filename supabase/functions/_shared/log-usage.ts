import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4"
import { MODEL_ID } from "./anthropic.ts"

/**
 * ai_usage_log has insert blocked for clients (RLS), so this requires
 * a service-role client. Pass `serviceClient()` from auth.ts.
 */
export async function logUsage(
  service: SupabaseClient,
  args: { userId: string; tokens: number; edgeFunction: string; model?: string },
): Promise<void> {
  const { error } = await service.from("ai_usage_log").insert({
    user_id: args.userId,
    tokens_used: args.tokens,
    model: args.model ?? MODEL_ID,
    edge_function: args.edgeFunction,
  })
  if (error) console.error("ai_usage_log insert failed:", error.message)
}

export async function logAbuse(
  service: SupabaseClient,
  args: { userId: string; type: string; content: string; edgeFunction: string },
): Promise<void> {
  const { error } = await service.from("abuse_reports").insert({
    user_id: args.userId,
    type: args.type,
    content: args.content.slice(0, 500),
    edge_function: args.edgeFunction,
  })
  if (error) console.error("abuse_reports insert failed:", error.message)
}
