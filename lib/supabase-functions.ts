type VocabEmailFunctionPayload =
  | { action: "send-due" }
  | {
      action: "send-test";
      userId: string;
      to: string;
      name?: string | null;
      dryRun?: boolean;
    }
  | {
      action: "send-welcome";
      to: string;
      name?: string | null;
    };

export async function invokeVocabEmailFunction(payload: VocabEmailFunctionPayload) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase function invocation is not configured.");
  }

  const res = await fetch(`${supabaseUrl}/functions/v1/vocab-email`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${serviceRoleKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error ?? "Supabase vocab email function failed.");
  }

  return data;
}
