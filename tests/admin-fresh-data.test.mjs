import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

function readProjectFile(path) {
  return readFileSync(join(repoRoot, path), "utf8");
}

test("admin internal links disable prefetch so navigation does not reuse stale prefetched data", () => {
  assert.equal(existsSync(join(repoRoot, "components/AdminLink.tsx")), true, "AdminLink should exist");

  const source = readProjectFile("components/AdminLink.tsx");

  assert.match(source, /from "next\/link"/);
  assert.match(source, /prefetch=\{false\}/, "AdminLink should always disable prefetch");
});

test("admin route transition refreshes server data after client-side navigation", () => {
  const source = readProjectFile("components/AdminRouteTransition.tsx");

  assert.match(source, /useRouter/, "transition component should access the Next router");
  assert.match(source, /router\.refresh\(\)/, "transition component should force a fresh server payload");
});

test("admin pages use AdminLink for internal admin navigation", () => {
  const adminPages = [
    "app/admin/(protected)/layout.tsx",
    "app/admin/(protected)/accounts/page.tsx",
    "app/admin/(protected)/accounts/[id]/page.tsx",
    "app/admin/(protected)/reviews/page.tsx",
    "app/admin/(protected)/reviews/[id]/edit/page.tsx",
    "app/admin/(protected)/teachers/page.tsx",
    "app/admin/(protected)/teachers/[id]/edit/page.tsx",
    "app/admin/(protected)/tickets/page.tsx",
    "app/admin/(protected)/tickets/[id]/page.tsx",
  ];

  for (const path of adminPages) {
    const source = readProjectFile(path);

    assert.match(source, /AdminLink/, `${path} should use AdminLink for internal admin navigation`);
  }
});
