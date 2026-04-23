import test from "node:test";
import assert from "node:assert/strict";

import {
  cleanTicketMessage,
  getLatestTicketMessageByTicketId,
  getLatestUserTicketMessageByTicketId,
  isClosedTicketStatus,
  normalizeTicketStatus,
  ticketStatusLabel,
} from "../lib/ticketWorkflow.mjs";

test("normalizes ticket status to the three supported workflow states", () => {
  assert.equal(normalizeTicketStatus("open"), "open");
  assert.equal(normalizeTicketStatus("inprogress"), "in_progress");
  assert.equal(normalizeTicketStatus("in_progress"), "in_progress");
  assert.equal(normalizeTicketStatus("closed"), "closed");
  assert.equal(normalizeTicketStatus("resolved"), null);
  assert.equal(normalizeTicketStatus("waiting"), null);
});

test("labels only supported ticket status choices for display", () => {
  assert.equal(ticketStatusLabel("open"), "Open");
  assert.equal(ticketStatusLabel("inprogress"), "In Progress");
  assert.equal(ticketStatusLabel("in_progress"), "In Progress");
  assert.equal(ticketStatusLabel("closed"), "Closed");
  assert.equal(ticketStatusLabel("resolved"), "resolved");
});

test("treats only closed tickets as closed for reply permissions", () => {
  assert.equal(isClosedTicketStatus("closed"), true);
  assert.equal(isClosedTicketStatus("open"), false);
  assert.equal(isClosedTicketStatus("in_progress"), false);
  assert.equal(isClosedTicketStatus("resolved"), false);
});

test("cleans ticket message text without accepting empty messages", () => {
  assert.equal(cleanTicketMessage("  Please check again.  "), "Please check again.");
  assert.equal(cleanTicketMessage("   "), "");
  assert.equal(cleanTicketMessage("a".repeat(12), 5), "aaaaa");
});

test("finds the latest message for each ticket id", () => {
  const latest = getLatestTicketMessageByTicketId([
    { ticket_id: "t1", sender: "user", created_at: "2026-04-24T01:00:00Z" },
    { ticket_id: "t1", sender: "admin", created_at: "2026-04-24T02:00:00Z" },
    { ticket_id: "t2", sender: "user", created_at: "2026-04-24T00:30:00Z" },
    { ticket_id: "t2", sender: "admin", created_at: "2026-04-23T23:30:00Z" },
  ]);

  assert.equal(latest.get("t1")?.sender, "admin");
  assert.equal(latest.get("t2")?.sender, "user");
});

test("finds the latest user message for each ticket id", () => {
  const latest = getLatestUserTicketMessageByTicketId([
    { ticket_id: "t1", sender: "user", body: "Older user reply", created_at: "2026-04-24T01:00:00Z" },
    { ticket_id: "t1", sender: "admin", body: "Latest admin reply", created_at: "2026-04-24T03:00:00Z" },
    { ticket_id: "t1", sender: "user", body: "Latest user reply", created_at: "2026-04-24T02:00:00Z" },
    { ticket_id: "t2", sender: "admin", body: "Only admin reply", created_at: "2026-04-24T04:00:00Z" },
  ]);

  assert.equal(latest.get("t1")?.body, "Latest user reply");
  assert.equal(latest.has("t2"), false);
});
