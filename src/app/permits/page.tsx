import { redirect } from 'next/navigation';

// Phase 9 Chunk 4 route cleanup: this top-level page predates the current
// Permit Records page (/dashboard/permits) and hit an old ad-hoc per-city
// endpoint with a shape unrelated to the current permit schema. Nothing in
// the app links to it and it isn't in the sidebar -- redirecting rather
// than deleting, so an old bookmark still lands somewhere useful instead
// of a broken/stale page.
export default function LegacyPermitsRedirect() {
    redirect('/dashboard/permits');
}
