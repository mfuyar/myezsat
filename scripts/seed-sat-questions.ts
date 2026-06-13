/**
 * Seed SAT questions from parsed JSON into the database.
 * Run with: npx tsx scripts/seed-sat-questions.ts
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

interface ParsedQuestion {
  subject: string;
  topicId: string;
  difficulty: string;
  sourceFile: string;
  questionNum: number;
  hasImage: boolean;
  passage: string | null;
  question: string;
  choiceA: string;
  choiceB: string;
  choiceC: string;
  choiceD: string | null;
  correctAnswer: string;
  explanation: string;
}

async function main() {
  const jsonPath = path.join(__dirname, "sat_questions.json");
  const raw = fs.readFileSync(jsonPath, "utf-8");
  const questions: ParsedQuestion[] = JSON.parse(raw);

  console.log(`Loaded ${questions.length} questions from JSON`);

  // Check existing count
  const existing = await prisma.sATQuestion.count();
  console.log(`Existing in DB: ${existing}`);

  if (existing > 0) {
    console.log("Clearing existing SAT questions…");
    await prisma.sATQuestion.deleteMany({});
  }

  // Batch insert in chunks of 200
  const BATCH = 200;
  let inserted = 0;

  for (let i = 0; i < questions.length; i += BATCH) {
    const batch = questions.slice(i, i + BATCH);
    await prisma.sATQuestion.createMany({
      data: batch.map((q) => ({
        subject: q.subject,
        topicId: q.topicId,
        difficulty: q.difficulty,
        sourceFile: q.sourceFile,
        questionNum: q.questionNum,
        hasImage: q.hasImage,
        passage: q.passage ?? null,
        question: q.question,
        choiceA: q.choiceA,
        choiceB: q.choiceB,
        choiceC: q.choiceC,
        choiceD: q.choiceD ?? null,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
      })),
      skipDuplicates: true,
    });
    inserted += batch.length;
    process.stdout.write(`\r  Inserted ${inserted}/${questions.length}…`);
  }

  console.log("\nDone.");

  // Summary
  const counts = await prisma.sATQuestion.groupBy({
    by: ["subject", "topicId", "difficulty"],
    _count: { id: true },
    orderBy: [{ subject: "asc" }, { topicId: "asc" }],
  });

  console.log("\n── Summary ────────────────────────────────");
  const total = await prisma.sATQuestion.count();
  console.log(`Total: ${total}`);
  for (const row of counts) {
    console.log(`  ${row.subject} / ${row.topicId} / ${row.difficulty}: ${row._count.id}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
