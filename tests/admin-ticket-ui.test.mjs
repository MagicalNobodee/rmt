import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

function readProjectFile(path) {
  return readFileSync(join(repoRoot, path), "utf8");
}

test("admin ticket list exposes delete action and no longer renders latest user reply callouts", () => {
  const source = readProjectFile("app/admin/(protected)/tickets/page.tsx");

  assert.match(source, /adminDeleteTicket/, "ticket list should wire up adminDeleteTicket");
  assert.match(source, /ConfirmDeleteButton/, "ticket list should render a confirmation delete control");
  assert.match(source, /Delete/, "ticket list should label the delete control");
  assert.doesNotMatch(source, /Latest user reply/, "ticket list should not render the extra latest reply box");
});

test("admin ticket detail shows conversation only without a separate latest reply callout", () => {
  const source = readProjectFile("app/admin/(protected)/tickets/[id]/page.tsx");

  assert.match(source, /Conversation/, "detail page should still show the conversation timeline");
  assert.doesNotMatch(source, /Latest user reply/, "detail page should not render the extra latest reply callout");
});
