# Measured Screens showcase

Deterministic, synthetic inputs for the real web/native `ScreensTab` and
`ComparisonOverlay`. No app backend, credentials, personal data, timers or
simulated classifications. Both peers use `screenPairs(groupEvidence(tiles))`.
Existing sign-off chip states are unchanged.

## Addresses

- Web: `/?scene=measured-screen-pairs&state=strip`
- Web fixed overlays: same scene with `state=account-open` or `state=checkout-open`
- Native browser harness: `/?view=measured-screen-pairs&state=strip`
- Native fixed overlays: same view with `state=account-open` or `state=checkout-open`

Web uses the declared playground serve recipe. Native uses
`playground:native:build` + `playground:native:serve`.
At 1100px web / 800px native all four tiles fit; also check a phone width and
scroll the strip. Use After mode (the default) to see the stacked base backing.

## Settled inputs and expected observations

Chronological capture order is Account, Checkout, Gallery, Legacy. Every pair
has loaded, fixed 240×400 synthetic SVGs. Account's before/after bytes match;
Checkout changes the blue panel to amber; Gallery carries an unavailable filed
comparison; Legacy has no comparison. SVGs are visual fixtures, not a claim to
have run the backend PNG comparator. Filed results are fixed sample metadata.

On the feature base, the strip reads 01 Account, 02 Checkout, 03 Gallery,
04 Legacy, all `before / after`. On the repaired head it reads 02 Checkout
(changed), 01 Account (unchanged), 03 Gallery (comparison unavailable), 04 Legacy
(before / after). Walkthrough numbers must not renumber. Two-sided tiles retain
the base backing in After mode, including the measured classes.

Click **Compare Account** after reordering: the real overlay must open
**01 · Account**, pixel-identical fact, second of four on head (first on base).
Close, then click **Compare Checkout**: **02 · Checkout**, changed fact, first
of four on head (second on base). Mirror shows both images; Slide is the default.
Check Gallery and Legacy too. Overlay navigation follows displayed order.
The fixed overlay URLs provide repeatable captures, but do not replace this
click-through check. Diff image computation is outside this showcase's purpose;
its request is refused in-page, never sent to a real backend.

## Same inputs on the feature base

Build base `d08c69c230420cac0dac080b27183631dd1810cc` with the repaired head's
following `sceneOverlay.paths` (all are within the declared playground folder):

- `playground/scenes/signoffChips.tsx`
- `playground/scenes/screenPairsFixtures.ts`
- `playground/native/signoffChipsViews.tsx`

Use `sceneOverlay.from` naming the repaired head commit. No registry changes
are needed: both existing registries already include the signoffChips exports.
Do not overlay product source, derived results, or the head-only fixture tests.
Serve the repaired head normally. Verify owns the filed before/after captures.

## Build-bearing overlay regression

Web `/?scene=measured-screen-pairs&state=builds`: open Account, switch Mirror,
close, expand Earlier attempts, then open the older Account. The overlay must
show base-commit / head-current and then base-commit / head-earlier. The scene
now supplies the router required by the real CommitChip. Without it, opening
any build-bearing pair throws `useNavigate() ... context of a <Router>`; this
was a showcase integration failure, not a product overlay regression.

For before/after proof of this repair use dcf7603 as before and the repaired
head as after **without overlaying signoffChips.tsx**: that file contains the
router-context fix, not just input data. Both builds already have this state.
Capture the actual blank/error result on before rather than hiding it.

## Native recording save retry

Native browser route `/?view=before-after-video&state=save-retry` uses the real
recording component and byte-fetch hook. First Save deliberately rejects the
fixture byte request: after shows an error and re-enabled Save. Second Save
loads the bundled recording and reports the filename handed to the fixture
host. The host does **not** write a file, so this is not proof of a disk save.
Reload the route to reset the first-failure sequence. Playback still uses URLs.

For before proof at dcf7603, overlay only `playground/native/views.tsx` from the
repair head. This adds identical inputs and a receipt callback, not the save
implementation. Before remains disabled after the first failure with no error;
after offers retry and reaches the fixture-host receipt. Film both interactions
and capture the failed state on each. RN Web is component logic/layout proof,
not a real native device or OS save proof.

## Limits

React Native Web establishes shared native component layout/logic only, not
real-device gestures, codecs or consuming-app wiring. The consuming app has no
declared fake-data surface for this condition; its wiring remains **unproven**.
This scene is not a new app fake-data subsystem and needs no real services.
