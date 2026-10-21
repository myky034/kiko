#!/usr/bin/env node
// Creates the zh/ja/en sample lessons for one named Learner (DEC-025).
//
//   npm run kiko:seed-samples -- --email <learner email> --yes
//
// Explicit only: never runs at sign-in. Idempotent: each sample has a fixed
// client_request_id, so re-running skips lessons that already exist. Uses the
// operator identity (DIRECT_URL) over verified TLS; prints no secrets.
import { parseArgs } from "node:util";
import pg from "pg";
import { describeTarget, operatorConnectionConfig } from "./lib/db.mjs";
import { SAMPLE_LESSONS } from "./lib/sample-lessons.mjs";
import { SEGMENTATION_RULE, segmentSource } from "../modules/content/segmentation.ts";

function fail(message) {
  console.error(`seed-sample-lessons: ${message}`);
  process.exit(1);
}

try {
  process.loadEnvFile(".env.local");
} catch {
  // Use the process environment.
}

const { values } = parseArgs({
  options: { email: { type: "string" }, yes: { type: "boolean", default: false } },
});
const email = (values.email ?? "").trim().toLowerCase();
if (!/^[^\s@]+@[^\s@]+$/.test(email)) fail("a valid --email of an admitted Learner is required");

let config;
try {
  config = operatorConnectionConfig(process.env.DIRECT_URL);
} catch (error) {
  fail(error.message);
}
console.log(`Target: ${describeTarget(process.env.DIRECT_URL)}`);
console.log(`Action: create up to ${SAMPLE_LESSONS.length} sample lessons (zh, ja, en) for this Learner; existing samples are skipped.`);
if (!values.yes) fail("this writes lessons. Re-run with --yes after checking the target above.");

// Validate samples with the same rule the app uses before touching the database.
const prepared = SAMPLE_LESSONS.map((sample) => {
  const result = segmentSource(sample.sourceText);
  if (result.issues.length > 0 || result.segments.length === 0) fail(`invalid sample ${sample.clientRequestId}`);
  return { ...sample, segments: result.segments };
});

const client = new pg.Client(config);
try {
  await client.connect();
  await client.query("BEGIN");
  const owner = await client.query(
    `SELECT p.id
     FROM kiko.allowed_account a
     JOIN kiko.user_profile p ON p.id = a.bound_user_id
     JOIN kiko.user_role r ON r.user_id = p.id AND r.role_code = 'LEARNER'
     WHERE a.auth_provider = 'supabase' AND a.email = $1 AND a.status = 'active' AND p.state = 'active'`,
    [email],
  );
  if (owner.rowCount !== 1) fail("no active, signed-in Learner with this email (admit it and sign in first)");
  const ownerId = owner.rows[0].id;

  let created = 0;
  let skipped = 0;
  for (const sample of prepared) {
    const exists = await client.query(
      "SELECT 1 FROM kiko.lesson WHERE owner_id = $1 AND client_request_id = $2",
      [ownerId, sample.clientRequestId],
    );
    if (exists.rowCount > 0) {
      skipped += 1;
      continue;
    }
    const lesson = await client.query(
      `INSERT INTO kiko.lesson (owner_id, language_code, title, tags, level_label, source_note, client_request_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [ownerId, sample.languageCode, sample.title, sample.tags, sample.levelLabel, sample.sourceNote, sample.clientRequestId],
    );
    const lessonId = lesson.rows[0].id;
    const version = await client.query(
      `INSERT INTO kiko.transcript_version (lesson_id, owner_id, language_code, version_no, source_text, segmentation_rule)
       VALUES ($1, $2, $3, 1, $4, $5) RETURNING id`,
      [lessonId, ownerId, sample.languageCode, sample.sourceText, SEGMENTATION_RULE],
    );
    const versionId = version.rows[0].id;
    for (const segment of sample.segments) {
      await client.query(
        "INSERT INTO kiko.segment (transcript_version_id, owner_id, language_code, position, text) VALUES ($1, $2, $3, $4, $5)",
        [versionId, ownerId, sample.languageCode, segment.position, segment.text],
      );
    }
    await client.query("UPDATE kiko.transcript_version SET state = 'published', published_at = now() WHERE id = $1", [versionId]);
    await client.query(
      "UPDATE kiko.lesson SET status = 'ready', active_transcript_id = $2, version = version + 1, updated_at = now() WHERE id = $1",
      [lessonId, versionId],
    );
    created += 1;
  }

  await client.query(
    "INSERT INTO kiko.audit_event (actor_user_id, action, target_type, target_id, result) VALUES (NULL, 'operator.sample_lessons.seed', 'user_profile', $1, 'success')",
    [ownerId],
  );
  await client.query("COMMIT");
  console.log(`Done: created ${created}, skipped ${skipped} existing sample lesson(s).`);
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  fail(`failed (${error?.code ?? "error"}): ${error?.message ?? error}`);
} finally {
  await client.end().catch(() => {});
}
