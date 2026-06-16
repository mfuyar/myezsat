type VocabWord = {
  id: string;
  word: string;
  partOfSpeech: string;
  definition: string;
  example: string;
  difficulty: string;
  category: string | null;
  active: boolean;
};

type WordSubscription = {
  id: string;
  userId: string;
  enabled: boolean;
  deliveryHour: number;
  timezone: string;
  lastSentAt: string | null;
  wordIndex: number;
};

type User = {
  id: string;
  email: string;
  name: string | null;
  suspended: boolean;
  deletedAt: string | null;
};

type SendVocabEmailOptions = {
  userId: string;
  to: string;
  name?: string | null;
  dryRun?: boolean;
  updateSubscription?: boolean;
};

const WORDS_PER_EMAIL = 3;
const DEFAULT_FROM = "myezsat <vocab@myezsat.com>";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function env(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

function restUrl(table: string, query = "") {
  return `${env("SUPABASE_URL")}/rest/v1/${table}${query}`;
}

async function restRequest<T>(table: string, query = "", init: RequestInit = {}) {
  const serviceRoleKey = env("SUPABASE_SERVICE_ROLE_KEY");
  const res = await fetch(restUrl(table, query), {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  const bodyText = await res.text();
  const body = bodyText ? JSON.parse(bodyText) : null;
  if (!res.ok) {
    const message = body?.message ?? bodyText ?? `Supabase REST request failed for ${table}.`;
    throw new Error(message);
  }

  return body as T;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wordPlainText(word: VocabWord, index: number) {
  return [
    `${index + 1}. ${word.word} (${word.partOfSpeech})`,
    `Definition: ${word.definition}`,
    `Example: ${word.example}`,
    `Difficulty: ${word.difficulty}${word.category ? ` | ${word.category}` : ""}`,
  ].join("\n");
}

function buildVocabEmail({ name, words }: { name?: string | null; words: VocabWord[] }) {
  const displayName = name?.trim() || "there";
  const subject =
    words.length === 1
      ? `SAT vocab: ${words[0].word}`
      : `Your SAT vocab: ${words.map((w) => w.word).join(", ")}`;

  const text = [
    `Hi ${displayName},`,
    "",
    "Here are today's SAT vocabulary words:",
    "",
    ...words.flatMap((word, index) => [wordPlainText(word, index), ""]),
    "Keep your streak alive with one focused practice session today.",
    "https://myezsat.com/practice",
  ].join("\n");

  const wordCards = words
    .map(
      (word) => `
        <tr>
          <td style="padding:18px 0;border-top:1px solid #e7e1d8;">
            <p style="margin:0 0 4px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#6f7f88;">
              ${escapeHtml(word.partOfSpeech)} · ${escapeHtml(word.difficulty)}${word.category ? ` · ${escapeHtml(word.category)}` : ""}
            </p>
            <h2 style="margin:0 0 8px;font-size:24px;line-height:1.2;color:#151515;font-family:Georgia,serif;font-style:italic;">
              ${escapeHtml(word.word)}
            </h2>
            <p style="margin:0 0 10px;font-size:15px;line-height:1.6;color:#252525;">
              ${escapeHtml(word.definition)}
            </p>
            <p style="margin:0;font-size:14px;line-height:1.6;color:#5b5650;">
              <strong>In context:</strong> ${escapeHtml(word.example)}
            </p>
          </td>
        </tr>
      `
    )
    .join("");

  const html = `
    <!doctype html>
    <html>
      <body style="margin:0;padding:0;background:#f6f1e9;font-family:Arial,sans-serif;color:#151515;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f1e9;padding:32px 16px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fffaf2;border:1px solid #e4ddd2;border-radius:12px;padding:28px;">
                <tr>
                  <td>
                    <p style="margin:0 0 8px;font-size:13px;color:#6f7f88;">myezsat daily vocab</p>
                    <h1 style="margin:0 0 14px;font-size:28px;line-height:1.2;color:#151515;">Hi ${escapeHtml(displayName)}, here are today's words.</h1>
                    <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#5b5650;">Read each example out loud once, then use the word in your own sentence.</p>
                  </td>
                </tr>
                ${wordCards}
                <tr>
                  <td style="padding-top:22px;">
                    <a href="https://myezsat.com/practice" style="display:inline-block;background:#c9943d;color:#0d0d0f;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700;font-size:14px;">Practice now</a>
                    <p style="margin:18px 0 0;font-size:12px;line-height:1.5;color:#8a837a;">You can change vocabulary email settings from your myezsat account.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  return { subject, text, html };
}

async function getActiveWords() {
  return restRequest<VocabWord[]>(
    "VocabWord",
    "?select=id,word,partOfSpeech,definition,example,difficulty,category,active&active=eq.true&order=word.asc&limit=10000"
  );
}

async function getSubscription(userId: string) {
  const subscriptions = await restRequest<WordSubscription[]>(
    "WordSubscription",
    `?select=*&userId=eq.${encodeURIComponent(userId)}&limit=1`
  );
  return subscriptions[0] ?? null;
}

async function getNextWords(userId: string, take = WORDS_PER_EMAIL) {
  const [subscription, activeWords] = await Promise.all([getSubscription(userId), getActiveWords()]);
  if (!activeWords.length) return [];

  const skip = subscription ? subscription.wordIndex % activeWords.length : 0;
  const selected = activeWords.slice(skip, skip + take);
  if (selected.length >= take) return selected;

  return [...selected, ...activeWords.slice(0, take - selected.length)];
}

async function updateSubscriptionAfterSend(userId: string, selectedWords: VocabWord[], dryRun?: boolean) {
  const [current, activeWords] = await Promise.all([getSubscription(userId), getActiveWords()]);
  const nextIndex = activeWords.length ? ((current?.wordIndex ?? 0) + selectedWords.length) % activeWords.length : 0;
  const now = new Date().toISOString();

  if (current) {
    await restRequest<WordSubscription[]>("WordSubscription", `?userId=eq.${encodeURIComponent(userId)}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        enabled: true,
        lastSentAt: dryRun ? current.lastSentAt : now,
        wordIndex: nextIndex,
      }),
    });
  } else {
    await restRequest<WordSubscription[]>("WordSubscription", "", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        userId,
        enabled: true,
        lastSentAt: dryRun ? null : now,
        wordIndex: nextIndex,
      }),
    });
  }

  await restRequest("WordDeliveryLog", "", {
    method: "POST",
    body: JSON.stringify({
      userId,
      wordIds: selectedWords.map((word) => word.id),
      status: dryRun ? "test" : "sent",
    }),
  });
}

