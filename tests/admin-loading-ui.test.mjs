import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

function readProjectFile(path) {
  return readFileSync(join(repoRoot, path), "utf8");
}

test("admin routes expose loading skeletons for route transitions", () => {
  for (const path of ["app/admin/loading.tsx", "app/admin/(protected)/loading.tsx"]) {
    assert.equal(existsSync(join(repoRoot, path)), true, `${path} should exist`);
    const source = readProjectFile(path);

    assert.match(source, /animate-spin/, `${path} should show active loading motion`);
    assert.match(source, /animate-pulse/, `${path} should include skeleton placeholders`);
  }
});

test("admin layout mounts a visible transition indicator for navigation and submits", () => {
  assert.equal(
    existsSync(join(repoRoot, "components/AdminRouteTransition.tsx")),
    true,
    "admin route transition component should exist"
  );
  assert.equal(existsSync(join(repoRoot, "app/admin/layout.tsx")), true, "admin root layout should exist");

  const layoutSource = readProjectFile("app/admin/layout.tsx");
  const componentSource = readProjectFile("components/AdminRouteTransition.tsx");

  assert.match(layoutSource, /AdminRouteTransition/);
  assert.match(componentSource, /"use client"/);
  assert.match(componentSource, /usePathname/);
  assert.match(componentSource, /useSearchParams/);
  assert.match(componentSource, /addEventListener\("click"/);
  assert.match(componentSource, /addEventListener\("submit"/);
  assert.match(componentSource, /role="status"/);
  assert.match(componentSource, /animate-spin/);
});

test("shared submit button shows an accessible pending spinner", () => {
  const source = readProjectFile("components/SubmitButton.tsx");

  assert.match(source, /aria-busy=\{pending\}/);
  assert.match(source, /disabled=\{pending\}/);
  assert.match(source, /animate-spin/);
});

test("admin pages use the pending-aware submit button instead of raw submit buttons", () => {
  const adminPages = [
    "app/admin/login/page.tsx",
    "app/admin/(protected)/layout.tsx",
    "app/admin/(protected)/accounts/page.tsx",
    "app/admin/(protected)/reviews/page.tsx",
    "app/admin/(protected)/reviews/[id]/edit/page.tsx",
    "app/admin/(protected)/teachers/page.tsx",
    "app/admin/(protected)/teachers/[id]/edit/page.tsx",
    "app/admin/(protected)/tickets/page.tsx",
    "app/admin/(protected)/tickets/[id]/page.tsx",
  ];

  for (const path of adminPages) {
    const source = readProjectFile(path);

    assert.match(source, /SubmitButton/, `${path} should use SubmitButton`);
    assert.doesNotMatch(source, /<button\b/, `${path} should not use raw button elements`);
  }
});
