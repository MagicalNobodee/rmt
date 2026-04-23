import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

function readProjectFile(path) {
  return readFileSync(join(repoRoot, path), "utf8");
}

test("my tickets page delegates deletion UI to a client component", () => {
  assert.equal(existsSync(join(repoRoot, "components/MyTicketsList.tsx")), true, "MyTicketsList should exist");

  const pageSource = readProjectFile("app/me/tickets/page.tsx");
  const componentSource = readProjectFile("components/MyTicketsList.tsx");

  assert.match(pageSource, /MyTicketsList/, "page should render the client tickets list");
  assert.match(componentSource, /"use client"/, "list should run on the client");
  assert.match(componentSource, /useRouter/, "list should refresh server data after delete");
  assert.match(componentSource, /useState/, "list should update local state immediately");
  assert.match(componentSource, /deleteMyTicket/, "list should call the delete server action");
});

test("ticket deletion action returns a serializable result instead of redirecting back to the list", () => {
  const source = readProjectFile("lib/actions.ts");

  assert.match(source, /export async function deleteMyTicket\(ticketId: string\)/);
  assert.match(source, /return \{ ok: true, message: "Ticket deleted\."\ }/);
  assert.doesNotMatch(source, /redirect\(`\/me\/tickets\?message=/);
});
