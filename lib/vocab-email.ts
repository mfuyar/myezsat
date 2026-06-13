import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

type VocabWordForEmail = {
  id: string;
  word: string;
  partOfSpeech: string;
  definition: string;
  example: string;
  difficulty: string;
  category: string | null;
};

type SendWordEmailOptions = {
  userId: string;
  to: string;
  name?: string | null;
  words?: VocabWordForEmail[];
  dryRun?: boolean;
  updateSubscription?: boolean;
};

const WORDS_PER_EMAIL = 3;
const DEFAULT_FROM = "myezsat <vocab@myezsat.com>";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wordPlainText(word: VocabWordForEmail, index: number) {
  return [
    `${index + 1}. ${word.word} (${word.partOfSpeech})`,
    `Definition: ${word.definition}`,
    `Example: ${word.example}`,
    `Difficulty: ${word.difficulty}${word.category ? ` | ${word.category}` : ""}`,
  ].join("\n");
}

export function buildVocabEmail({
  name,
  words,
}: {
  name?: string | null;
  words: VocabWordForEmail[];
}) {
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

export async function getNextWords(userId: string, take = WORDS_PER_EMAIL) {
  const [subscription, total] = await Promise.all([
    prisma.wordSubscription.findUnique({ where: { userId } }),
    prisma.vocabWord.count({ where: { active: true } }),
  ]);

  if (!total) return [];

  const skip = subscription ? subscription.wordIndex % total : 0;
  const firstBatch = await prisma.vocabWord.findMany({
    where: { active: true },
    orderBy: { word: "asc" },
    skip,
    take,
  });

  if (firstBatch.length >= take) return firstBatch;

  const secondBatch = await prisma.vocabWord.findMany({
    where: { active: true },
    orderBy: { word: "asc" },
    take: take - firstBatch.length,
  });

  return [...firstBatch, ...secondBatch];
}

export async function sendVocabEmail({ userId, to, name, words, dryRun, updateSubscription = true }: SendWordEmailOptions) {
  const selectedWords = words ?? (await getNextWords(userId));
  if (!selectedWords.length) {
    return { sent: false, reason: "No active vocabulary words found.", words: selectedWords };
  }

  const email = buildVocabEmail({ name, words: selectedWords });

  if (!dryRun) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not configured.");
    }

    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: process.env.VOCAB_EMAIL_FROM ?? DEFAULT_FROM,
      to,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
  }

  if (updateSubscription) {
    await prisma.$transaction(async (tx) => {
      const activeCount = await tx.vocabWord.count({ where: { active: true } });
      const current = await tx.wordSubscription.findUnique({ where: { userId } });
      const nextIndex = activeCount ? ((current?.wordIndex ?? 0) + selectedWords.length) % activeCount : 0;

      await tx.wordSubscription.upsert({
        where: { userId },
        create: {
          userId,
          enabled: true,
          lastSentAt: dryRun ? null : new Date(),
          wordIndex: nextIndex,
        },
        update: {
          lastSentAt: dryRun ? current?.lastSentAt : new Date(),
          wordIndex: nextIndex,
        },
      });

      await tx.wordDeliveryLog.create({
        data: {
          userId,
          wordIds: selectedWords.map((word) => word.id),
          status: dryRun ? "test" : "sent",
        },
      });
    });
  }

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

export function isSubscriptionDue(
  subscription: { deliveryHour: number; timezone: string; lastSentAt: Date | null },
  now = new Date()
) {
  if (hourInTimezone(now, subscription.timezone) !== subscription.deliveryHour) return false;
  if (!subscription.lastSentAt) return true;

  const lastLocalDate = new Intl.DateTimeFormat("en-CA", {
    dateStyle: "short",
    timeZone: subscription.timezone,
  }).format(subscription.lastSentAt);
  const todayLocalDate = new Intl.DateTimeFormat("en-CA", {
    dateStyle: "short",
    timeZone: subscription.timezone,
  }).format(now);

  return lastLocalDate !== todayLocalDate;
}

export async function sendDueVocabEmails(now = new Date()) {
  const subscriptions = await prisma.wordSubscription.findMany({
    where: { enabled: true },
    include: { user: { select: { id: true, email: true, name: true, suspended: true, deletedAt: true } } },
  });

  let sent = 0;
  let skipped = 0;
  const errors: Array<{ userId: string; message: string }> = [];

  for (const subscription of subscriptions) {
    if (subscription.user.suspended || subscription.user.deletedAt || !isSubscriptionDue(subscription, now)) {
      skipped++;
      continue;
    }

    try {
      await sendVocabEmail({
        userId: subscription.user.id,
        to: subscription.user.email,
        name: subscription.user.name,
      });
      sent++;
    } catch (error) {
      errors.push({
        userId: subscription.user.id,
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return { sent, skipped, errors };
}
