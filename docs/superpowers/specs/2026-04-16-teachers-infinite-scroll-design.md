# Teachers Long List Load More Design

Date: 2026-04-16

## Goal
Replace the `/teachers` previous/next pagination UI with a long-list experience. The first page remains server-rendered. A `Load more` button at the bottom fetches the next page and appends it to the current list. Changing search or subject resets the list back to page 1 behavior.

## Design
- Keep `app/teachers/page.tsx` as the server entry for auth greeting, subject options, and the first page query.
- Add a small route handler that returns paginated teacher list JSON for a given `q`, `subject`, and `page`.
- Add a client component to render the list, fetch additional pages on button click, append results, and show loading/end states.
- Remove the `Previous` / `Next` navigation block from the teachers page.

## State and Behavior
- Initial render uses server-fetched page 1 data.
- The bottom `Load more` button fetches page 2+ only when more results exist and no request is in flight.
- Search or subject changes navigate normally and produce a fresh server render with page 1 data.
- Errors during incremental fetch show an inline error with a retry button.

## Verification
- `pnpm build`
- Browser verification on `/teachers` that the `Load more` button appends records, and filtering resets the list.
- Deploy to Vercel production only after verification passes.
