"use client";

import { readsNewBackend } from "../adminApiRouting";
import { LegacyIngestionsView } from "./LegacyIngestionsView";
import { SourceIngestionsView } from "./SourceIngestionsView";

/**
 * Which Ingestions screen to show.
 *
 * The only admin screen whose two backends do not serve the same shape: the
 * MVP lists rows of its `partner_ingestions` table, and the new backend lists
 * the chapter sources it really ingests. So the `ingestions` group switches the
 * view, not just the host — and turning the group off is still the whole
 * rollback, because it puts the old view and the MVP back together.
 *
 * Read at render, not at module load, so a test can change the environment and
 * re-import without this decision being frozen into the bundle twice.
 */
export function IngestionsView() {
  return readsNewBackend("ingestions") ? <SourceIngestionsView /> : <LegacyIngestionsView />;
}
