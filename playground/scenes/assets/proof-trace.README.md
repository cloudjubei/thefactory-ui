# Synthetic evidence media fixtures

`proof-trace.zip` is a 1660-byte stored ZIP containing `trace.trace` (Playwright trace format v7) and empty `trace.network`. It contains one synthetic `page.goto` action and before/after HTML snapshots ("Before navigation" / "Navigation complete — synthetic fixture"). All times, identifiers and content are synthetic; no account or service data. It is intentionally small, not an empty archive. The fixture URL uses Vite `?no-inline` so it remains a downloadable file rather than a data URI with download query appended.

## Renewal exercise

Web playground: `?scene=before-after-video&state=renewal`.

1. Press **Start renewal exercise**; wait for media metadata (the mode buttons enable).
2. Press **Playing at 35%**. Observe the native browser player and `Grant N · Playing at …` readout. Wait for the next grant (every 8 seconds), verify the playhead remains nonzero and advancing.
3. Press **Paused at 35%**. Observe approximately 1.05s; wait for at least one increment of the grant counter. Position must remain approximately 1.05s and paused.
4. Repeat or reload to reset the exercise. The three-second bundled navigation clip runs at 1/16 speed (including after source reload via defaultPlaybackRate); it is NOT looped. Complete the playing observation within its remaining 31 seconds or press Playing again.

The real useReviewEvidenceMediaUrl hook mints a grant with 38s TTL, refreshes at its normal 30s margin, and receives a distinct `?fixture-grant=N` URL of identical bundled playable bytes. No monkeypatching of media events or hook mocking. Output is derived from real timeupdate events.

**Download Playwright trace** exercises the real download component. **Inspect bundled synthetic trace in Playwright** reads that same bundled ZIP and opens the public Playwright viewer with a data URL, avoiding Chromium's external-site-to-loopback network restriction. The viewer parses locally; the synthetic fixture contains no private data. Expected action: page.goto, 100ms. Choose Before / After for the synthetic snapshots. This inspection convenience does not replace observing the download link.

Native component playground: serve scripts playground:native:build + playground:native:serve, then `?view=before-after-video&state=counted`. Includes the same trace tile and real native TraceDownload (Linking). This react-native-web harness does not prove consuming native host-player continuity.

The existing web counted scene and already-filed trace-routing comparison remain valid. This repair does not change product code. App wiring, real signed-token authorization/backend Range behavior and consuming-host continuity remain UNPROVEN here: no declared fake-data app/host proof surface is added. Vite static-media 206 responses are not backend proof.