async function sendWithResend(to: string, email: { subject: string; html: string; text: string }) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env("RESEND_API_KEY")}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: Deno.env.get("VOCAB_EMAIL_FROM") ?? DEFAULT_FROM,
      to,
      subject: email.subject,
      html: email.html,
      text: email.text,
    }),
  });

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.message ?? "Resend failed to send the vocabulary email.");
  }

  return body;
}

function buildWelcomeEmail(name?: string | null) {
  const displayName = name?.trim() || "there";
  const subject = `You're in, ${displayName}! Welcome to MyEzSat`;
  const text = [
    `Hey ${displayName}!`,
    "",
    "I'm Kerem, the founder of MyEzSat — and I'm genuinely excited you're here.",
    "",
    "I built MyEzSat because SAT prep felt way too much like work. Every tool looked like a worksheet or a timer, and nothing made you actually want to come back the next day.",
    "",
    "So I built something different: a place where practice feels personal, progress is visible, and studying doesn't have to be a grind.",
    "",
    "Here's what's waiting for you:",
    "  - Practice questions with clear, step-by-step explanations",
    "  - Daily vocab emails — 3 SAT words in your inbox every day",
    "  - Streaks and progress tracking that actually motivate you",
    "  - Game-style XP and levels to make it feel less like studying",
    "",
    "Jump in whenever you're ready:",
    "https://myezsat.com/dashboard",
    "",
    "And if you ever have a question or just want to say hi — reply to this email. I read everything.",
    "",
    "Kerem",
    "Founder, MyEzSat",
  ].join("\n");

  const featureRows = [
    {
      icon: "&#128218;",
      title: "Practice questions",
      desc: "Real SAT-style questions with clear, step-by-step explanations.",
    },
    {
      icon: "&#128140;",
      title: "Daily vocab emails",
      desc: "3 SAT words in your inbox every day, at the time you choose.",
    },
    {
      icon: "&#128293;",
      title: "Streaks &amp; progress",
      desc: "Track your improvement and keep your streak alive — it adds up fast.",
    },
    {
      icon: "&#127942;",
      title: "Game-style motivation",
      desc: "Earn XP, level up, and compete — because studying works better when it's fun.",
    },
  ]
    .map(
      (f, i) => `
        <tr>
          <td style="padding:${i === 0 ? "14px" : "12px"} 0 12px;border-top:1px solid #ede5d8;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
              <tr>
                <td width="40" valign="top">
                  <table role="presentation" cellspacing="0" cellpadding="0">
                    <tr>
                      <td style="width:32px;height:32px;background:#fdf0d8;border:1px solid #e8d4a8;border-radius:8px;text-align:center;vertical-align:middle;font-size:16px;line-height:32px;">
                        ${f.icon}
                      </td>
                    </tr>
                  </table>
                </td>
                <td style="padding-left:12px;">
                  <p style="margin:0 0 3px;font-size:15px;font-weight:700;color:#171717;">${f.title}</p>
                  <p style="margin:0;font-size:14px;line-height:1.55;color:#5b5650;">${f.desc}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      `
    )
    .join("");

  const html = `
    <!doctype html>
    <html>
      <body style="margin:0;padding:0;background:#f4efe6;font-family:Arial,Helvetica,sans-serif;color:#171717;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4efe6;padding:34px 16px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#fffaf2;border:1px solid #e2d8c9;border-radius:16px;overflow:hidden;">

                <tr>
                  <td style="background:#171717;padding:36px 32px 30px;">
                    <p style="margin:0 0 10px;font-size:12px;color:#c9943d;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;">MyEzSat</p>
                    <h1 style="margin:0 0 10px;font-size:34px;line-height:1.15;color:#fffaf2;font-family:Georgia,serif;font-weight:400;">
                      You're in, ${escapeHtml(displayName)}!
                    </h1>
                    <p style="margin:0;font-size:16px;line-height:1.5;color:#c4b9a8;">SAT prep just got a lot less boring.</p>
                  </td>
                </tr>

                <tr>
                  <td style="padding:32px 32px 0;">
                    <p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#252525;">
                      Hey ${escapeHtml(displayName)}, I'm <strong>Kerem</strong> — the founder of MyEzSat. I'm really glad you're here.
                    </p>
                    <p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#252525;">
                      I built MyEzSat because SAT prep felt way too much like work. Every tool looked like another worksheet or timer, and nothing made you actually want to come back the next day.
                    </p>
                    <p style="margin:0;font-size:16px;line-height:1.7;color:#252525;">
                      So I built something different — a place where practice feels <em>personal</em>, progress is visible, and studying doesn't have to be a grind.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding:24px 32px 0;">
                    <p style="margin:0 0 2px;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#9c8a6e;">Here's what's waiting for you</p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      ${featureRows}
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="padding:28px 32px 32px;">
                    <a href="https://myezsat.com/dashboard" style="display:inline-block;background:#c9943d;color:#0d0d0f;text-decoration:none;padding:14px 24px;border-radius:9px;font-weight:700;font-size:15px;">Start your first session</a>
                    <p style="margin:24px 0 0;font-size:15px;line-height:1.7;color:#5b5650;">
                      If you have a question or just want to say hi — reply to this email. I read everything.
                    </p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:22px;padding-top:20px;border-top:1px solid #ede5d8;">
                      <tr>
                        <td>
                          <p style="margin:0;font-size:15px;line-height:1.5;color:#252525;"><strong>Kerem</strong></p>
                          <p style="margin:4px 0 0;font-size:13px;color:#9c8a6e;">Founder, MyEzSat</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="padding:16px 32px;background:#f0e7d8;border-top:1px solid #e2d8c9;">
                    <p style="margin:0;font-size:12px;line-height:1.5;color:#9c8a6e;">
                      You're receiving this because you created a MyEzSat account. &nbsp;&middot;&nbsp;
                      <a href="https://myezsat.com/settings" style="color:#9c8a6e;text-decoration:underline;">Manage preferences</a>
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  return { subject, text, html };
}

async function sendWelcomeEmail(to: string, name?: string | null) {
  const email = buildWelcomeEmail(name);
  await sendWithResend(to, email);
  return { sent: true, subject: email.subject };
}

async function sendVocabEmail({
  userId,
  to,
  name,
  dryRun,
  updateSubscription = true,
}: SendVocabEmailOptions) {
  const selectedWords = await getNextWords(userId);
  if (!selectedWords.length) {
    return { sent: false, reason: "No active vocabulary words found.", words: selectedWords };
  }

  const email = buildVocabEmail({ name, words: selectedWords });
  if (!dryRun) await sendWithResend(to, email);
  if (updateSubscription) await updateSubscriptionAfterSend(userId, selectedWords, dryRun);

  return { sent: true, words: selectedWords, subject: email.subject };
}

function hourInTimezone(date: Date, timezone: string) {
  const formatted = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    hourCycle: "h23",
    timeZone: timezone,
  }).format(date);

  return Number(formatted);
}

function isSubscriptionDue(
  subscription: { deliveryHour: number; timezone: string; lastSentAt: string | null },
  now = new Date()
) {
  if (hourInTimezone(now, subscription.timezone) !== subscription.deliveryHour) return false;
  if (!subscription.lastSentAt) return true;

  const lastLocalDate = new Intl.DateTimeFormat("en-CA", {
    dateStyle: "short",
    timeZone: subscription.timezone,
  }).format(new Date(subscription.lastSentAt));
  const todayLocalDate = new Intl.DateTimeFormat("en-CA", {
    dateStyle: "short",
    timeZone: subscription.timezone,
  }).format(now);

  return lastLocalDate !== todayLocalDate;
}

async function getUser(userId: string) {
  const users = await restRequest<User[]>(
    "User",
    `?select=id,email,name,suspended,deletedAt&id=eq.${encodeURIComponent(userId)}&limit=1`
  );
  return users[0] ?? null;
}

async function sendDueVocabEmails(now = new Date()) {
  const subscriptions = await restRequest<WordSubscription[]>("WordSubscription", "?select=*&enabled=eq.true");

  let sent = 0;
  let skipped = 0;
  const errors: Array<{ userId: string; message: string }> = [];

  for (const subscription of subscriptions) {
    const user = await getUser(subscription.userId);
    if (!user || user.suspended || user.deletedAt || !isSubscriptionDue(subscription, now)) {
      skipped++;
      continue;
    }

    try {
      await sendVocabEmail({
        userId: user.id,
        to: user.email,
        name: user.name,
      });
      sent++;
    } catch (error) {
      errors.push({
        userId: user.id,
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return { sent, skipped, errors };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const serviceRoleKey = env("SUPABASE_SERVICE_ROLE_KEY");
    const expectedCronSecret = Deno.env.get("CRON_SECRET");
    const providedCronSecret = req.headers.get("x-cron-secret");
    const authorization = req.headers.get("authorization");
    const hasServiceRoleAuthorization = authorization === `Bearer ${serviceRoleKey}`;

    if (!hasServiceRoleAuthorization && (!expectedCronSecret || providedCronSecret !== expectedCronSecret)) {
      return Response.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
    }

    const payload = await req.json().catch(() => ({}));

    if (payload.action === "send-test") {
      if (!payload.userId || !payload.to) {
        return Response.json({ error: "userId and to are required." }, { status: 400, headers: corsHeaders });
      }

      const result = await sendVocabEmail({
        userId: payload.userId,
        to: payload.to,
        name: payload.name,
        dryRun: Boolean(payload.dryRun),
        updateSubscription: false,
      });

      return Response.json(result, { headers: corsHeaders });
    }

    if (payload.action === "send-welcome") {
      if (!payload.to) {
        return Response.json({ error: "to is required." }, { status: 400, headers: corsHeaders });
      }

      const result = await sendWelcomeEmail(payload.to, payload.name);
      return Response.json(result, { headers: corsHeaders });
    }

    const result = await sendDueVocabEmails();
    return Response.json(result, { headers: corsHeaders });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Vocabulary email function failed." },
      { status: 500, headers: corsHeaders }
    );
  }
});
