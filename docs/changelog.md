# Changelog

Architectural and product decisions are recorded here as they are made, per the
documentation rule in PRODUCT.md. This is a decision log, not a release changelog —
entries exist even before any code ships.

---

## 1.5.18 — advisers join an office in the app; «پر/آزاد کردن ظرفیت» in the token sheet (Amin #6330, #6497)

- «اتصال به دفتر املاک» (#6330), Settings → «اتصال‌ها و API‌ها». Until now the dashboard told advisers to type its code in the app, but the app had no such screen.
  - Not in an office: «اسکن بارکد کد اتصال» (the dashboard's code modal now draws a QR `eyvan://office-join?c=<8 digits>&w=<word>`, read by `joinEntryOf`), or type «کد اتصال» + «کلمه» → `POST /office/adviser/join`. The server's own sentence shows when the code is wrong, used or expired.
  - In an office: its name, «فایل‌های دفتر» (`/office/adviser/files`: only the fields the office allowed; the owner's number can be called), «تازه کردن», and «جدا شدن از دفتر» (confirm → `/office/adviser/leave`, which now answers `{ok:true}` instead of 204). One office at a time, as the server already ruled.
- Token sheet (#6400/#6497): «افزودن ظرفیت توسط پشتیبانی» stays with what was added. Support's «پر کردن ظرفیت» (+) and «آزاد کردن ظرفیت» (−) show as one used line «پر یا آزاد کردن ظرفیت توسط پشتیبانی» (`spentBy.adjusted`), so the used lines add up again.
- Everything in 1.5.17 is included.

## 1.5.17 — office: «ورود با ایوان» by number, take the request back, dated shares, demo office (Amin #6343–#6346, #6349)

- «ورود با ایوان» (#6346): the dashboard asks for the mobile number (no more QR or code). While the app is open and the account's office is on, it asks `POST /office/adviser/link/pending` every 3 s (`useOfficeSignIn`; no push service, so the dashboard's guide says «open the app first»). A waiting sign-in opens at once over whatever is on screen (`OfficeSignInPrompt`, mounted in `RootNavigator`): hold «نگه دارید تا وارد شوید» for 3 s (letting go starts over) → `link/confirm`; «این ورود من نیست» → `link/deny` and the dashboard says it was refused. The page's answer is the same for any number (it never says who has an office); a newer request for a number replaces the older one; another account's app can never confirm it. Dashboard sign-ins last 3 hours and live in the browser tab only (closing it = sign in again).
- Taking the request back (#6343) from the dashboard's «تنظیمات دفتر», even after approval: every share ends, every adviser is unlinked, unused join codes die, every dashboard is signed out, the panel is off. The office's files go home: the ones it made (and any imported one no longer on the phone) are written into the manager's copy on the server (`syncRoutes.putRow`, key `office-<id>`, owner name/phone added to the description); the app reloads its files the moment the panel goes off (`reloadFiles`), so they show without a restart. The office's tokens stay with the office.
- Dated shares (#6344): a send runs with no end or for 7 / 30 / 90 days (`until`; an ended share disappears from the adviser's phone, and sending again counts as a new recipient); «فرستاده به» opens who has the file and until when, with «لغو» per adviser and «لغو همه» (`POST /office/share/cancel`). Tokens already spent stay spent.
- Demo office (#6345): `POST /admin/office-demo { phone }` (KSS demo numbers only, `AZAR_TEST_OTP_NUMBERS`) makes «دفتر املاک نمونه» with 5 sample files. On a demo number `request/status` says `demo: true`: the app keeps working beside the office (no panel screen) and still answers dashboard sign-ins.
- «خروج» (#6349) is always in the dashboard's top bar (it was only in the side menu, folded away on phones).
- The panel screen in the app now explains the number sign-in instead of scanning a code. Everything in 1.5.16 is included.

## 1.5.16 — announcements: the bell counts them, pictures and sounds, reach numbers (Amin #6214)

- Home's bell turns red with the number of KSS announcements this account has not seen yet (`useAnnouncements().unseen`, read again whenever Home or «اعلان‌ها» comes into view). Before, the bell only had a dot for overdue reminders and never noticed announcements. The dot still shows overdue reminders when there is no number.
- Opening «اعلان‌ها» marks the cards on screen as seen (`POST /announcements/seen`), so the number goes away.
- Announcement cards: the reminder cards' corners (left ones radius 2), a megaphone badge in the tone's colour, an inline picture (tap = full screen), or a «پخش صدا / پخش ویدیو» button that opens the sound or video in the phone's player. Tapping the card or opening its media is «opened» (`POST /announcements/:id/open`), once per account.
- Server (azar-auth `announcements.js`): `announcement_reads` (seen/opened per account), `announcement_media` (pictures ≤ 3 MB, sounds ≤ 8 MB, MP4 ≤ 10 MB, type taken from the bytes, kept under the database folder, served at `/announcements/media/:id` only while its announcement is live), `push` flag, `GET /announcements/push?since=` (public, a few hundred bytes: the push ones after `since`, plus `latest`), and per-announcement counts for sales management (seen / opened / closed out of the accounts that exist now; announcements from before the counting are «unknown», never 0).
- Phone notifications for announcements marked «روی گوشی هم» (brain: no outside push service, so no Google/FCM): Android's WorkManager runs `AzarAnnouncementWorker` about every 15 minutes while online. It asks `/announcements/push?since=…` and shows each new one in the shade (channel «اعلان‌های ایوان», megaphone icon; a tap opens the app). The app moves `since` forward whenever it lists announcements (`AzarPush.seenUpTo`), so nothing seen in the app pops up again, and a fresh install never shows old ones. Some phone brands delay or stop background work, so a notification can take ~15 minutes or longer.
- The notification permission (Android 13+) is asked once, the first time «اعلان‌ها» opens, not at launch. Declining changes nothing else: the bell still counts. The list is also read again whenever the app comes back to the front.
- Everything in 1.5.15 is included.

## 1.5.15 — fewer permissions at install (Amin #5551/#6132)

- The app no longer asks for the old shared-storage permissions (`READ_/WRITE_EXTERNAL_STORAGE`, added by react-native-camera-kit and react-native-fs). Photos already come through the system camera and photo picker and every file stays in the app's own folder, so nothing changes for the user; the install screen and Play Protect's scan see a shorter permission list. Everything in 1.5.14 is included.

## 1.5.14 — office panel by request, «ورود با ایوان», faster forms (Amin #5970/#6032/#6033/#6034, #5975/#5977/#5978)

- «تنظیمات ← اتصال‌ها و API‌ها ← پنل دفتر املاک» (`OfficePanelScreen`): office address (required), union licence, landline (optional, `0`+10 digits) and the panel's own username + password (#6034, the panel only — never kssx.ir). Amin's confirm text before sending; once sent, «لغو درخواست»; a rejected request can be sent again.
- When sales management approves, the app gives way to one full screen (`OfficePortalScreen`, gate in `RootNavigator` via `useOfficePortal`): «پرتال دفتر املاک برای شما فعال است» + «باز کردن پنل» (kssx.ir/app). The answer is kept on the phone (`office_portal_on`) so it also shows offline, and re-checked each time the app comes to the front. Nothing on the phone is wiped.
- «ورود با ایوان» (#6033) on that screen: scan the panel's sign-in QR (or type its 8-digit code, or open its `eyvan://office-link?c=…` link — new intent filter) and confirm; the server signs that browser in. Codes live 2 minutes, work once; confirming needs the app's session and is rate-limited.
- Server (`officeRoutes.js`): request carries `username` + `password_hash` (scrypt, salted; unique among pending/approved; 4–32 of a-z 0-9 . _; password ≥ 8); `POST /office/password` (5 wrong tries lock the name 15 min); `POST /office/link/start|poll` + `POST /office/adviser/link/confirm`; one shared `enter()` for every sign-in.
- Also in this release: «افزودن فایل/متقاضی» open at once (#5975), a new file opens its own page after saving (#5977), empty lists keep only the floating button (#5978).


## Office dashboard 0.1.0 (Amin #5659/#5664/#5909/#5913/#5934) — built locally, not deployed

- `office/`: the real-estate office manager's own web dashboard (its own address and login), made from the IRIS
  panel's components and tokens (copied from Agent-live/panel: ui/kit, icons, styles). Overview: 4 KPIs, each
  with its source and period (new files today, advisers linked, files sent, files expiring in 7 days); new files
  over 14 days; advisers' open deals by stage; advisers' work today; files about to expire (renew for 30 days);
  sharing rules; the office's files with search, kind filter and multi-select «ارسال به مشاوران».
- «فایل تازه» (#5934): at the top and above the files table; the full form; after saving, the send dialog opens
  with the office's sharing rules (exact address and owner's name/phone off by default).
- Server `/office` (azar-auth, `officeRoutes.js`): the dashboard's sign-in uses the phone code but its own
  session, so the manager's phone stays signed in (the app's /auth/login keeps one phone per account). Office
  files live only on the server, sealed with the sync key. Advisers join with a one-time 8-digit code plus a
  word (7 days) and read only the files sent to them, only the allowed fields (`/office/adviser/*`); one office
  per adviser; unlinking or archiving removes access at once. Advisers' activity is counted from the copy
  their phone already keeps on the server (counts only).
- Not yet: the adviser's screens in the app (join with code, office files online) — next app release.


## 1.5.13 — deleting a file/applicant: reminders go, contracts stay with the names (Amin #5864)

- Deleting a file or an applicant deletes its reminders; its contracts stay and keep its name as text (`contracts.property_label` / `applicant_label`, set on delete), shown in the contract list and detail («… (حذف شده)» there).
- Migration 0023 rebuilds `contracts` without the database link to properties/applicants (ids kept; the working DB is built fresh in memory each start, so the table is empty at that point) and restores its indexes and server-sync triggers. Older app versions load such rows fine (they load with foreign keys off and ignore unknown columns).
- Deals still hold a file back («این فایل به ۱ معامله وصل است…») until Amin answers whether they go with it.

## 1.5.12 — deleting a linked file or applicant says why (#5716 full check)

- A file or applicant that a contract, a deal or a reminder points at cannot be deleted (foreign keys are on, no cascade). Before: the detail page said only «حذف … با مشکل مواجه شد» every time; the list's long-press delete hid the row, showed «حذف شد», swallowed the error, and the row came back on the next visit. Now the list asks first (`blockedBy` in `useUndoableDelete`) and shows «این فایل به ۲ قرارداد و ۱ یادآوری وصل است؛ برای حذف، اول آن‌ها را حذف کنید.»; the repositories refuse with `LinkedRecordsError` carrying the same sentence, which the detail pages show; any other failed delete brings the row back with «… حذف نشد». Whether deleting should also remove/unlink those items is asked of Amin.

## 1.5.11 — no new file or applicant without tokens; sign-out keeps unsent changes; names side by side (Amin #5815, #5817)

- **#5815:** once 95% of the tokens are used (from the last kept token figures, so offline too), or the server has already refused a save for lack of tokens, «افزودن فایل» / «افزودن متقاضی» (every entry point, incl. a Divar share) leads to «تنظیمات» — where the buy button is — with a 4-second note «توکن کافی برای ثبت را ندارید». `withTokens` in `features/settings/services/tokenBlock.tsx`, wrapped inside `withLicence` in MainNavigator. Edits to existing files still save and stay queued.
- **#5817 sign-out:** the question opens at once (it used to wait for a whole sync round, photos included, and the button looked dead); the unsent count follows. Unsent changes are no longer wiped: sign-out `forget()`s the working copy and keeps the encrypted queue for the same number's next sign-in (as on «signed in elsewhere»).
- **#5817 names:** «نام» and «نام خانوادگی» are two fields on one row in the new-account step and in «ویرایش پروفایل» (still stored as one display name).

## 2026-08-08 — Phase 0 discovery

**Change**: Created `/docs/00-project-overview.md` documenting the current
repository state (bare Electron/React/TS scaffold, no product code).

**Reason**: PRODUCT.md requires repository inspection and documentation before any
implementation.

**Affected modules**: None (documentation only).

**Migration requirements**: None.

**Tests**: None yet.

---

## 2026-08-08 — Confirmed decision: target platform is a real mobile app

**Change**: Confirmed the application will be built as a genuine mobile app (React
Native or Capacitor, to be finalized in Phase 3), not the existing Electron desktop
scaffold.

**Reason**: PRODUCT.md's mobile-first, one-handed-use, OTP-by-mobile-number, and
offline-resilience requirements are incompatible with a desktop shell. Flagged as
an open question in Phase 0; resolved by the project owner.

**Affected modules**: Application shell/platform (all future UI, navigation, and
native-capability work). The current `src/main`, `src/preload`,
`src/renderer` Electron scaffold is not the foundation going forward.

**Migration requirements**: Full platform migration in a future implementation
phase; not started yet.

**Tests**: N/A (no code changed).

---

## 2026-08-08 — Confirmed decision: OTP/SMS provider to be proposed in Phase 3

**Change**: No SMS/OTP provider is mandated. Phase 3 architecture must propose a
concrete provider and backend approach for project-owner confirmation.

**Reason**: Avoids hard-coding a vendor decision before backend architecture is
designed; keeps referral/OTP server-side validation requirements (PRODUCT.md
Authentication section) intact regardless of provider.

**Affected modules**: Authentication/backend (future).

**Migration requirements**: None yet.

**Tests**: N/A.

---

## 2026-08-08 — Confirmed decision: matching engine must be deterministic and AI-independent

**Change**: The core matching engine MUST NOT depend on any external AI API or
paid AI service. The first production version must be a deterministic, rule-based,
configurable scoring engine operating on structured fields, supporting priority
levels (MUST_HAVE, IMPORTANT, PREFERRED, IGNORE), hard constraints, exclusions,
numeric ranges, exact/approximate values, locations, amenities, preferences, and
weighted scoring, with a fully explainable result (matched/mismatched/ignored
criteria, critical requirements). AI, if introduced later, is strictly an optional
enhancement layer (e.g. natural-language input → structured, user-confirmed
requirements → deterministic engine) and must never sit in the critical path of
producing a match score. The application must remain fully functional with zero AI
API configured, at every phase.

**Reason**: Explicit project-owner directive, given in advance of Phase 1, to
prevent this constraint from being violated by any future architecture or
implementation decision. Recorded before Phase 1 begins so it binds all subsequent
requirements, user stories, architecture, database schema, and matching-engine
design.

**Affected modules**: Matching engine (core), requirement/criterion data model
(database design, Phase 4), future `/docs/matching/*.md` docs, any future
natural-language-input feature (must be built as an optional pre-processing layer
only).

**Migration requirements**: None yet — no matching engine code exists. This
decision constrains its initial design; there is no migration away from an
AI-dependent version because one was never built.

**Tests**: To be defined in `/docs/testing/test-plan.md` and
`/docs/matching/*.md` — matching engine tests must validate deterministic behavior
without any AI dependency, including edge cases such as "pool is essential, ignore
price/area/bedrooms."

---

## 2026-08-08 — Final Phase 0 validation pass

**Change**: Reviewed `/docs/00-project-overview.md` against the three confirmed
decisions (§2a) for internal consistency. Added: a React Native vs. Capacitor
trade-off comparison (§Decision 1, still deferred to Phase 3 for the final call);
an explicit restatement of the mobile-number + OTP + mandatory-referral-code
registration requirements and server-side referral validation (§Decision 2); a new
§8a documenting that backup/encryption and security architecture are entirely
undesigned so far (a real gap, not a decision); an offline/performance
architecture-risk note on sync/conflict-resolution and list caching strategy
(§8); and a new §11a listing database entity/relationship risks to resolve
explicitly in Phase 4 (referral direction modeling, structured-vs-free-text
separation, match explainability storage, reminder idempotency keys,
notification source references, backup/audit metadata dependence on the
not-yet-designed encryption spec).

**Reason**: Explicit project-owner request for a final Phase 0 validation pass
before Phase 1 begins, to confirm decisions are correctly reflected throughout
the document and to surface any remaining gaps or risks.

**Affected modules**: Documentation only (`/docs/00-project-overview.md`). No
application code exists yet; no code changed.

**Migration requirements**: None.

**Tests**: N/A.

---

## 2026-08-08 — Phase 1 (Product Requirements) and Phase 2 (User Stories)

**Change**: Created `/docs/01-product-requirements.md` (comprehensive functional,
UX, performance, and security requirements covering authentication, profile,
owner files, applicant files, matching, search/filtering, contracts, reminders,
notifications, backup, and offline behavior) and `/docs/02-user-stories.md` (67
user stories across 18 workflow areas, each with ID/actor/goal/description/
preconditions/main flow/alternative flows/error cases/acceptance criteria/
priority). Both documents label every requirement/story as CONFIRMED, BUSINESS
RULE, OPEN-ARCH, or ASSUMPTION, and end with a Confirmed Decisions / Open Product
Decisions / Open Architectural Decisions / Assumptions / Risks / Questions
summary.

**Reason**: Explicit project-owner approval of Phase 0 and instruction to proceed
to Phase 1 and Phase 2, per PRODUCT.md's phased documentation-first process, with
explicit constraints not to finalize RN vs. Capacitor, an OTP provider, the
encryption design, the matching engine's internal implementation, or the final
database schema in this phase.

**Affected modules**: Documentation only. No application code was written. The
matching engine requirements (§9 of 01-product-requirements.md; MATCH/MEXP stories
in 02-user-stories.md) explicitly restate and preserve the AI-independence
constraint from Phase 0 Decision 3, including the required pool/MUST_HAVE worked
example (MATCH-03) and a dedicated "no AI dependency" regression scenario
(MATCH-05). Backup/security requirements (§14, §18; BKP/RST/IE/SEC stories) are
written as product-level requirements only — encryption algorithm and key
management remain explicitly deferred. Offline requirements (§15; OFF/SYNC
stories) establish behavior (view/edit offline, auto-sync, no silent data loss on
conflict) without committing to a sync/conflict-resolution architecture.

**Migration requirements**: None — documentation only.

**Tests**: None yet; MATCH-03, MATCH-05, and REM-03 are flagged in
02-user-stories.md as required regression-test scenarios for when the matching
engine and reminder scheduler are implemented in a later phase.

---

## 2026-08-08 — Confirmed decision: local-first / offline-first (Phase 1/2 amendment)

**Change**: Recorded a new confirmed product decision (Phase 0 Decision 4 in
`/docs/00-project-overview.md` §2a) and amended the already-approved Phase 1 and
Phase 2 documents in place — **not** a restart of either phase:

- The application is local-first/offline-first: normal daily business operation
  (owner/applicant file management, search, filtering, matching and match
  explanations, contract tracking and expiration calculations, reminder
  scheduling, local notifications, notes, settings, and encrypted backup
  creation/import/validation/restore) requires no internet access.
- Business data (owner/applicant/property information, requirements, notes,
  contracts, matches, match explanations, reminders, local business history) is
  not uploaded to a server during normal operation and remains local by
  default. No cloud database, cloud matching, cloud sync, or cloud backup is
  required.
- Network access for this version is limited to the account/referral surface:
  mobile number registration, OTP/SMS verification, referral code validation,
  and recording the registered number/referral relationship.
- Contract reminders use local device notifications, not push notifications —
  push delivery infrastructure is not required for v1.
- There is no requirement for multi-device cloud synchronization. Cross-device
  data movement is only the explicit, user-controlled manual backup
  export/transfer/import/restore flow. CRDTs, real-time sync, cloud
  replication, and automatic conflict-resolution infrastructure are explicitly
  out of scope unless a future product decision requires them.
- The encryption algorithm and key-management architecture remain
  **explicitly deferred** to the architecture/security phase — this decision
  clarifies what the backup/local-storage design must support (a fully
  offline, non-cloud-dependent store), not how it will be implemented.

**Reason**: Explicit project-owner clarification, provided after Phase 1/2 were
already documented and approved. The instruction was to amend the existing
documents in place, preserving all prior work, rather than recreate them.

**Affected modules**:
- `/docs/00-project-overview.md` — added Decision 4 in §2a; corrected the
  offline/performance architecture-risk note (§8) and the recommended
  architecture's local-storage description (§10), which had previously implied
  outward syncing, to reflect that local storage is the sole source of truth
  for business data with no required cloud counterpart.
- `/docs/01-product-requirements.md` — added §4a (Connectivity Classification:
  OFFLINE / ONLINE_REQUIRED / ONLINE_OPTIONAL, covering every workflow);
  rewrote §13 (Notifications) to specify local device notifications instead of
  push; rewrote §14 (Backup) to state no cloud backup is required; rewrote §15
  (Offline) to remove the sync/conflict-resolution framing that assumed a
  cloud business-data counterpart and replace it with the local-first model;
  updated §5 (Authentication) with explicit ONLINE_REQUIRED framing and
  graceful-failure requirements; updated §18 (Security) to scope network
  security to the account/referral surface only; updated §19 (Summary) to
  record the new confirmed decision and mark the previously open
  multi-device-sync question (§19.6, former question 4) as resolved. Also
  fixed several pre-existing cross-reference errors (stray "§16" references
  that should have pointed to §19's open-decisions/open-questions
  subsections) found during this pass.
- `/docs/02-user-stories.md` — added a connectivity tag
  (OFFLINE/ONLINE_REQUIRED/ONLINE_OPTIONAL) to every story; added AUTH-06
  (registration/login blocked offline with clear messaging), REF-06 (referral
  validation requires connectivity), and RST-05 (explicit user-controlled
  restore on another device); rewrote NOTIF-01 and NOTIF-03 for local
  notifications instead of push; rewrote the Offline Behavior section (OFF-01
  through OFF-03) to describe offline as the normal mode rather than a
  fallback; renamed and rewrote the Synchronization section to
  "Network-Dependent Operation Behavior," replacing SYNC-01's business-data
  auto-sync premise and SYNC-02's conflict-resolution premise (both no longer
  applicable) with SYNC-01 (retrying the account/referral surface),
  SYNC-02 (multi-device sync is now a confirmed **non-goal**, tested as a
  regression), and SYNC-03 (no false-success state for network-dependent
  operations); updated the Summary section accordingly. Story count: 70 (up
  from 67).

**Migration requirements**: None — documentation only; no application code
exists yet.

**Tests**: None yet. SYNC-02 is newly flagged as a required regression test
once implementation begins: no future change may introduce implicit
multi-device sync behavior. AUTH-06 and REF-06 are flagged as required
graceful-degradation tests for the account/referral online surface.

---

## 2026-08-08 — Phase 3: Architecture documentation and analysis

**Change**: Created a full Phase 3 documentation set — architectural analysis
only, no application code, no dependencies installed, no implementation
started:

- `/docs/architecture/00-architecture-overview.md` — system shape, component
  responsibilities, background jobs, error-handling posture, document map.
- `/docs/architecture/decisions/ADR-001-mobile-platform.md` — React Native vs.
  Capacitor analyzed against all 16 requested criteria; **[PROPOSED]** React
  Native, explicitly not finalized, with team-composition/code-reuse caveats.
- `/docs/architecture/decisions/ADR-002-local-database-source-of-truth.md` —
  **[PROPOSED]** SQLite as the local database technology (source of truth,
  not a cache), analyzed against document/NoSQL and sync-oriented-framework
  alternatives.
- `/docs/architecture/decisions/ADR-003-otp-provider-deferred.md` — records
  the OTP/SMS provider decision as explicitly deferred, with selection
  criteria for later.
- `/docs/local-data/local-data-architecture.md` — indexing, migrations,
  transactions, large-dataset performance, search, matching queries,
  integrity, backup extraction, restore, schema versioning.
- `/docs/backup/backup-architecture-analysis.md` — backup format, encryption
  requirements and key-management options analyzed (hybrid approach
  **[PROPOSED]**, not finalized), integrity/authentication, versioning,
  corruption detection, wrong-password behavior, restore validation,
  restore-onto-existing-data, safe rollback on failed restore. No algorithm
  or key-management implementation selected.
- `/docs/security/authentication-otp-architecture.md` — registration/OTP/
  session/referral flow analysis, rate limiting, retry limits, duplicate-
  phone prevention, abuse prevention, offline-after-authentication behavior.
  Session-lifecycle Option A vs. B flagged as an open trade-off. No OTP
  provider selected.
- `/docs/security/threat-model.md` — assets, threats, and mitigation status
  across local data, secure key storage, authentication/session, backup,
  sensitive-data exposure, logs, app-switcher/screenshot privacy, clipboard
  risk, and export/import risk, plus explicit non-goals consistent with the
  local-first/no-AI/no-multi-device-sync decisions.
- `/docs/matching/matching-architecture.md` — four-stage conceptual pipeline
  (hard-constraint filter → per-criterion evaluation → weighted score
  aggregation → explanation assembly) satisfying MUST_HAVE/IMPORTANT/
  PREFERRED/IGNORE, hard constraints/exclusions/ranges/exact/approximate/
  location/amenities, two-way matching, and mandatory explainability, with
  zero AI dependency. Scoring formula explicitly deferred to Phase 4.
- `/docs/notifications/notification-architecture.md` — expiration
  calculation, reminder scheduling with idempotency enforced via a unique
  `(contract_id, offset)` constraint, local (not push) notification delivery,
  device-restart self-healing via re-deriving from the `Reminder` source of
  truth, timezone/date-handling requirement, restore behavior, notification-
  permission-denial fallback, and OS-imposed scheduling-limit risk.
- `/docs/database/conceptual-data-model.md` — conceptual entities and
  relationships (User, ReferralRelationship, Session, OwnerFile,
  ApplicantFile, RequirementCriterion, Restriction, Amenity, Location, Match,
  MatchExplanation, Contract, ContractHistoryEntry, Reminder, Notification,
  BackupMetadata, AuditLogEntry) with important constraints and indexing
  considerations. Explicitly not the final production schema — that remains
  Phase 4.
- `/docs/architecture/ux-dependencies.md` — consolidates every
  UX-dependent decision flagged across the other Phase 3 documents,
  confirming no screens/navigation were invented ahead of the forthcoming
  Stitch designs.
- `/docs/architecture/unresolved-decisions.md` — consolidated tracker of
  every open item across the full Phase 3 document set plus carried-over
  Phase 1/2 open product questions.

**Reason**: Explicit project-owner authorization to proceed to Phase 3,
documentation/architectural-analysis only, with an explicit list of binding
local-first/offline-first constraints and a list of decisions that must be
analyzed but not finalized (mobile platform, encryption/key management, OTP
provider, matching scoring formula, final database schema).

**Affected modules**: Documentation only. No application code was written, no
dependencies were installed, and no existing implementation was modified. The
Electron scaffold in `src/` is untouched.

**Migration requirements**: None — documentation only.

**Tests**: None yet. This phase does not implement the matching engine,
reminder scheduler, backup system, or auth flow — it establishes the
conceptual architecture and constraints those future implementations, and
their tests, must satisfy.

---

## 2026-08-08 — Phase 3 corrections: encryption requirement, session lifecycle rule, UX dependency expansion, implementation order

**Change**: Conditionally-approved Phase 3 review produced four required
corrections, applied across the existing Phase 3 documents (not a restart):

1. **Local database encryption** — `/docs/security/threat-model.md`'s "Local
   data protection" section previously framed at-rest encryption as an open
   yes/no question. Corrected: encryption of sensitive local business data at
   rest is now a **[CONFIRMED REQUIRED]** security requirement, explicitly
   separated from the still-**[DEFERRED]** algorithm and key-management
   implementation choices. `/docs/architecture/decisions/ADR-002-local-database-source-of-truth.md`
   updated to reflect the same distinction. Local device compromise and
   stolen/lost device (including forensic extraction) are now named
   explicitly as the threats this requirement addresses.
2. **Session lifecycle — critical offline-first rule** —
   `/docs/security/authentication-otp-architecture.md`'s session lifecycle
   section rewritten. The prior "Option A vs. Option B" framing incorrectly
   treated offline-first purity and session security as competing
   alternatives. Corrected: background re-validation may run when online, but
   a strict distinction is now confirmed policy — **NETWORK FAILURE** (no
   connectivity, timeout, temporary server unavailability) never logs the
   user out or blocks core functionality; only an explicit
   **AUTHENTICATION FAILURE** response from a reachable server triggers the
   defined security response. The remaining trade-off (a stolen, kept-offline
   device retains local session access until it reconnects) is named
   explicitly rather than resolved. `/docs/security/threat-model.md` updated
   to reference this distinction under Authentication/session protection.
3. **UX dependencies expanded** — `/docs/architecture/ux-dependencies.md`
   rewritten with a three-way classification (FINALIZE NOW / WAIT FOR STITCH
   / INDEPENDENT OF UI) applied to all 16 requested areas (navigation,
   one-handed interaction, form architecture, shared owner/applicant fields,
   search/filtering, matching workflow, match explanation presentation,
   contract workflow, reminder management, backup/export/import UX, restore
   workflow, offline/loading/empty/error states, destructive-action
   confirmation, notification permission UX), separating what's
   architecturally settled now from what genuinely waits for Stitch.
4. **Implementation order corrected** — `/docs/architecture/00-architecture-overview.md`
   gained a "Revised implementation order" section placing Stitch UI/UX
   design and review immediately after Phase 3 architecture analysis and
   before final data/security/auth/matching design work and production
   implementation, per the project owner's specified product workflow.

Additionally, `/docs/security/threat-model.md` was expanded with explicit
threat entries for brute-force backup password attempts (offline,
un-rate-limitable — establishing a slow/memory-hard KDF as a confirmed
constraint on the still-deferred KDF choice) and OTP abuse, and
`/docs/architecture/unresolved-decisions.md` was updated to move the local-DB-
encryption and session-lifecycle-policy items from "open" to "policy
resolved, mechanism open."

**Reason**: Explicit project-owner correction after conditional Phase 3
approval — implementation still not authorized to begin.

**Affected modules**: Documentation only. No application code was written, no
dependencies were installed. React Native remains the proposed (not final)
platform candidate; encryption algorithm, KDF, key management, OTP provider,
final scoring formula/weights, final database schema, migration tooling, and
exact rate limits all remain explicitly unresolved, per instruction.

**Migration requirements**: None — documentation only.

**Tests**: None yet. The corrected session-lifecycle rule (NETWORK FAILURE vs.
AUTHENTICATION FAILURE) and the required at-rest encryption are both flagged
as behaviors that will need dedicated tests once implementation begins —
recorded here so they aren't lost between this phase and the testing phase.

---

## 2026-08-08 — Stitch UI/UX design handoff review

**Change**: Reviewed the delivered Stitch design set (9 screens + a
`DESIGN.md` design-system spec, "Executive Precision" / "EstatePro CRM")
against the approved product requirements, user stories, and full Phase 3
architecture set. Created `/docs/ui/00-ui-handoff-review.md`. Review only —
no application code written or modified, no dependencies installed, no
database schema created.

**Reason**: Explicit project-owner request for a design-handoff validation
pass before production implementation begins.

**Findings summary**: Three **blocking** conflicts between the design and
confirmed architecture were identified and documented (not silently
corrected): (1) a "Cloud Sync — Encrypted remote storage" toggle, on by
default, in the Backup & Security screen, plus backup-history entries
labeled "Automatic Cloud Backup" with one failing due to "Network Timeout" —
directly contradicting the confirmed no-cloud-backup, local-first
requirement (Phase 0 Decision 4); (2) the same screen names "AES-256
encryption" and claims a "master password is never stored on our servers,"
prematurely naming an algorithm and presupposing server-side custody where
none is architected; (3) the match-explanation screen's "Smart Analysis"
panel uses a sparkle (`auto_awesome`) icon and AI-summary-style presentation
that risks implying the deterministic matching engine's explanation is
AI-generated, contradicting Phase 0 Decision 3's explicit instruction that
the UI must not imply AI is making the matching decision. A fourth
significant issue — navigation items and copy ("Global Realty Group," "Team
Directory," "Brokerage Login") assuming a multi-agent/team account model —
was also flagged as blocking for the affected navigation, since it depends
on an explicitly open, unresolved product question (Phase 1 §19.6 Q1).
Additional non-blocking findings: several key screens/states are missing
entirely from this delivery (file edit/detail, ranked match-candidate lists,
full restore-flow states, reminder-schedule configuration, notification-
permission states, destructive-action confirmation, and all loading/empty/
error states); no RTL/Persian designs were provided at all; a minor,
correctable border-radius token mismatch exists between `DESIGN.md` and the
per-screen embedded Tailwind config.

**Affected modules**: Documentation only
(`/docs/ui/00-ui-handoff-review.md`). No application code, dependencies, or
database schema were touched. The Stitch design files themselves were not
modified and were not copied into the git repository as part of this review.

**Migration requirements**: None.

**Tests**: None yet. The blocking findings above must be resolved (by
project-owner/design decision) before the affected screens can be treated as
ready for implementation.

---

## 2026-08-08 — Stitch UI/UX Revision 2: final validation

**Change**: Performed a file-by-file (SHA-256 hash) diff of the revised
Stitch design package (16 screen folders, up from 9) against Revision 1, and
validated it against the approved requirements, Phase 3 architecture, and the
prior UI review. Created `/docs/ui/01-stitch-final-validation.md`. Review
only — no application code written or modified, no dependencies installed, no
database schema created.

**Reason**: Explicit project-owner request for final UI/UX validation before
implementation.

**Findings summary**: Of the four Revision 1 blockers — Cloud Sync (Blocker
1) and premature encryption/server-custody claims (Blocker 2) are **resolved
at the code level** in `settings_backup_security/code.html` and the new
`settings_backup_management/code.html`; the AI-implication issue (Blocker 3)
remains **unresolved** — the only match-detail screen in this revision
(`smart_matching_match_analysis_persian_rtl`) still carries the same "Smart
Analysis" sparkle-icon presentation flagged previously; the team/brokerage
assumption (Blocker 4) is **partially resolved** (removed from the referral
screen, but "Global Realty Group"/"Team Directory" persist in the navigation
shell across most other screens, still pending the underlying open product
decision). Two new blocking issues were found: a "60 Days Before" reminder
row on the new `settings_contract_reminders` screen includes an "Email Alert
/ Edit Recipients" control, reintroducing an unapproved, network-dependent
notification channel into a workflow required to be entirely local; and that
same screen represents only 5 of the confirmed 7 default reminder offsets
(missing 7-day and 3-day), with no way to add them. A packaging-level
blocking issue was also found: `settings_backup_security/screen.png` is
byte-identical to the pre-fix Revision 1 image and still visually shows the
removed Cloud Sync toggle, even though its corresponding code was correctly
fixed — the screenshot asset needs regenerating. Positive additions this
revision: a ranked match-results list screen (filling a Revision 1 gap), an
owner file detail screen (filling another gap), a backup-creation flow with
password/confirm-password entry and a genuine progress state, and partial
RTL/Persian coverage (2 of 16 screens) — though with inconsistent numeral
systems and an untranslated narrative paragraph on the Persian match-analysis
screen. The border-radius design-token mismatch from Revision 1 remains
unresolved.

**Affected modules**: Documentation only
(`/docs/ui/01-stitch-final-validation.md`). No application code,
dependencies, or database schema were touched. The Stitch design files
themselves were not modified and were not copied into the git repository.

**Migration requirements**: None.

**Tests**: None yet. Final gate classification: **NOT READY — BLOCKING
ISSUES**. Five blocking issues documented with exact file paths and
recommended corrections in `/docs/ui/01-stitch-final-validation.md`; none
resolved silently by this review.

---

## 2026-08-08 — Stitch UI/UX final correction pass

**Change**: Corrected all five blocking issues from
`/docs/ui/01-stitch-final-validation.md` directly in the Stitch design
package and added the nine explicitly missing implementation-critical
screens. This is a **design-artifact correction**, not application
implementation: no code in `src/`, no application dependency, and no
database schema were touched. The corrected package
(`stitch_elite_real_estate_crm/`, 32 screens) is committed to this
repository for the first time, at `/design/stitch/` — the location the
design handoff referenced.

**Corrections applied**:
1. Removed "Smart Analysis"/sparkle-icon/AI-implying presentation from
   `smart_matching_match_analysis_persian_rtl/`; replaced with a plain
   "Match Explanation" panel whose Persian copy explicitly states the result
   is deterministic and does not use AI; added the previously missing
   **Ignored** criteria section.
2. Removed "Email Alert / Edit Recipients" from
   `settings_contract_reminders/`; added an explicit local-notification
   banner.
3. Added the missing 7-day and 3-day reminder offsets to
   `settings_contract_reminders/`, completing the confirmed default schedule
   (90/60/30/14/7/3/On Expiration). Flagged a discrepancy: the correction
   task's own text said "1 day before" for the seventh offset, which
   conflicts with the already-approved "expiration day itself" — implemented
   the approved value and did not silently change the confirmed business
   rule.
4. Regenerated `settings_backup_security/screen.png` from its current,
   already-corrected `code.html` via an actual render (previously
   byte-identical to the pre-fix image); also fixed a residual "Failed:
   Network Timeout" label on a now-"Local" backup entry (changed to "Failed:
   Insufficient Storage Space") and swapped a leftover cloud-shaped status
   icon for a neutral one.
5. Removed "Global Realty Group" and "Team Directory" from the four
   remaining screens that still had them
   (`contract_management_timeline/`, `matching_ranked_results/`,
   `file_management_all_files/`, `settings_backup_security/`).
6. Added a complete restore workflow across 8 screens covering all 12
   required states (select, validate, password entry, wrong password,
   corrupted, incompatible version, existing-data warning, explicit
   confirmation, progress, success, failure, safe cancellation) — the
   overwrite-vs-block policy itself remains an open architectural decision,
   not resolved by this design pass.
7. Added an Applicant Detail screen showing structured requirements with
   explicit MUST_HAVE/IMPORTANT/PREFERRED/IGNORE priority chips.
8. Added Owner Edit and Applicant Edit screens reusing existing form
   components, with validation-error and unsaved-changes states.
9. Added a reusable destructive-action confirmation pattern (delete-file
   example) with explicit Cancel/Delete (or Cancel/Restore & Replace)
   actions, never a bare "OK."
10. Reconciled the border-radius token mismatch: every screen's embedded
    Tailwind config now matches `DESIGN.md`'s authoritative scale.

Added RTL/Persian variants for the five most safety/product-critical new
categories (applicant detail, owner edit, destructive confirmation, restore
existing-data warning, reminder configuration), on top of the two
pre-existing RTL screens (dashboard, match explanation). **All 32 screens'
screenshots were regenerated** from their current source via a real headless-
browser render (Tailwind compiled from each file's own embedded tokens, real
Geist/Inter/Vazirmatn/Material Symbols fonts) — not placeholders, not stale
copies — specifically so the radius-token fix (applied to all 15 pre-existing
files) doesn't recreate the exact code/screenshot mismatch this pass was
tasked with closing. A final recursive scan for every previously prohibited
term (Cloud Sync, Smart Analysis, AI, AES-256, server storage/backup, email
alerts, push notifications, team, brokerage, Global Realty Group, Team
Directory, auto_awesome) returned zero matches anywhere in the UI content.

**Reason**: Explicit project-owner instruction to correct the remaining
blocking issues and missing implementation-critical screens identified in
the prior final validation, and re-run an independent review afterward.

**Affected modules**: `/design/stitch/stitch_elite_real_estate_crm/` (design
package, newly committed to the repo) and
`/docs/ui/02-stitch-final-correction.md` (this correction's documentation).
No application code, dependencies, or database schema were touched.

**Migration requirements**: None.

**Tests**: None yet. Final gate classification: **READY WITH MINOR FIXES**
— see `/docs/ui/02-stitch-final-correction.md` for the full breakdown of
non-blocking remaining items (no LTR match-explanation screen, no
notification-permission-denied screen, partial RTL coverage, two product
decisions still needing explicit confirmation).

---

## 2026-08-08 — FINAL product decision: default contract reminder offsets

**Change**: The seven default contract-reminder offsets are confirmed
**FINAL**: 90 days before, 60 days before, 30 days before, 14 days before, 7
days before, 3 days before, and **on the expiration date itself** ("On
Expiration"). **"1 day before" is explicitly not the seventh default** and
must not be used anywhere in documentation or design.

**Reason**: Explicit project-owner decision, made before Phase 4 begins, to
close a discrepancy this session had already flagged (but not silently
resolved) between an earlier correction-round instruction that said "1 day
before" and the previously-approved requirement of "the expiration day
itself." The project owner has now confirmed the originally-approved value
is the final one.

**Affected modules**: Documentation only. Updated
`/docs/01-product-requirements.md` (§14/§19.1, marking the decision FINAL and
resolving the corresponding open-item entry in §19.3),
`/docs/architecture/unresolved-decisions.md` (added an explicit FINAL note
under Contracts/reminders/notifications so "1 day before" is never
reintroduced by mistake), and `/docs/ui/02-stitch-final-correction.md`
(updated its discrepancy note to reflect resolution). No documentation
elsewhere in the repository was found to contain "1 day before" as an actual
(non-historical/non-explanatory) value — `/docs/01-product-requirements.md`
§12, `/docs/notifications/notification-architecture.md`, and the delivered
`settings_contract_reminders/` design already used "on the expiration day
itself" / "On Expiration" consistently, so no contradiction existed there.

**Migration requirements**: None — documentation only; no application code
or schema exists yet.

**Tests**: None yet. This confirms the value that
`/docs/02-user-stories.md` REM-01 and the reminder-scheduling architecture
(`/docs/notifications/notification-architecture.md`) must be tested against
once implementation begins.

---

## 2026-08-08 — FINAL product decision: restore onto a device with existing local data

**Change**: Restoring a backup onto a device that already has existing local
business data **must never silently overwrite it**. The mandatory sequence
is now confirmed **FINAL**:

1. Detect existing local business data on the device.
2. Clearly warn the user that continuing will replace it.
3. Require a safety backup of the device's *current* data to be created.
4. Require that safety backup to validate successfully — if it cannot be
   completed successfully, the restore does not proceed.
5. Require explicit, unambiguous user confirmation (e.g. "Restore &
   Replace," never a bare "OK") before replacing the existing dataset.
6. Perform the restore only after both validation and confirmation have
   completed successfully.
7. Verify the restored dataset.
8. The user must be able to cancel at any point before the actual restore
   step, leaving existing data completely untouched.

This resolves the "block vs. overwrite" question that had been recorded as
open architecture across multiple Phase 3 documents since restore-related
analysis began: the answer is neither a hard block nor a silent overwrite,
but a mandatory safety-backup-then-explicit-replace flow.

**Reason**: Explicit project-owner decision, grounded in the already-
confirmed local-first principle that the local database is the primary
source of truth — for a store with no server backstop, an unprotected
overwrite would be an unrecoverable data-loss risk. Made before Phase 4
begins so the database and backup architecture are designed against the
final policy, not a placeholder.

**Affected modules**: Documentation only. Updated
`/docs/01-product-requirements.md` (§14 — added as a new CONFIRMED FINAL
requirement with the full 7-step sequence; §15 — resolved the corresponding
open item; §19.1/§19.3 — moved from open architectural decision to confirmed
FINAL decision), `/docs/02-user-stories.md` (updated RST-05's "Alternative
flows" and added a new story, **RST-06**, defining the mandatory sequence as
its own testable acceptance criteria; updated the Summary's "Open
architectural decisions" section), `/docs/local-data/local-data-architecture.md`
(§Restore — resolved, with the technical implication that the pre-restore
safety backup must complete and validate before the live database is
touched at all), `/docs/backup/backup-architecture-analysis.md` (§Restore to
a device containing existing data, §Safe rollback if restore fails —
resolved and extended), `/docs/architecture/ux-dependencies.md` (§Restore
workflow — moved from "WAIT FOR STITCH" to "FINALIZE NOW," since Stitch has
already delivered corresponding screens), and
`/docs/architecture/unresolved-decisions.md` (moved from open to resolved in
both the Local data and Backup/encryption sections).

**Contradiction found during this update — not fully closed by documentation
alone**: the already-delivered `restore_existing_data_warning/` Stitch
screen (and its RTL counterpart) does not yet show the mandatory pre-replace
safety-backup step as its own distinct step — it currently goes directly
from the existing-data warning to the replace confirmation. This is now a
tracked, flagged gap between the final product decision and the delivered
design (`/docs/ui/02-stitch-final-correction.md` §F addendum,
`/docs/architecture/unresolved-decisions.md`), requiring a follow-up design
correction pass (not performed in this documentation-only update) before the
restore flow can be considered fully aligned with this decision.

**Migration requirements**: None — documentation only; no application code
or schema exists yet.

**Tests**: None yet. RST-06 in `/docs/02-user-stories.md` is the required
regression-test scenario for this decision once backup/restore is
implemented: no code path may exist where existing local business data is
modified before both a validated safety backup exists and the user has
explicitly confirmed the replacement.

---

## 2026-08-08 — Material 3-founded AZAR Design System standardization

**Change**: Created the authoritative UI design system for implementation,
using Material Design 3 as the structural foundation reconciled against the
existing Stitch design set (32 screens) rather than a generic Material
clone. No application code, dependencies, or schema were touched; no screens
were redesigned.

- `/docs/ui/design-system.md` — the authoritative specification: typography
  (LTR Geist/Inter scale + a parallel RTL Vazirmatn scale with an explicit
  +15-17% line-height uplift rule and a mixed-direction/numeral-system
  rule), spacing (`space-0`…`space-16`, grounded in the 4px-increment scale
  already in consistent use rather than a newly invented one), a
  Compact/Medium/Expanded adaptive grid, layout tokens, a full component
  specification (buttons through date pickers, including two new
  Material-3-sourced components — Snackbars and Date Pickers — that had no
  existing product usage to reconcile against), touch-target rules (48dp
  minimum, documented against every existing interactive element), shape/
  radius tokens (keeping the prior radius-mismatch fix as final), an
  elevation system (5 steps, deliberately narrower than Material 3's full
  range to preserve the "minimal, premium, calm, professional" brand
  direction), a semantic color system (reconciling `DESIGN.md`'s prose color
  descriptions against the actually-implemented token hex values, which did
  not match each other), iconography rules (explicit RTL mirroring
  guidance, and a permanent, standing prohibition on AI/cloud-implying
  iconography — not just a one-time fix), a motion system, interaction-state
  rules, and dedicated Matching UI (§18) and Offline-First Visual Language
  (§19) sections directly enforcing the confirmed deterministic-matching and
  local-first product decisions at the visual-design level.
- `/docs/ui/design-tokens.json` — the machine-readable numeric source of
  truth mirroring every token in `design-system.md`, validated as parseable
  JSON, with dark-mode color values explicitly left unpopulated (flagged,
  not guessed) since no dark palette has actually been designed yet.
- `/docs/ui/design-system-audit.md` — a screen-by-screen audit of all 32
  Stitch screens, classifying each as Compliant / Minor deviation /
  Documented exception / Must correct. 24 screens fully compliant, 6 with
  minor deviations (mostly the ad hoc icon-size vocabulary and one screen —
  `dashboard_home_persian_rtl` — still on Latin-font fallback rather than
  the now-formalized Vazirmatn typeface), and one substantive finding
  restated directly against its screens: `restore_existing_data_warning`
  and its RTL counterpart do not yet show the mandatory pre-replace
  safety-backup step as its own distinct step, per the restore-onto-
  existing-data decision finalized earlier in this session — already
  tracked in `/docs/architecture/unresolved-decisions.md` and
  `/docs/ui/02-stitch-final-correction.md`, restated here as a direct
  per-screen audit finding rather than left implicit.

**Reason**: Explicit project-owner instruction to formalize a Material
3-founded design system before Phase 4 implementation begins, so future UI
work has one authoritative specification rather than per-screen ad hoc
decisions.

**Affected modules**: Documentation only
(`/docs/ui/design-system.md`, `/docs/ui/design-tokens.json`,
`/docs/ui/design-system-audit.md`). No application code, dependencies, or
database schema were touched. No Stitch design file was modified as part of
this pass — this was an audit and specification exercise, not a correction
pass.

**Migration requirements**: None — documentation only.

**Tests**: None yet. The audit's Category D findings (missing focus-ring
states, missing `aria-label`s, the restore safety-backup step, missing
empty/loading states) are the concrete follow-up items for the next design-
correction or implementation pass.

## 2026-08-08 — FINAL UI correction pass before Phase 4: restore safety-backup flow, 48dp touch targets, warning/error separation, dark-mode deferral confirmed

**What changed**: The Material 3-founded AZAR Design System (previous
entry) is approved as the authoritative Phase 4 UI specification, but one
product-critical UI gap remained: the restore safety-backup flow did not
show its mandatory safety-backup step as a distinct state. This pass makes
four corrections, all documentation- and design-package-level only:

1. **Restore safety-backup flow completed as ten distinct states.** The
   finalized product decision (recorded earlier in this changelog under
   "FINAL product decision: restore onto a device with existing local
   data") is now fully represented, state by state, with no states
   silently combined:
   1. Existing Data Detected — `restore_existing_data_detected` (+ RTL, new)
   2. Safety Backup Required — `restore_safety_backup_required` (+ RTL, new)
   3. Creating Safety Backup — `restore_safety_backup_progress` (+ RTL, new)
   4. Safety Backup Success — `restore_safety_backup_success` (+ RTL, new)
   5. Safety Backup Failure — `restore_safety_backup_failure` (+ RTL, new)
   6. Restore & Replace Confirmation — `restore_existing_data_warning` (+
      RTL), **repurposed**: now positioned after the safety backup
      succeeds (state 4) rather than immediately after existing-data
      detection, and its copy names the safety-backup file as a recovery
      path
   7. Restore Progress — `restore_progress` (existing, copy updated to
      reassure the safety backup remains available)
   8. Restore Success — `restore_success` (existing, unchanged content)
   9. Restore Failure — `restore_failure` (existing, copy updated to
      reassure the safety backup remains available for recovery)
   10. Cancellation without data modification — `restore_cancelled` (+ RTL,
       new) — cancelling before the restore step now produces an explicit,
       visible confirmation that no data was modified, rather than silently
       closing the sheet
   States 7-9 remain LTR-only for now (carried scope from before this pass,
   not a new gap this pass introduces). 12 new screen folders were added to
   `/design/stitch/stitch_elite_real_estate_crm/` (6 LTR + 6 RTL); the
   package grew from 32 to 44 screens.
2. **48dp touch-target gap resolved.** Every icon-only interactive control
   across all 44 screens (back/close buttons, header icon buttons, numeric
   +/- steppers, list-row overflow "more" buttons) now sits inside a 48×48dp
   minimum interactive hit-area, while the **visual icon itself is
   unchanged in size** — the fix expands the invisible tappable bounding
   box (`min-w-[48px] min-h-[48px]` plus centered padding), never the icon
   glyph. Applied at the shared-template level so every screen generated
   from the standard page/sheet shells inherits the fix by construction,
   plus a targeted pass over screens with bespoke icon buttons.
3. **`warning` separated from `error` as a distinct semantic token.**
   `design-tokens.json` and `design-system.md` §12 now define genuine
   `warning`/`on-warning`/`warning-container`/`on-warning-container` tokens
   (amber-family, `#8a5000`/`#ffddb3`/`#6b3d00`), replacing the prior
   arrangement where `warning` was only documented as reusing `error`-family
   tones. `warning` is used for non-fatal caution states (contract
   approaching expiration, reminder-related caution, restore-flow warnings
   before the destructive commit step); `error` is reserved for genuine
   failures (failed operation, invalid input, corrupted data, auth failure,
   unrecoverable/failed state) and for the destructive-commit button itself
   even when the banner above it uses `warning` (e.g. "Restore & Replace").
   Re-colored screens: `contract_management_timeline` (also removed an
   undocumented hardcoded hex `#f57f17`/`#fff8e1` that had no token at all),
   `settings_contract_reminders` (+ RTL), and the restore safety-backup flow
   states 1/2/3/4/6. The existing color palette was not otherwise redesigned
   — this is a semantic re-mapping, not a new visual identity.
4. **Dark mode confirmed still deferred.** No dark-mode colors were
   invented or guessed. `design-tokens.json`'s `color.dark` remains
   `{"$status": "NOT DEFINED..."}"`, unchanged by this pass. Dark mode
   remains a future product/design decision requiring its own dedicated
   palette-design pass.

**Consistency check**: the complete `/design/stitch/` package was searched
for every previously-prohibited product concept (Cloud Sync, Smart
Analysis, AI matching, AES-256, server backup, email alerts, push
notifications, team, brokerage, Global Realty Group, Team Directory) —
**zero matches**, including a word-boundary check on "team" alone.

**Final UI/UX gate**: **READY FOR PHASE 4.** The restore safety-backup flow
is complete (all ten states present, none silently combined), the 48dp
touch-target gap is resolved, `warning`/`error` are now distinct tokens,
and dark mode is explicitly and correctly still deferred rather than
half-implemented. Remaining open items (keyboard focus-ring states,
`aria-label`s on icon-only controls, empty/loading list-screen states) are
implementation-phase markup concerns, not design gaps, and do not block
Phase 4.

**Reason**: Explicit project-owner instruction to correct the one
product-critical UI gap remaining before Phase 4 implementation begins —
restoring onto a device with existing data must never let a user reach the
destructive "replace" confirmation without their current data already
being safely backed up.

**Affected modules**: Documentation
(`/docs/ui/design-system.md`, `/docs/ui/design-tokens.json`,
`/docs/ui/design-system-audit.md`) and the Stitch design package
(`/design/stitch/stitch_elite_real_estate_crm/` — 12 new screen folders,
~30 existing screens' `code.html`/`screen.png` updated for touch targets
and/or warning-token re-coloring). No application code, dependencies, or
database schema were touched. Phase 4 implementation was not started.

**Migration requirements**: None — documentation and design-package only.

**Tests**: None yet (no application code exists). Screenshots for all
new/changed screens were regenerated through the established real-render
pipeline (compiled Tailwind CSS, real fonts, headless Chromium) — none are
placeholders or stale copies.

## 2026-08-08 — Human writing & language quality standard; new content style guide

**What changed**: Established a project-wide language-quality standard so
all user-facing copy (and product documentation) reads as natural,
professional writing rather than machine-generated or literally-translated
text. Created `/docs/ui/content-style-guide.md` as the authoritative
source for terminology, Persian writing rules, punctuation, and
error/confirmation/button-label conventions going forward.

As part of establishing the standard, an editorial pass over the existing
Stitch package found and fixed three genuine issues (not a full rewrite —
the existing copy was largely already sound):

1. `applicant_smart_requirements`: the screen title ("Smart Requirements")
   and description ("Configure the smart matching algorithm... This
   ensures high-precision recommendations") implied AI/algorithmic
   intelligence for what is actually a user-configured, deterministic
   priority list. Retitled to "Applicant Requirements" with copy that
   describes what the feature does without overclaiming.
2. `settings_backup_management`: a progress message read "Encrypting local
   database..." — implementation detail (the word "database") leaking into
   user-facing copy. Changed to "Encrypting your data..."
3. `restore_progress`: a progress message read "Decrypting and writing to
   the local database. Do not close the app." — same technical leak, plus
   an abrupt second sentence. Changed to "Decrypting and applying your
   backup. Please don't close the app while this is running."

The restore safety-backup flow's Persian copy (added in the prior
"FINAL UI correction pass" entry) was reviewed against the new standard
and found already compliant — natural sentence structure, correct ZWNJ
usage, consistent terminology, no literal translation from English.

**Reason**: Explicit project-owner instruction that all user-facing text
must read as if written by an experienced human UX writer, with a durable
style guide so future copy stays consistent rather than drifting screen by
screen.

**Affected modules**: Documentation (`/docs/ui/content-style-guide.md`,
new) and three Stitch screens' `code.html`/`screen.png`
(`applicant_smart_requirements`, `settings_backup_management`,
`restore_progress`). No product logic, design system, or application code
was changed — this pass touched language only.

**Migration requirements**: None — documentation and copy only.

**Tests**: None yet. The three corrected screens were re-rendered through
the established real-render pipeline; screenshots are not stale.

## 2026-08-08 — Phase 4: final architecture and data design

**What changed**: With the UI/UX design system gated READY FOR PHASE 4,
this pass reconciled the full Phase 3 document set against the approved
design system and the actual repository state, closed several previously
deferred architectural gaps with concrete (though still security-review-
pending, where cryptographic) proposals, and produced the documentation
Phase 4 requires before implementation can begin. No application code was
written; the repository remains the unmodified Electron starter scaffold,
as expected at this stage.

Key decisions and documents:

1. **Local database technology finalized.** `ADR-002` moves from PROPOSED
   to **FINAL**: SQLite, independent of the still-open platform choice,
   since SQLite is available as a mature binding on both React Native and
   Capacitor.
2. **Platform decision explicitly flagged as still requiring product-owner
   approval**, not silently finalized. `ADR-001`'s React Native
   recommendation stands, but no approval has been recorded anywhere in
   this document set — restated as **PRODUCT OWNER DECISION REQUIRED** in
   `04-final-architecture.md` and `unresolved-decisions.md`.
3. **Backup encryption scheme designed concretely** for the first time:
   AES-256-GCM (AEAD) + Argon2id (KDF), a two-tier DEK/KEK key hierarchy
   independent of the local database's own key, and a strict
   validation-before-trust order for restore. Documented in the new
   `/docs/architecture/backup-encryption-design.md` and `ADR-004`. Marked
   PROPOSED, pending the dedicated security review the project has
   consistently required before finalizing cryptography — this is that
   review's starting point, not a replacement for it.
4. **Local database at-rest encryption scheme designed concretely**:
   SQLCipher / AES-256, key held exclusively in platform secure storage,
   independent of the backup's own key. Documented in the new `ADR-005`.
   Same PROPOSED status and same caveat as above.
5. **Matching engine extended** with a structured mechanism for
   conditional requirements (e.g. "if the property has a pool, ignore
   bedroom count, floor area, and price") that does not depend on natural-
   language processing — a criterion can name other criteria it suppresses
   when satisfied, evaluated per-candidate within the existing four-stage
   pipeline. Documented in `/docs/matching/matching-architecture.md`. The
   scoring-weight values themselves remain explicitly unresolved, with the
   constraints any eventual values must satisfy now fixed instead.
6. **Conceptual data model extended** with the entities the Phase 4 brief
   named that Phase 3's version left implicit: `PropertyAttributes` and
   `RequirementCriterion` clarified as the same concept the brief calls
   "Applicant Preferences" and "Matching Criteria" (not duplicated as
   separate entities), plus new `ReminderSchedule`, `ApplicationSettings`,
   and a formalized `Notes` entity. A full Owner/Applicant shared field
   model (common / owner-specific / applicant-specific / optional-
   extensible / notes) was added to `/docs/database/conceptual-data-model.md`.
7. **Migration strategy documented for the first time** in the new
   `/docs/architecture/migration-strategy.md`: schema versioning,
   transactional migrations with fail-closed behavior, backup
   compatibility keyed off the same version number, and the governing
   principle that a future app update must never silently destroy
   existing local data. The backup-version support-window policy remains
   a product-owner decision.
8. **Restore safety enforced as an explicit state machine**, added to the
   new `/docs/architecture/04-final-architecture.md` §7 — mapped
   state-for-state to the ten-state UI flow already built and audited in
   the design system, making the "safety backup must succeed before
   replace confirmation, and validation must complete before any write to
   the live database" invariants structurally explicit rather than only
   narratively described.
9. **Threat model extended** with explicit coverage for rooted/jailbroken
   devices, app tampering/repackaging, replay attacks, notification
   lock-screen leakage, and insecure temporary files during restore
   staging — none block the rest of the architecture; all are recorded as
   real, currently open items rather than silently assumed away.
10. **Four new ADRs** recording decisions already implicit elsewhere in
    standard ADR form: `ADR-006` (matching engine), `ADR-007` (local
    notifications), `ADR-008` (offline session lifecycle — the NETWORK
    FAILURE vs. AUTHENTICATION FAILURE rule), and `ADR-009` (authentication
    boundary — the shape of the online surface, distinct from `ADR-003`'s
    narrower OTP-vendor-selection question).

**Reason**: Explicit project-owner instruction to complete Phase 4 —
architecture and data design only, no implementation — now that the UI/UX
design system has passed its final gate.

**Affected modules**: Documentation only
(`/docs/architecture/04-final-architecture.md`,
`/docs/architecture/backup-encryption-design.md`,
`/docs/architecture/migration-strategy.md`,
`/docs/architecture/decisions/ADR-001` through `ADR-009`,
`/docs/database/conceptual-data-model.md`,
`/docs/matching/matching-architecture.md`,
`/docs/security/threat-model.md`,
`/docs/architecture/unresolved-decisions.md`). No application code,
dependencies, or database schema were touched.

**Migration requirements**: None — documentation only.

**Tests**: None yet (no application code exists).

**Final architecture gate**: **ARCHITECTURE READY WITH PRODUCT DECISIONS
REQUIRED.** See the full final report delivered alongside this entry for
the complete list of what's finalized, what's proposed, and what needs a
product-owner call — the two decisions with the broadest downstream
impact are the mobile platform choice (`ADR-001`) and the backup-version
support window (`migration-strategy.md`).

## 2026-08-08 — Phase 4B: product decisions finalized + dedicated security review

**What changed**: Closed the product-owner decisions Phase 4 left open,
and performed the dedicated cryptographic security review that
`ADR-004`/`ADR-005` had been waiting on since they were first written. No
application code was written; this remains a documentation and
architecture pass.

Four decisions finalized:

1. **Mobile platform: React Native, FINAL.** `ADR-001` re-checked against
   the complete requirement list one last time — no previously
   undocumented blocker surfaced. Capacitor is no longer under
   consideration for this product. The Electron scaffold remains fully
   retired, not adapted, when implementation eventually begins.
2. **Backup version-compatibility window: CURRENT + 2 previous format
   generations, FINAL.** A backup older than that is explicitly rejected,
   never silently attempted. Documented in
   `/docs/architecture/migration-strategy.md`, with a consolidated
   pre-restore validation checklist (format version, encryption metadata,
   integrity/authentication, schema version/migration compatibility,
   required fields) added alongside it.
3. **Referral code reuse policy: immutable after registration, FINAL.** A
   referral relationship is created exactly once, at registration, and
   can never be replaced, removed, or re-attached afterward — enforced
   server-side, with self-referral rejected. Documented in `ADR-009`.
4. **Matching engine scoring model formalized**, without inventing final
   weights, in the new `/docs/architecture/matching-scoring-spec.md`: hard
   vs. soft constraints, five match types (exact, range, approximate,
   categorical, amenity/boolean), explicit handling for missing/
   conflicting/excluded values, conditional-criteria interaction with
   scoring, score normalization (against an applicant's own achievable
   score, not a fixed global maximum), and the full explanation-generation
   content contract. The actual weight numbers remain open, deliberately.

**Dedicated cryptographic security review performed**, documented in the
new `/docs/security/phase-4-security-review.md`. The review confirmed the
core designs in `ADR-004` (AES-256-GCM + Argon2id backup encryption) and
`ADR-005` (SQLCipher/AES-256 local database encryption) are sound —
neither algorithm choice changed — and produced six concrete corrections/
additions, all now folded into `backup-encryption-design.md` §11 and the
two ADRs:

- A specification fix for which header fields each of the two GCM
  operations authenticates (previously ambiguous, not exploitable as
  designed, but worth making precise).
- A requirement that key material (password, KEK, DEK) be handled through
  a native crypto binding capable of explicit memory zeroing, since
  JavaScript's runtime offers no deterministic memory-erasure guarantee.
- **The review's highest-severity finding**: restore/migration staging
  copies of the database were not previously required to be encrypted,
  which could have allowed an implementation to create a genuinely
  plaintext temporary copy of a user's full business data. Now a binding
  requirement — any staged database copy must itself be SQLCipher-
  encrypted, never plaintext, even transiently.
- A requirement to exclude staging/cache paths from OS-level device
  backup (iOS/Android), as defense in depth on top of the encryption
  requirement above.
- A requirement to clean up leftover staging files from a crashed session
  on next app startup.
- A requirement for prototype-pollution-safe, resource-bounded parsing of
  a validated backup payload.

A concrete Argon2id benchmarking procedure was also defined
(`backup-encryption-design.md` §3.1) — the KDF parameters remain PROPOSED
until that procedure is run against a real minimum-supported device,
which itself depends on a still-open minimum-OS-version/device-tier
decision.

The review also walked the restore state machine and the offline/online
session boundary against nine specific adversarial scenarios (attacker
has the device; attacker has only the backup; the backup was modified;
the app crashed mid-restore; the user forgot the password; the app was
reinstalled; the app was offline for a long time; the server reports
authentication failure; the server is unreachable) — all nine held up
against the existing design, with no scenario breaking the
authenticate-before-trust or network-failure-never-logs-out invariants.

**No CRITICAL findings. One HIGH finding (the plaintext-staging gap
above), resolved at the architecture level by this same pass** — the
requirement fixing it is written into the documents already, so it does
not remain open.

**Reason**: Explicit project-owner instruction to close the remaining
Phase 4 product decisions and perform the dedicated security review that
had been consistently deferred until a concrete design existed to review.

**Affected modules**: Documentation only (`ADR-001`, `ADR-004`, `ADR-005`,
`ADR-009`, `backup-encryption-design.md`,
`/docs/architecture/migration-strategy.md`,
`/docs/architecture/matching-scoring-spec.md` (new),
`/docs/security/phase-4-security-review.md` (new),
`/docs/security/threat-model.md`,
`/docs/architecture/unresolved-decisions.md`,
`/docs/database/conceptual-data-model.md`). No application code,
dependencies, or database schema were touched.

**Migration requirements**: None — documentation only.

**Tests**: None yet (no application code exists).

**Security gate**: **SECURITY GATE PASSED WITH CONDITIONS.** See the full
report delivered alongside this entry — the conditions are the remaining
open items (Argon2id parameter benchmarking, a future implementation-level
crypto review, and the still-open UX-dependent items), none of which are
CRITICAL or unresolved HIGH findings.

## 2026-08-08 — Phase 5: implementation master plan

**What changed**: With the architecture and security design gated
`SECURITY GATE PASSED WITH CONDITIONS`, this pass produced the complete
implementation roadmap — twelve phases (Phase 5 through Phase 16) taking
the project from the current Electron scaffold to a released React
Native application. No application code was written, the Electron
scaffold was not touched, and no production dependency was installed;
this remains a planning pass.

Three documents created:

1. **`/docs/implementation/implementation-roadmap.md`** — Project
   Foundation, Local Database, Security & Cryptography, Authentication &
   Referral, Matching Engine, Contracts & Reminders, UI Foundation,
   Feature UI Implementation, Integration, Testing & Quality, Security
   Audit, and Release Preparation, each with an objective, inputs,
   outputs, expected files, dependencies, security/performance/UX
   considerations, tests, acceptance criteria, and an exit gate. A
   dependency graph identifies exactly two safe parallelization
   opportunities (authentication, matching, and contracts/reminders can
   proceed in parallel once the encrypted database exists; UI foundation
   work can start alongside them) and explicitly declines to recommend
   parallelizing anything else, since every later phase genuinely depends
   on the one before it.
2. **`/docs/implementation/ui-screen-mapping.md`** — every one of the 44
   Stitch screens/states mapped to a React Native screen, route, data
   source, and its loading/empty/error/success behavior. The restore
   safety-backup flow's ten states are mapped directly onto
   `04-final-architecture.md`'s restore state machine, state for state,
   specifically flagged as the highest-risk wiring in the whole mapping.
   Three genuine design gaps were found and documented rather than
   silently designed around: no empty-state pattern yet exists for the
   file list, match results, or contract timeline screens (or a true
   first-run dashboard), and no skeleton/loading-state visual pattern has
   been designed at all — both need a short, focused design addition
   before or during the UI implementation phase.
3. **`/docs/implementation/testing-strategy.md`** — the full test
   taxonomy, a catastrophic-scenario table (corrupted backup, wrong
   password, interrupted restore, insufficient storage, app crash during
   restore, database corruption, failed migration, network failure,
   authentication failure, duplicate reminder, duplicate referral,
   malicious backup — each with its required correct behavior, not just
   "doesn't crash"), a security testing matrix covering backup and
   database confidentiality/integrity, key storage, temporary-file and
   logging leakage, device-compromise behavior, and referral/OTP abuse,
   plus RTL/accessibility and performance testing plans against the
   100/1,000/10,000/50,000-record dataset tiers already established in
   the architecture phase.

**Reason**: Explicit project-owner instruction to produce the complete
implementation roadmap now that architecture and security design have
passed their respective gates, so implementation can begin from a
reviewed plan rather than ad hoc phase-by-phase improvisation.

**Affected modules**: Documentation only
(`/docs/implementation/implementation-roadmap.md`,
`/docs/implementation/ui-screen-mapping.md`,
`/docs/implementation/testing-strategy.md`, all new). No application
code, dependencies, or database schema were touched. The Electron
scaffold remains in place, to be retired at the start of actual Phase 5
execution, not during this planning pass.

**Migration requirements**: None — documentation only.

**Tests**: None yet (no application code exists).

**Implementation plan gate**: **IMPLEMENTATION PLAN REQUIRES DECISIONS.**
The plan itself is complete and internally consistent, but Phase 7
(Security & Cryptography) cannot fully complete without a minimum-
supported-device decision (needed for Argon2id benchmarking), and Phase 9
(Matching Engine) cannot be considered production-ready without the
still-open scoring-weight values — both carried forward from Phase 4B,
not new gaps introduced by this pass. See the full final report delivered
alongside this entry for the complete list.

## 2026-08-08 — FINAL product decisions: minimum Android version, Xiaomi compatibility

**What changed**: Before Phase 5 implementation begins, recorded two
product-owner decisions that directly unblock work Phase 4B left open,
plus their concrete test-plan consequences. No application code was
written, no dependency was installed, and Phase 5 was not started.

1. **Minimum Android version: 8.0 / API 26, FINAL.** Target/compile SDK
   tracks the latest stable Android SDK at build time. The minimum does
   not move for convenience, a library default, or a newer platform API
   — every dependency is checked for API 26 compatibility before
   adoption, and an incompatible dependency is replaced, not
   accommodated by raising the floor.
2. **Xiaomi device compatibility: first-class and non-negotiable, FINAL.**
   MIUI/HyperOS-specific behavior (aggressive background/battery
   management, notification scheduling and delivery, database stability
   under process recreation, scoped storage, reboot/force-stop behavior,
   and more) must be designed for and tested against from the start, not
   patched in after a bug report. Xiaomi problems must never be solved by
   weakening the security model already finalized in `ADR-004`/`ADR-005`
   or the restore state machine.

Recorded in a new `ADR-010-minimum-android-version-and-xiaomi-compatibility.md`.

This also resolves the "minimum-device-tier" gap Phase 4B's security
review flagged as blocking the Argon2id benchmarking procedure
(`backup-encryption-design.md` §3.1) — the benchmark now has a concrete
target (a Xiaomi low/mid-range device at or near API 26) and only needs
to be run, not further decided. `unresolved-decisions.md`, `ADR-004`, and
`04-final-architecture.md` were updated to reflect this.

`implementation-roadmap.md` and `testing-strategy.md` were extended with
the concrete consequences of both decisions: Phase 5's Gradle
configuration now specifies `minSdkVersion 26` explicitly; Phase 10's
notification-scheduling work must account for MIUI's autostart/background
restrictions rather than assuming stock-Android reboot-recovery behavior
is sufficient; a full Android version compatibility matrix (API 26
through the current release) and a priority real-device test set (Xiaomi
low/mid-range, Xiaomi mid/high-range, non-Xiaomi low/mid-range, and a
Google/stock-like device) were added to the testing strategy; an explicit
Xiaomi stability non-functional requirement was added, naming nine
release-blocking failure categories (crashes, startup crash loops,
database corruption, inability to open the encrypted database,
platform-caused backup/restore failure, silently-failing reminders, data
loss after process death, migration failure, and UI breakage after
lifecycle recreation); and Phase 16's release gate now requires Xiaomi
stability sign-off on the same footing as Phase 15's security sign-off.

A consistency scan across the full documentation set found no existing
reference to an Android version higher than API 26, no assumption of a
newer-Android-only API presented as unconditional, and no contradiction
with the offline-first boundary (`04-final-architecture.md` §4) — that
boundary is unchanged by this pass and is restated, not altered, by this
entry: business data still never depends on network connectivity; the
same five operations (registration, OTP, referral validation, recording
the registration/referral relationship, session establishment/
revalidation) remain the only online-dependent surface; a network failure
still never causes local data loss or blocks offline operation.

**Reason**: Explicit project-owner instruction to record the minimum
Android version and Xiaomi compatibility as final decisions before Phase
5 begins, since both affect dependency selection and project
configuration from the very first commit of implementation.

**Affected modules**: Documentation only
(`ADR-010-minimum-android-version-and-xiaomi-compatibility.md`, new;
`unresolved-decisions.md`, `backup-encryption-design.md`, `ADR-004`,
`04-final-architecture.md`, `implementation-roadmap.md`,
`testing-strategy.md`, updated). No application code, dependencies, or
database schema were touched. The Electron scaffold remains in place;
Phase 5 has not begun.

**Migration requirements**: None — documentation only.

**Tests**: None yet (no application code exists).

**Status**: Documentation updated and consistent. Implementation
(Phase 5) remains paused pending explicit project-owner approval to
begin, per this task's explicit instruction not to proceed automatically.

## 2026-08-08 — Implementation session handoff document

**What changed**: Created `/docs/implementation/00-session-handoff.md`,
the single entry point for a new Claude Code session picking up
implementation without the benefit of this conversation's history. No
application code was written, no dependency was installed, Phase 5 was
not started, and no new product or architecture decision was made — this
document consolidates and cross-references decisions already recorded
elsewhere, it does not create new ones.

The handoff covers: the non-negotiable project constitution (platform,
connectivity boundary, database, backup, security, matching, notifications,
UI/UX, and human-writing rules); the Android 8/API 26 and Xiaomi
compatibility requirements in full, including the explicit statement that
successful compilation is not evidence of Xiaomi compatibility; an
architecture map naming exactly which document governs each subsystem;
summaries of the data model, matching engine, security checklist, UI/UX
implementation plan (with its three known, already-documented design
gaps restated rather than silently resolved), testing strategy, and the
full Phase 5-16 implementation roadmap; three explicit decision-status
lists (FINAL, PROPOSED, OPEN) drawn directly from
`unresolved-decisions.md`; and a numbered startup protocol a new session
should follow before writing any code.

A documentation-wide consistency scan was performed as part of creating
this handoff, checking specifically for: stale Electron references
presented as current, stale Capacitor references presented as a live
option, cloud-sync assumptions, AI-based-matching assumptions, push/email
notification assumptions, Android minimum-version contradictions, Xiaomi
compatibility contradictions, offline/online boundary contradictions, and
FINAL-vs-OPEN decision contradictions. **No contradictions were found**,
and no other document required correction as a result.

**Reason**: Explicit project-owner instruction to prepare a
self-contained handoff before moving to a new Claude Code session for
implementation, so that session does not need this conversation's history
to understand the project correctly.

**Affected modules**: Documentation only
(`/docs/implementation/00-session-handoff.md`, new). No application code,
dependencies, or database schema were touched. The Electron scaffold
remains in place; Phase 5 has not begun.

**Migration requirements**: None — documentation only.

**Tests**: None yet (no application code exists).

**Status**: Handoff complete. Implementation remains paused pending
explicit approval to begin Phase 5 in the next session.

---

## 2026-10-22 — v3.0.0 design, batch 1: KSS colours and font, one-page sign-in, three-step new file

**Change**: The app now uses the kssx.ir look (Amin approved the 16-screen design, #4205/#4211):
- Colours: the KSS UI palette (brand navy `#21364F`, ink `#0F172A`, slate neutrals, the site's
  green/amber/red/blue status families) in `src/shared/theme/tokens.ts` and
  `docs/ui/design-tokens.json`; new role `placeholder` (`#94A3B8`). Field borders use `outline`
  (`#CBD5E1`), dividers `outlineVariant` (`#E2E8F0`).
- Font: IRANYekan (Regular/Medium/Bold), the kssx.ir font, replaces Vazirmatn
  (`assets/fonts`, `android/app/src/main/assets/fonts`, `rtlFontFamilyByWeight`).
- Sign-in on one page (`PhoneEntryScreen` + new `OtpCodePanel`): after «دریافت کد تأیید» the
  number is locked and only «ویرایش شماره» is active; it drops the sent code and unlocks the
  number. No «read automatically» note (#4205). The OtpVerification route stays for old links.
- Code boxes: focus always goes to the next box to fill (a tap on a right-hand box used to put
  the cursor there while digits filled from the left); Persian keyboard digits are accepted.
- Welcome: navy header with the mark and three plain benefits.
- New property file in three steps (type and place → details and price → title and notes) with
  one bottom button; deal and property type are one-tap chips (`ChoiceChips`, «سایر» for other
  text); rooms use `NumberStepper`; the city starts as the city of the last file; a title is
  suggested from type, rooms, area and city; a server-side field error jumps back to its step.
  Edit mode keeps every field on one page. `FormScreenContainer` gains `subheader` and `footer`.
- Price fields show the amount in Persian words (`amountInWords`); the quick chips read
  «× میلیون» / «× میلیارد».

**Reason**: Amin #4180 (professional look, ease of use, colours of the site), #4205, #4211.

**Affected modules**: shared theme and components, auth screens, property create screen/form.

**Migration requirements**: None (no data change; stored values are the same free text).

**Tests**: new PhoneEntryScreen, CreatePropertyScreen (steps), amountInWords, MoneyInput words;
full suite under Node 22: 621/622 pass; the one failure (ReminderListScreen «بعداً» section)
fails the same way on the code before this change.

---

## 2026-10-22 — v1.1.0: update notice from the KSS server

**Change**: The installed app announces a new version itself (Amin #4216). `checkForUpdate` reads
`https://api.zarandix.ir/app/update.json` (`{version, url, notes}`, served by the KSS host next to
the install file) and falls back to the GitHub latest release only when that file can't be read.
`UpdateChecker` checks at launch and again whenever the app returns to the foreground (at most
once an hour); the notice shows the release notes, says the data on the phone is kept, and
«بعداً» hides that version until the next launch. Version 1.1.0 (versionCode 2) carries the
batch-1 design.

**Reason**: Amin #4216 — updates should reach the app already installed, with a notice.

**Affected modules**: `src/infrastructure/updates`, `src/app/UpdateChecker.tsx`, version files.

**Migration requirements**: Each release: raise APP_VERSION / package.json / versionName and
versionCode, put the APK and `update.json` on the KSS host, and publish a GitHub release
(`v<version>` with the .apk) so 1.0.0 installs, which only know GitHub, see it too.

**Tests**: updateService (KSS first, GitHub fallback, https only), UpdateChecker notes; full suite
626/627 (ReminderListScreen «بعداً» fails on older code too).

---

## 2026-10-23 — v1.2.0: update downloaded and installed inside the app

**Change**: The update no longer leaves the app or uses GitHub (Amin #4223). `checkForUpdate`
reads only `https://api.zarandix.ir/app/update.json`, now `{version, url, sha256, notes}`; the
link must be in that same KSS folder and the checksum must be 64 hex characters, otherwise
nothing is offered. `updateDownloader` fetches the APK quietly in the background into the app's
private `files/updates` folder (`.part` first, sha256 checked, older files removed, cleared when
nothing is newer). Only then does `UpdateChecker` offer «نصب»; the native `AzarInstaller` module
hands the checked file to Android's installer through `AzarUpdateFileProvider`, shown over the
app. Android's one-time "install from this source" permission is explained first in Persian
(«یک اجازهٔ یک‌باره» → «باز کردن تنظیمات»); when the user comes back with it on, the install
continues by itself. New permission: `REQUEST_INSTALL_PACKAGES`. Version 1.2.0 (versionCode 3).

**Reason**: Amin #4223 — no GitHub, no leaving the app, update in the background.

**Affected modules**: `src/infrastructure/updates` (updateService, updateDownloader,
appInstaller), `src/app/UpdateChecker.tsx`, Android `AzarInstallerModule`,
`AzarUpdateFileProvider`, `res/xml/azar_update_paths.xml`, manifest, version files.

**Migration requirements**: Each release: raise APP_VERSION / package.json / versionName and
versionCode; upload the APK to `/var/www/azar-app/azar-<version>.apk` on the KSS host and write
`update.json` with its sha256. GitHub releases are no longer needed. Installs older than 1.2.0
cannot install in-app; they move to 1.2.0 once by the install file.

**Tests**: updateService (KSS only, folder and checksum rules), updateDownloader (checksum,
reuse, wrong file, server error, cleanup), UpdateChecker (quiet download, install, one-time
permission then install on return, «بعداً»).

**Also in v1.2.0 — sign-in code from the SMS (Amin #4229)**: the code SMS comes from a fixed
Kavenegar template, so the hash-based SMS Retriever can't be used. The native `AzarSmsCode`
module uses Google's SMS User Consent API (`play-services-auth-api-phone` 18.1.0): while the
code boxes are on screen, the next SMS with a code (within 5 minutes) makes Android ask once
whether AZAR may read it; on allow, `smsCodeReader.extractCode` takes the 6 digits (Persian or
Latin) and `OtpCodePanel` fills and checks them. «ارسال مجدد کد» starts a new wait. No SMS
permission is declared. The first code box also carries `autoComplete="sms-otp"` /
`textContentType="oneTimeCode"` so keyboards can offer the code. Tests: extractCode,
OtpCodePanel fill from SMS.

**Also in v1.2.0 — own signing key and code with no question (Amin #4232/#4235)**: until 1.1.0
the app was signed with React Native's public `debug.keystore`, so anyone could sign a fake
`com.azarapp` that installs over AZAR. From 1.2.0 release APKs are re-signed after the CI build
with KSS's private key (PKCS12, alias `azar`; kept off the repo on the KSS laptop and server,
never in CI) using `apksigner`. Installs signed with the old key must be removed once (take a
backup first) before installing 1.2.0; later updates install over it. `AzarSmsCode` now also
runs the SMS Retriever: an SMS ending with AZAR's app tag `9kE13uqFQoX` (from the package name
and the new key) fills the code with no question; other SMS still get the one-tap consent
question, which is dropped when the tagged copy arrives.

**Also in v1.2.0 — solid dialog cards**: dialogs and sheets used an 86–92% white "glass" card;
Android does not blur behind it, so the screen underneath showed through the text (seen on the
update dialog). They now use the solid `surfaceContainerLowest` with an `outlineVariant` border
(ConfirmDialog, InfoDialog, OtpPromptDialog, PasswordPromptDialog, DateInput, FilterSheet,
LostReasonDialog, DealNotesSection, SettingsScreen).

---

## 2026-10-23 — v1.3.0: design batch 2 and the EYVAN name

**Change**: The app's shown name is now EYVAN («ایوان»): launcher label (`strings.xml`
`app_name`, `app.json` `displayName`), the sign-in mark, and the user-facing texts that named the
app. The package id stays `com.azarapp`, so 1.2.0 installs update in place. Design batch 2
follows Amin's approved mockups:

- **Home**: greeting with a reminders bell (red dot when a reminder is overdue), two add buttons
  («فایل ملکی» / «متقاضی»), a matching banner (how many suitable files for how many active
  applicants, from the existing matching engine), «پیگیری‌های امروز» (today's and overdue
  not-done reminders with the applicant's name and a call button), and a four-tile «خلاصه». A new
  account sees the «سه قدم تا اولین تطبیق» checklist. The old needs-attention and recent-activity
  blocks and their components (StatCard, QuickActions, NeedsAttentionList, UpcomingRemindersList)
  are gone.
- **Files**: «فایل‌ها» title, counts on the segments, one search pill, a filter button with the
  applied-filter count, removable chips for applied filters, a count line, and the wide «فایل
  تازه» / «متقاضی تازه» button. Cards show the deal-type tag, area and rooms, the price as a
  broker says it («۸٫۵ میلیارد تومان», «رهن ۲ میلیارد · اجاره ۴۵ میلیون»), suitable matches and
  how long ago the file was added; applicant cards have a call button.
- **Filter sheet**: handle, «پاک کردن همه», deal type, property type, price / budget range in
  billions of toman, status, and one button that says how many it will show («نمایش ۱۲ فایل»).
- **Detail pages** (property and applicant): tag and status, large title, short price with the
  exact amount under it, area / rooms / type as tiles, Persian digits everywhere (area and rooms
  were Latin), «ویرایش» as the main action and delete as a quiet text button; the applicant page
  has a call button.
- Fixes: the tab bar no longer sits above the keyboard (`tabBarHideOnKeyboard`); an empty rooms
  stepper shows a muted «؟» instead of «—», which looked like a minus button.

**Reason**: Amin #4180/#4265/#4268 (continue without the icon; the icon comes later).

**Affected modules**: `features/dashboard` (screen, types, service, new `HomeSections`),
`features/files`, property and applicant list/detail screens and cards, shared `ListToolbar`,
`RangeFilter`, `SpecTiles`, `FilterSheet` (`applyLabel`), `FloatingActionButton` (`label`),
`NumberStepper`, `Icon` (phone/search/bell/time), new `shared/utils/shortMoney`, navigation tab
options, version files.

**Migration requirements**: None (no data change).

**Tests**: shortMoney (short amounts, ranges, money line, relative days), dashboard service
(counts, today/overdue follow-ups with phone, matching count without archived applicants), home
screen (summary, add buttons, tiles, banner, follow-up call, empty day, bell, first steps), list
and detail screens and cards updated for the new texts.

---

## 2026-10-25 — Tokens only on final save; token card on Settings; logo placeholders; one-line header; calendar cleanup

**Change**:
- **Token counting (server)**: tokens are counted only when a property file, an applicant or a contract
  is saved (its data plus the WebP size of its photos, 0.127 per KB) and on a number change. Photo uploads
  and drafts count nothing. Each save books the difference from what the record was charged so far; a
  deleted record gives its tokens back. The allowance is no longer written into the ledger: it is read from
  kss-pricing as it is now (`balance = allowance + ledger`). Existing ledgers are rebuilt once
  (`opening-v2`).
- **Token card**: back on Settings itself, smaller count («X از Y توکن مصرف شده»), bar green → yellow
  when less than 30% is left → red from 95% used. The ⓘ opens a breakdown (allowance, gifts for referral
  and profile, bought, used for files / applicants / contracts / number change, remaining). The
  «کارنامهٔ توکن» history page is removed. No hard-coded allowance is shown.
- The photo editor no longer shows «حدود X توکن».
- **Placeholders**: where a photo can be but is not — empty photo grid, a file or contract page with no
  photos, a photo still loading, the profile photo — a faded grey EYVAN logo.
- **Header**: title, then the section chip, then the «where am I» path on one line; the path uses «←»
  (the old «‹» was mirrored by the phone in Persian text and pointed backwards).
- **Calendar**: signing out, account deletion and a sign-out forced by another phone delete the app's own
  calendar (renewal / contract-end reminders) without asking for permission. The calendar is now called
  «یادآورهای ایوان»; the older «یادآورهای آذر CRM» is cleaned up too. An uninstall cannot be caught: its
  reminders go at the next install's first start, or with that one calendar in the phone's calendar app.

**Reason**: Amin #5103–#5110, #5112.

**Affected modules**: `server/src/tokens.js`, `syncRoutes.js`, `phoneRoutes.js`; settings
(`TokenCard`, `tokenLedger`, Settings/Profile screens; `TokenLedgerScreen` removed), photos
(`PhotoEditor`, `PhotoStrip`, `photoList`), shared `LogoPlaceholder`, `SectionMark`
(`HeaderTitleLine`), `ScreenHeaderBar`, `FormScreenContainer`, `calendarService`, `AuthProvider`.

**Migration requirements**: none on the phone; the server rebuilds each account's ledger once on its next
sync.

**Tests**: server tokens (live allowance, rebuild, records-only counting with photos, replay, refunds,
short balance); token card levels and breakdown; calendar cleanup (both names, no permission prompt,
never throws).

---

## 2026-10-25 — 1.5.1: installs on 32-bit phones; download on kssx.ir

**Change**: the release build now carries armeabi-v7a native code next to arm64-v8a (CI adds swap so both fit in
the runner's memory), so 32-bit Xiaomi/Redmi phones can install it. The download and the app's share link move to
kssx.ir's apps page; updates are accepted from https://kssx.ir/dl/ as well as the old folder.

**Reason**: Amin #5149 («برای گوشی های شیائومی نصب نمیشه»), #5135.

**Affected modules**: `.github/workflows/android-build.yml`, version files, `updateService`, `SettingsScreen`.

**Migration requirements**: none.

**Tests**: update check accepts kssx.ir/dl/ and refuses a look-alike host.

---

## 2026-10-25 — 1.5.2: Telegram-like tab swipe, swipe back, screenshots only in Settings

**Change**:
- The tabs are one sliding strip (`navigation/SwipeTabs.tsx`, a custom TabRouter navigator in place of
  bottom-tabs): on a tab's first page the pages follow the finger and settle on release; a tap on the tab bar slides
  the same way (#5179).
- On an inner page a swipe to the left goes back one page in that tab, until its first page (#5182). Horizontal
  scrollers (filter chips, barter options) are gesture-handler ScrollViews so they keep their own drag.
- Screenshots are allowed only in the Settings section (`AzarScreenModule` clears/sets FLAG_SECURE; #5162).
- The referrer barcode opens in a popup sized to the screen (#5160).
- No explanation text under the token breakdown (#5163).
- Photos step: one «افزودن عکس» button above continue/save, opening a camera/gallery menu like the profile
  photo's (`PhotoAddButton`, `usePhotoAdder`; #5170).
- A match under 70% shows grey, not green (#5173).
- Vazirmatn is its Farsi-Digits build, so typed digits show Persian at once (#5174).
- Bottom sheets (row actions, options, filters, token details) slide up and back down (`SheetModal`); the snackbar
  slides up; the long-press sheet has «انصراف» and «حذف» side by side (#5186).
- A new page in a section slides in from the left and back out to the left (`slide_from_left`, all stacks; #5186).
- The Settings tab always opens on its first page (#5190). The tab reads its stack's state from the tab navigator
  when it loses focus; the `route` prop does not carry it in react-navigation 7 (the first try never fired).
- No copy/cut menu in text fields; the app is covered in the background/app switcher (`PrivacyCover`, and
  `setRecentsScreenshotEnabled(false)` on Android 13+), Settings included (#5199).
- The start page shows the EYVAN logo in its navy header instead of the «EYVAN» tile (#5233).
- CI runs the whole jest suite before building.
- `app/mathRandomGuard.ts` (imported first in `index.js`): where `Math.random` returns values outside [0, 1)
  (seen on the test emulator: raw 64-bit integers), it is replaced by mulberry32. Without it every navigator got the
  same key «stack-undefined…», so the swipe back only reached the Settings stack.
- A file is for sale, رهن و اجاره and/or barter, chosen together on the first step (`MultiChoiceChips`); each kind
  chosen adds its own step with its own required fields (sale price; رهن and اجاره; barter items + value). Stored in
  `transaction_type` as «فروش، رهن و اجاره» (`utils/dealKinds.ts`, no migration; old «اجاره»/«رهن» read as
  رهن و اجاره). Fields of kinds not chosen are dropped on save (#5240).
- Matching follows the kind: a buyer never sees a rent-only or barter-only file, a tenant never a sale-only one; a
  tenant's budget is compared with the رهن. Contracts (and the «ایجاد قرارداد» button) are for رهن و اجاره deals only
  (#5240).
- A file with an active/finished contract, or with a deal at «قرارداد»/«موفق», or an archived file, no longer shows in
  matching (`closed` from `PropertyRepository`; #5241).
- Night mode has more depth: cards lift clearly off the page, form controls have their own fill (new `field` colour
  role, both palettes) and their borders show (`outline` ≥ 3:1 on cards; checked in `contrast.test.ts`; #5242).
- Every account is free for now: the server answers «free» for all when `AZAR_LICENCE_ALL_FREE=1`, and a free account
  sees no subscription card, so the app never says «free» (#5245). The plans for later stay on file in
  `licenceRoutes.js` (#5244).

**Reason**: Amin #5160, #5162, #5233, #5163, #5170, #5173, #5174, #5179, #5182, #5186, #5190, #5199, #5240, #5241,
#5242, #5244, #5245.

**Affected modules**: navigation (`SwipeTabs`, `TabSwipe`, `TabBarButton`, `MainNavigator`), `MainActivity`,
`AzarScreenModule`, `security/screenshots`, Settings (`SettingsScreen`, `TokenCard`), photos (`PhotoEditor`,
`PhotoAddButton`), create property/contract screens, `MatchingScreen`, `DealListScreen`, `PropertyForm`, fonts,
CI workflow.

**Migration requirements**: none.

**Tests**: back-swipe rule; contract photos step shows the single add button.

## 2026-10-25 — Token purchase in the app, server side (#5245, on the sandbox)

**Change**:
- azar-auth `purchaseRoutes.js`: `POST /tokens/purchase/quote`, `POST /tokens/purchase` (Idempotency-Key),
  `POST /tokens/purchase/status`, `POST /tokens/purchases` (receipts), `POST /tokens/purchase/paid` (billing's signed
  notice, HMAC-SHA256 in `x-kss-signature`) and `GET /tokens/paid` (the «payment done, go back to the app» page).
- The price per token and its VAT come only from kss-pricing (`app.eyvan_token_price`, `decision.eyvan_token_vat`,
  `vat_rate` from 0.38.1). No price or no VAT answer = purchase off; no fallback price.
- Buying opens at 95% of the tokens used. Until `AZAR_TOKEN_SALES_LIVE=1` (Navid's switch) only the numbers in
  `AZAR_TOKEN_SALES_TEST_NUMBERS` may buy, and billing uses the Zarinpal sandbox.
- Tokens are credited only after billing has verified the payment, once per order (ledger `pack_bought`,
  idempotency `order:<id>`); a lost notice is caught up when the app asks for the order's status.
- Orders left unpaid expire after 30 minutes. Admin: `GET /admin/users/:id/purchases`.

**Reason**: Amin #5245; plan approved by the brain.

**Affected modules**: azar-auth `purchaseRoutes.js`, `index.js`, `licenceRoutes.js`, `adminRoutes.js`; kssx-billing 0.41.0;
kss-pricing 0.38.1.

**Migration requirements**: new azar-auth table `token_orders` (created on start); billing migration 038.

**Tests**: `server/test/purchase.test.js` (6).

## 2026-10-25 — Token purchase in the app (#5245; for 1.5.3, not released)

**Change**:
- Settings › token card: once 95% is used, a «خرید توکن» button. The app asks the server whether buying is open; while
  it is not (no price or VAT answer in kss-pricing, not open for this account), the button is off with the reason.
- New page «خرید توکن» (`BuyTokensScreen`): the server's price per token, the count, the price without VAT, the VAT and
  the total; «تأیید و پرداخت» opens the bank's page; back in the app, it asks the order's status and shows the receipt
  (tracking number, date and time, tokens, VAT, amount paid). Sandbox payments say «پرداخت آزمایشی».
- «رسیدهای خرید» in the token details (when something was bought) opens the receipts of earlier purchases.
- Token details: «کسر توسط پشتیبانی» line when support took tokens off (#5243).
- One key per buying attempt (Idempotency-Key): a retry never makes a second order.
- The page after the bank has «بازگشت به اپ ایوان», which opens the app through a new `eyvan://paid` link (Chrome opens
  apps only through a browsable link); the receipt just shown is not repeated in the list below it. Checked end to end on
  the emulator against a local stack (pricing with a test price, billing, azar-auth).
- The bank returns the buyer to kssx.ir only (Amin #5135: no other domain in front of users): nginx snippet
  `server/deploy/nginx-kssx-eyvan-pay.conf` (live as /etc/nginx/snippets/kssx-eyvan-pay.conf) passes
  `kssx.ir/pay/eyvan/api/v1/eyvan-pay/callback/<id>` to billing and serves `kssx.ir/pay/eyvan/done` from azar-auth's page.
  The api.zarandix.ir relay stays only as a fallback for payments started before the switch.

**Reason**: Amin #5245, #5243.

**Affected modules**: `BuyTokensScreen`, `TokenCard`, `SettingsScreen`, `tokenPurchase`, `tokenLedger`, `syncApiClient`,
`SyncService`, `AuthProvider`, `MainNavigator` (screenshots allowed on the page: it is in Settings, #5162).

**Migration requirements**: none.

**Tests**: `BuyTokensScreen.test.tsx` (4), `SettingsScreen.test.tsx` (+3), `tokenLedger.test.ts`.

## 2026-10-27 — 1.5.6 (part 2): search, advanced search, contracts, photos, district, announcements

**Change**:
- Search (Amin #5368): files and applicants match every typed word against deal type, property kind, city, district,
  address, description, barter items, owner/applicant name, phone and every amount; Persian digits and thousands
  separators are accepted (`searchTerms`/`likeAllTerms`). In the search box a number longer than five digits is
  grouped in threes, a shorter one or a phone number stays plain (`formatSearchNumbers`). Contracts are searched by
  tracking code, amount and note too.
- Advanced search (the filter sheet, now «جست‌وجوی پیشرفته»): city, bedrooms, floor area and price-or-deposit for
  files; city and bedrooms for applicants, beside the existing deal type, kind, budget and status.
- A search with no hits shows «موردی یافت نشد» with «پاک کردن جست‌وجو», never «nothing saved yet» (Amin #5407).
- «قرارداد تازه» on the contracts list opens the contract form (it opened the deals list); the file and the applicant
  are picked there with a searchable `RecordPicker` (Amin #5408). A barter applicant names what they offer
  (`BarterPicker`, same categories as a barter file).
- Photos can be removed, reordered and added on a file's and a contract's edit page (`useEditablePhotos`, Amin #5352).
  The gallery is Android's photo picker with several pictures at once, up to 10 (`AzarImage.pickImages`); photo tiles
  are measured squares; the note under them is gone (Amin #5416).
- «منطقه» beside the city on one row for files and applicants; the applicant's city moved to «چه می‌خواهد». Description
  and note fields are two lines tall (`TextInput multiline`) (Amin #5416).
- Photos are made at most 1280 px on the long side at WebP quality 72 (was 1600/80), so they take fewer tokens
  (Amin #5433). Checked on the server: Amin's file ae6354e7 held 10 real WebP photos (700–1200 px wide, 1,138,502 B)
  and was charged once, 144.678 tokens = (photos + record) / 1000 × 0.127; nothing was charged twice.
- «یادآوری‌ها» is «اعلان‌ها»: KSS announcements (server `/announcements`) on top, coloured by tone, × dismisses one for
  good; the reminders follow (Amin #5370).
- Home: name from the profile and updated after Settings, avatar opens the profile, no follow-ups list; Settings: no
  phone under the name, invite card and token card show the 150-token gift; smoother tab slide; a new reminder shows
  at once; smaller checkbox; no duplicate follow-up in an applicant's activity (Amin #5406, #5409–#5415, #5417, #5351).

**Reason**: Amin #5351, #5352, #5368, #5370, #5406–#5417 (brain order for 1.5.6).

**Affected modules**: list screens, `PropertyRepository`, `ApplicantRepository`, `persianText`, `ListToolbar`,
`CreateContractScreen`, `ContractListScreen`, `RecordPicker`, `BarterPicker`, `PhotoEditor`, `useEditablePhotos`,
`listingPhotos` + `AzarImageModule.kt`, `TextInput`, forms, `ReminderListScreen`, `AnnouncementCard`,
`useAnnouncements`, `AuthProvider`, `syncApiClient`; server `tokens.js` (summary `referralBonus`), `exportAccount.js`.

**Migration requirements**: 0022 adds `region` to properties and applicants and `barter_items`/
`barter_other_description` to applicants (all NULL on old rows; sync copies every column).

**Tests**: jest in CI (repositories, persianText, CreateApplicant/CreateContract/detail screens, AnnouncementCard,
listingPhotos, migrations); server `node --test`.

## 2026-10-27 — 1.5.6: money fields keep the caret, name step, sign-up by the inviter's mobile

**Change**:
- Money fields (MoneyInput) put the thousands separators back after every key, which replaced the whole text and
  dropped the caret at the start when a digit in the middle was deleted (Amin #5349). The caret is now found from what
  changed, kept by the count of digits before it and set back through `selection`; deleting a separator deletes the
  digit before it. `TextInput` passes `selection`/`onSelectionChange` through. Other fields were checked on the
  emulator (typing and deleting in the middle keep the caret).
- After the number is confirmed, a new member first gives first name and last name (+ agency, optional) on
  `RegisterNameScreen` (Amin #5348); the invite page now holds only the code, the QR scan and a «کد دعوت ندارید؟» link.
- «کد دعوت ندارید؟» opens `InviterPhoneScreen`: the mobile number of the colleague who invited them (Persian digits
  accepted, own number refused). The server's `/auth/register` accepts a mobile in the code field, finds that member
  (stored as +98… or 09…), records them as referrer and stores their code as `used_referral_code`; an unknown number is
  `invalid_inviter_phone` (Amin #5344).
- #5341 (hint and caret on the left in «دعوت با پیامک») was the alignment fixed in 1.5.5.

**Reason**: Amin #5341, #5344, #5348, #5349 (brain order for 1.5.6).

**Affected modules**: `MoneyInput`, `TextInput`, `RegisterNameScreen` (new, + test), `InviterPhoneScreen` (new, + test),
`ReferralCodeScreen` (+ test), `OtpVerificationScreen` (+ test), `AuthNavigator`, `PhoneEntryScreen` (exports),
`errors`, `httpAuthApiClient`, `validationText`; server `authRoutes.js` (+ `test/inviterPhone.test.js`); version 1.5.6 /
versionCode 13.

**Migration requirements**: none (server change is additive).

**Tests**: jest in CI; `node --test test/inviterPhone.test.js`; emulator.

## 2026-10-26 — 1.5.5: fields start on the right; applicants with several deal modes

**Change**:
- Every text field is right-aligned again, so tapping an empty field puts the caret at the right, not at the end of
  the grey hint, and a tap in typed text lands where it is (Amin #5328). The cause was `theme.typography`'s
  `textAlign: 'left'` (meant for `<Text>`, which Android swaps under RTL) beating the input's `textAlign` prop; the
  app-wide `FontText` input wrapper now puts the field's own prop last.
- An applicant can want خرید, رهن و اجاره and تهاتر together, chosen like a file's deal kinds (Amin #5327). Each
  mode asks its own field: buy/barter a budget, رهن و اجاره a رهن or اجاره. Kept in `preferred_transaction_type`
  joined with «، »; an existing single type (incl. «اجاره») reads as the one chosen mode, so no migration and nothing
  lost. Matching takes a file offered for any of the modes; the budget fits if it fits for a shared mode (price for
  buy/barter, the applicant's رهن for رهن و اجاره, or the old budget-vs-deposit for an applicant who only rents). The
  applicants list filter shows a multi-mode applicant under each mode; the deal page's contract button reads all modes.

- Copy, cut and paste work again in every field (the field menu is back), in the app and on the web; the page
  itself still cannot be copied (Navid, 2026-10-26, reversing the field part of Amin #5199).

**Reason**: Amin #5327, #5328 (brain order for 1.5.5); Navid 2026-10-26 (copy/paste in fields).

**Affected modules**: `FontText`, `TextInput`, `ListToolbar`, `RangeFilter`, `web/src/guards.ts`, `dealKinds` (+ test), `ApplicantForm`, `applicantValidation` (+ test),
`matchingService` (+ test), `ApplicantListScreen`, `DealDetailScreen`; version 1.5.5 / versionCode 12.

**Migration requirements**: none.

**Tests**: jest in CI; emulator check of the profile fields (caret on the right) and the applicant form.

## 2026-10-26 — 1.5.4: the right version number, quicker update checks

**Change**: 1.5.3 shipped with `APP_VERSION` still at 1.5.2, so a 1.5.3 phone keeps offering 1.5.3 as an update.
The version now has one source: package.json (`appVersion.ts` reads it, `build.gradle` versionName reads it).
The update check runs again whenever the app comes back after 10 minutes (was an hour), so a phone that keeps the
app open sees a new version sooner. Checked on the emulator: 1.5.2 → «نسخهٔ تازه آماده است» for 1.5.3 within
about 90 s of launch.

**Reason**: Amin #5325.

**Affected modules**: `shared/appVersion.ts`, `app/UpdateChecker.tsx`, `android/app/build.gradle`, `package.json`.

**Migration requirements**: none.

## 2026-10-25 — 1.5.3: contract kinds, contract delete, pinned add buttons, round tab pill

**Change**:
- Contracts are for «خرید و فروش», «رهن و اجاره» or «تهاتر» (a three-way choice instead of the free field); the
  end-of-contract calendar reminder is offered and kept only for «رهن و اجاره» (a contract changed to another kind
  loses its reminder). Corrects #5240.
- Deleting a contract (contract page, with a confirm step) also removes its calendar reminder and photos; the server
  writes `contract_delete` to the audit log when the deletion syncs.
- Home: the «فایل ملکی» and «متقاضی» buttons stay fixed just above the tab bar; the page scrolls behind them.
- The selected-tab pill has round corners on every Android build (radius 16, not 9999).
- Amin #5299: no text in the system font. `babel.config.js` points every `Text`/`TextInput` from 'react-native' in src/
  at `shared/components/FontText` (Vazirmatn in the style's weight when the style names no font); the Android theme
  sets Vazirmatn for native dialogs, pickers and menus (`res/font/vazirmatn.ttf`).
- Amin #5301/#5302: the phone page shows only the field «لطفا شماره خود را وارد کنید» and the button (plus the logo);
  the number takes Persian/Arabic digits, at most 11, and the button turns on only at a valid 09xxxxxxxxx. The server's
  send-otp accepts only +989xxxxxxxxx or 09xxxxxxxxx.
- Amin #5298/#5308: «شخصی‌سازی» is a Settings row (like «یادآوری‌ها» and «این گوشی») that opens its own page: the app
  colour — سرمه‌ای (default), آبی, ذغال‌سنگی — and «حالت نمایش». Blue has light and dark sides, charcoal is dark
  only. The choice is kept on the phone (`AzarAppearance.setPalette`) and the system bars take the theme's page
  colour (`setBars`). Palettes in `shared/theme/palettes.ts`.
- Amin #5314: the «ذخیره روی سرور» row is gone from Settings (syncing and its tokens work as before).
- Amin #5315: «آفلاین» (the «این گوشی» badge and the home offline line) in dark grey (`onTertiaryContainer`, light grey
  on dark), on the neutral container.

**Reason**: Amin #5295, #5296, #5297.

**Affected modules**: `ContractForm`, `CreateContractScreen`, `ContractService`, `contract/types`, `DashboardScreen`,
`MainNavigator`, `server/src/syncRoutes.js`.

**Migration requirements**: none.

**Tests**: `ContractService.test.ts` (+1), `ContractForm.test.tsx`, `ContractDetailScreen.test.tsx`.

## 2026-10-25 — KSS test account for Amin (server)

**Change**: Numbers in `AZAR_TEST_OTP_NUMBERS` are KSS test accounts: fixed code 123456, `test: true` in the admin
user list and detail (billing leaves them out of the sales numbers), and no nightly backup. (شماره‌ی آزمایشی) got a free
licence for a year and a seeded set pushed through `/sync/push`: 20 files (sale, رهن و اجاره, barter, mixed) and
15 applicants (buy, rent, barter) in Tehran and Karaj, 6 deals at different stages and one رهن و اجاره contract,
with high, mid and under-70 matches.

**Reason**: Amin #5292.

**Affected modules**: `server/src/sms.js` (`isTestNumber`), `authRoutes.js`, `adminRoutes.js`, `nightly.js`.

**Migration requirements**: none.

**Tests**: server suite (33).

## 2026-10-25 — Start page texts (1.5.2)

**Change**: The start page reads «به جمع حرفه‌ای‌ها خوش آمدید», with the rows «ثبت آسان و فوری فایل‌ها»,
«انطباق هوشمند», «سیستم پیگیری خودکار» and the button «شروع کنید», exactly as Amin wrote them.

**Reason**: Amin #5280.

**Affected modules**: `WelcomeScreen`.

**Migration requirements**: none.

**Tests**: `App.test.tsx`.

## 2026-10-25 — Nightly backups as plain, readable zips (server)

**Change**: The nightly job no longer encrypts. Each account's zip is the plain export layout (folders and files named
by property, applicant and contract; contracts readable), written to the root-only `/root/kss-backups/eyvan-nightly/`
(the service now runs as root and hands the database's -wal/-shm files back to azar-auth). The PC task uploads them to
the private Drive folder as before; retention unchanged. The backup key is removed; `--decrypt` is gone. Today's
encrypted set was trashed on Drive and re-uploaded plain.

**Reason**: Amin #5281.

**Affected modules**: `server/src/nightly.js`, `server/deploy/azar-nightly.service`, `install-nightly.sh`,
`tools/drive-sync/eyvan_backups.py` (B2B chain).

**Migration requirements**: none.

**Tests**: `server/test/nightly.test.js` (2).

## 2026-10-25 — Nightly backup of every account (server)

**Change**: At 00:00 Tehran time the VPS timer `azar-nightly` runs `server/src/nightly.js`: it purges accounts deleted
over 30 days ago, then writes one AES-256-GCM encrypted zip per account (same layout as the admin export, own key
`EYVAN_BACKUP_KEY`) to `/var/backups/eyvan-nightly/<date>/`. A Windows task on the office PC uploads pending days to the
personal Drive («EYVAN backups/<date>») and marks them uploaded, so the Google sign-in never sits on the server.
Retention 14 daily + 8 Sundays on both sides. `GET /admin/backups` shows each day's state.

**Reason**: Amin #5197.

**Affected modules**: `server/src/nightly.js`, `server/deploy/azar-nightly.{service,timer}`, `install-nightly.sh`.

**Migration requirements**: none (table `admin_backups` already exists).

**Tests**: `server/test/nightly.test.js` (2).

## 2026-10-25 — EYVAN on iPhone: the web app at app.kssx.ir (#5183)

**Change**: `web/` builds the same app (`src/`) with react-native-web + Vite. Native modules have browser stand-ins
(`web/src/shims/`); where a module differs as a whole, a `*.web.ts(x)` sits next to the Android file (Metro ignores
it). Server calls go to `app.kssx.ir/api/…`, which nginx passes to azar-auth on the same machine, so no other domain
shows. Contract reminders become a `.ics` file for the phone's calendar. Installed from Safari with «Add to Home
Screen» (a guide shows first). Amin #5199 on the web: no selecting/copying/menu/printing, the screen is covered when
the app leaves it; screenshots cannot be blocked in a browser.
Also for Android: Settings asked the server for the token ledger on every 3-second sync tick (the function changed
with each tick); it is now asked when the sync state changes, on focus, and once at start. The wide «+ فایل تازه»
button uses `width: 'auto'` (the web kept 56 px).

**Reason**: Amin #5183 (plan approved by the brain), #5199.

**Affected modules**: `web/*`, `src/**/*.web.ts(x)`, `AuthProvider` (getTokenLedger), `FloatingActionButton`,
`TextInput` (web-only alignment), `server/deploy/nginx-app.kssx.ir.conf`, `server/deploy/deploy-web.sh`.

**Migration requirements**: none.

**Tests**: checked live on app.kssx.ir with the test number: sign-in, files from the server with photos, a new file
through the 6-step wizard pushed and deleted, privacy cover, copy/menu blocked, photo conversion 3000×2000 → 1600 WebP.

## 2026-10-25 — 1.5.2: deal page order (Amin #5274), one version with the purchase items

**Change**: On the deal page the property-file and applicant cards come first, above «مسیر معامله»; «پیشرفت»,
«موفق» and «ناموفق» sit side by side on one row, with «مرحلهٔ بعد: …» under them. 1.5.2 (not published yet) now also
carries the token purchase screen, the eyvan://paid return, the single receipt and the kssx.ir bank return, so they
ship as one version.

**Reason**: Amin #5274; brain 2026-10-25 (one version).

**Affected modules**: `DealDetailScreen` (+ test).

**Migration requirements**: none.

**Tests**: `DealDetailScreen.test.tsx` (advance uses «پیشرفت», checks the next-stage line).

## 2026-10-27 — 1.5.6 (part 3): online / last seen (Amin #5454); the gallery picker's native side

**Change**: `users.last_seen_at` (server/src/presence.js) is bumped at most once a minute on any signed-in call
(sync, tokens, licence, announcements, purchase) and by `POST /presence`, which the app sends every 2 minutes while
it is on screen (AuthProvider). `GET /admin/users` returns `lastSeenAt` (ISO or null); billing shows «آنلاین» for
the last 5 minutes. Nothing else about the visit is stored.

**Fix**: the 1.5.6 build sent as #5536 lacked `AzarImageModule.pickImages` (the Kotlin side of #5416 was left
uncommitted), so picking several photos from the gallery would have failed. 1.5.6 is rebuilt with it.

**Offline (Amin #5455)**: data already lives on the phone in the encrypted database and changes queue until the
connection is back; proposed for 1.5.7 after his OK: a visible «بدون اینترنت» badge with the queued-change count
and a full offline pass over every screen.

## 2026-10-27 — 1.5.7 (part 1): offline view (Amin #5524), one font source (Amin #5543), one-step publish (Amin #5540)

**Offline view**: the encrypted device store keeps a `copy` of the account's files as the server last sent them
(`DeviceStore.keepCopy` on every restore, `applyToCopy` after every confirmed push, `clearCopy` on sign-out, on a
revoked session and when another number claims the phone). `loadInto` puts the copy under the unsent changes at
launch, so a restart without internet shows the files; new edits offline queue and sync as before.
`OfflineFilesNotice` says «بدون اینترنت؛ آخرین نسخهٔ ذخیره‌شده (…) نمایش داده می‌شود» with the queued-change count
whenever the phone is offline (useNetInfo). Listing photos are not in the copy yet (fetched online only).
Reverses part of option A (#4826: "nothing of the files stays on the phone between launches") on Amin's 🤝 #5524.

**Fonts**: the web build now runs the same FontText swap as the phone build (`babel-app-font.js`, shared by
`babel.config.js` and `web/vite.config.ts`); before, texts with no font of their own showed in the browser's
system font. `fontToken.test.ts` fails the build on any font name outside `theme/tokens.ts`. design-system.md §2
states the rule. Also found: the web build was blank since 1.5.4 (`require('../../package.json')` in appVersion.ts;
browsers have no `require`); now an import. Not live (app.kssx.ir is not enabled), so no user saw it.

**Publishing**: `scripts/publish-apk.sh <version> <apk> "<notes>"` uploads the install file, links
kssx.ir/dl/eyvan.apk AND rewrites update.json in one step (backups first, sha256 checked on both URLs), so every
installed copy offers the update within 10 minutes. 1.5.6 was not in update.json because it was not published yet
(waiting for Amin's OK), not because of a fault.

## 2026-10-27 — 1.5.7 (part 2): Amin #5554, #5557, #5561, #5563, #5565

- **#5554**: the «به ازای هر دعوت، … توکن ظرفیت بیشتر» line under the token bar is gone (TokenCard).
- **#5557**: advanced search is a full page (FilterSheet → full-screen Modal; the sheet's responder stopped its body
  scrolling). Search reads «N خوابه / N اتاق» as rooms = N and «N متری» as area (±5%; an applicant's wanted range
  must hold it) — `parseSearch` / `likeAllTerms(columns, query, fields)`; «3خوابه» without a space works too.
- **#5561**: list and detail hooks keep what is on screen while they refresh (`hasLoaded` ref): no spinner swap, so
  cards no longer jump when a tab comes back.
- **#5563**: the invite page no longer fills a code from the clipboard — that is how Amin's own code became a new
  member's referrer. One field takes the inviter's code OR mobile (09…, Persian digits too); own number refused.
- **#5565**: the name comes first: Welcome → name → number → code → invite page (a new account keeps the name).
- versionCode 14.

---

## 2026-10-27 — 1.5.7 (part 3): photo add on real phones (Amin #5587, #5599)

**Change**: «افزودن عکس انجام نشد» on Amin's phone with 1.5.6. The emulator (Android 14) added photos from the
gallery and the camera with the same file, and the server saw no upload, so the failure is on the phone before any
upload. Account history shows Amin's photos uploaded fine on 1.5.5, which used the document picker. 1.5.6 sends phones
below Android 13 to the gallery app (GET_CONTENT), whose answers some gallery apps give without the right to read them.
Fixes in `AzarImageModule.kt`:
- below Android 13, and wherever the system photo picker is missing, the document picker (ACTION_OPEN_DOCUMENT, what
  1.5.5 used) instead of GET_CONTENT;
- a picture BitmapFactory cannot read (some HEIF/HEIC shots) goes through ImageDecoder;
- reading errors come back as codes (`no_access`, `not_found`, `too_big`, `convert_failed`); out of memory no longer
  closes the app;
- a gallery or camera answer that never came back no longer blocks every later try with «busy»;
- `getPickImagesMaxLimit` is guarded.
In JS, a picture that cannot be read is skipped and the rest are added (`pickPhotos`). The message now ends with
«(کد: …)», so the next report from a phone names the cause (`photoErrorCode`).

**Affected modules**: android AzarImageModule, infrastructure/images/listingPhotos(.web), features/photos/PhotoAddButton.

**Migration requirements**: None.

**Tests**: listingPhotos.test.ts: a skipped unreadable picture; the code of a failure.

---

## 2026-10-27 — 1.5.7 (part 4): notifications page design (Amin #5608)

**Change**: Amin found the notifications page plain. Each reminder is now a card:
- a coloured edge and round icon by kind (تماس = info/phone, بازدید = success/building, یادآوری = primary/bell, all
  from design tokens), and the kind's name;
- a clock beside the time;
- an open reminder has a dot and a bold title; a passed open one turns red with «عقب‌افتاده»; a done one fades, is
  struck through and says «انجام شد».
With no reminders for today, the page shows only a grey line «امروز یادآوری‌ای ندارید» (above any later ones). The old
empty-state block is gone, and the add button is always shown.

**Affected modules**: features/reminder/components/ReminderListItem, features/reminder/screens/ReminderListScreen.

**Migration requirements**: None.

**Tests**: ReminderListItem (kind label, overdue, done); ReminderListScreen (grey line when empty and when nothing is
today, add button when empty).

---

## 2026-10-27 — 1.5.7 (part 5): why this phone was signed out (Amin #5645), left corners (#5634)

**Change**: Amin found that leaving the app «seems to log out». The app never signs out on close or in the
background. It signs out only when the server answers `session_revoked`, because another phone signed in with the
same number (one phone per account, AZAR-SYNC-001). The server log shows exactly that: the test number
(شماره‌ی آزمایشی) was used by Amin's phone and by KSS's emulator at the same time, and each emulator sign-in signed his
phone out. From now on KSS's emulator tests do not use that number while Amin uses it. In the app, the start page now
says once why the phone was signed out («با این شماره روی گوشی دیگری وارد شده‌اید…», `signedOutNotice.ts`), so it never
looks like a random logout. Reminder cards' left corners have radius 2 (#5634).

**Affected modules**: features/auth (AuthProvider, signedOutNotice, WelcomeScreen), reminder/ReminderListItem.

**Migration requirements**: None.

## 2026-10-27 — 1.5.8 (part 1): «ورود آگهی از دیوار» (Navid's order)

**Change**: A Divar post becomes a new file. In Divar, «اشتراک‌گذاری» → ایوان (EYVAN is now a share target for text:
`AzarShareModule` + an `ACTION_SEND text/plain` filter), or paste the post's link in the new box on the first step of
«فایل ملکی تازه». The server (`POST /divar/import`, `server/src/divar.js`) reads only that one post from the public
JSON Divar's own web page loads (`api.divar.ir/v8/posts-v2/web/<token>`): title, type, sale price or deposit/rent,
area, rooms, city, district, description, amenities, year built, floor and photo addresses. The form is filled
(year, floor and amenities lead the description), the photos are downloaded on the phone and converted to WebP as
always; the broker checks and saves.

**Rules**: no crawling, no lists, no login; one post cached an hour; 30 imports per account per hour + 20 requests per
minute per address; 8 s timeout; clear Persian errors (not a Divar link, post gone, Divar not answering, tokens short).
Price = kss-pricing `eyvan_divar_import_tokens`; empty = the import is off (Amin #4302, no fallback). Charged as
ledger reason `divar_import`, once per post per account per day.

**Tests**: `server/test/divar.test.js` (parser on Navid's #5653 post), `server/test/divarImport.test.js` (route),
`src/features/property/services/__tests__/divarImport.test.ts` (form mapping).

## 2026-10-27 — 1.5.8 (part 2): company logo at the foot of Settings (Amin #5715)

**Change**: «kssx.ir» under «ایوان، برنامه‌ای از خیام صنعت شریف» is replaced by the company's mark (src/assets/kss-logo.webp,
40 px, white background removed so it reads on day and night) beside «خیام صنعت شریف»; the whole block still opens
the company site.

## 2026-10-27 — 1.5.8 (part 3): full-app check fixes (Amin #5716)

- Sync: after a failed round the timed retries wait 6 s, 12 s, 24 s, 48 s, then once a minute (was every 3 s forever,
  a full pull each time while the files had not loaded) — a server hiccup is no longer hammered by every phone. A
  manual sync (Settings) still runs at once. Failed rounds are logged in development builds.
- Divar import: a barter post's own words («قابل تهاتر با … زمین، خودرو، مسکونی») pre-select the barter items, so the
  barter step is not left empty; the token card lists «ورود آگهی از دیوار» in its breakdown.
- Web dev only: the dev fetch guard no longer counts photo uploads (a saved file with 9 photos tripped it).

## 2026-10-27 — 1.5.8 (part 4): black photo screen (Amin #5737), update check on every open (#5727)

- Tapping a photo on a file's or contract's page opened a black screen: the full-size viewer was a horizontal pager,
  and in the right-to-left app its pages ran from the right while the start offset counted from the left, so it opened
  on an empty page. Now the tapped photo is shown alone, with «قبلی / بعدی» buttons and «۵ از ۹».
- The update check runs on every return to the app (a return within 30 s excepted), not after 10 minutes away.

## 2026-10-27 — 1.5.9: sign-in asks the number first (Amin #5745)

- «شروع کنید» opens the number page (was the name page, #5565). After the code, a number that has an account signs in
  at once: no name page. Only a number with no account goes on to «معرفی خودتان» (first/last name, agency optional),
  then the invite page.
- Whether an account exists is told only after the code is confirmed (the server's existing «no account» answer to
  sign-in), so nobody can try numbers to learn who has an account. No server change.
- Amin #5746: «ادامه» on the name page was a grey, dead button until both names had two letters, with no word on
  why (typical: the whole name typed in «نام» and «نام خانوادگی» left empty, or the keyboard's ✓ tapped, which did
  nothing). Now the button always answers: what is missing shows in red under the field; a whole name in «نام» with
  an empty last name is split at its first space; the keyboard's ✓ on either name field continues too.

## 2026-10-27 — 1.5.10: home greeting (Amin #5749)

- Home's top line: «سلام، [نام]» from 05:00 to 18:00, «شب بخیر، [نام]» otherwise (was صبح/عصر/شب بخیر).
- The first time Home opens between 01:00 and 04:00 on a day, one random line stands in for the greeting for that
  visit: «گرگ‌ها در شب شکار می‌کنند!» / «هنوز توی میدونی؟» / «شب بخیر؟ هنوز زوده!» / «بیداری؟ ایوانم بیداره!».
  The day it was shown is kept on the phone, so it appears once a night.
- Amin #5782: the foot of Settings shows his full company logo (mark + «خیام صنعت شریف / KHAYYAM SANAT SHARIF», from
  his Drive file «KSS Full Logo.svg») in grey: one-colour SVG drawn with react-native-svg in the theme's
  onSurfaceVariant, so it reads on day and night. Replaces the small WebP mark + text line (#5715).
- Amin #5795: «ورود آگهی از دیوار» is off until the user turns it on. Settings gets «اتصال‌ها و API‌ها» (a page like
  «شخصی‌سازی»), with the Divar switch; turning it on shows Amin's wording verbatim and «می‌پذیرم / انصراف». The server
  keeps every turn of the switch (user, time, on/off, the exact words agreed to; append-only table divar_consents,
  POST /divar/consent and /divar/consent/status) and refuses /divar/import without it (403 consent_required). The
  paste field on a new file shows only when it is on; a post shared from Divar while it is off opens the
  «اتصال‌ها و API‌ها» page with a line saying to turn it on first.
- Amin #5806: the logo is grayscale, not one flat grey — each original colour becomes its own grey by luminance, so
  the K keeps its shading; darker tones on the light theme, lighter ones (same order) on the dark theme.
