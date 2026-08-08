# AZAR Content Style Guide

Status: DRAFT — authoritative for all future user-facing copy. Applies to
every string a user reads: buttons, labels, placeholders, validation
messages, errors, success messages, notifications, dialogs, empty states,
onboarding, backup/restore messages, matching explanations, contract
reminders — and, by extension, to the tone of our own product
documentation (this file included).
Date: 2026-08-08

This guide does not change any product behavior, does not touch the
approved design system (`/docs/ui/design-system.md`), and does not modify
application code. It sets a language-quality bar and a shared vocabulary,
so text written next month sounds like it was written by the same person
who wrote the restore flow today.

---

## 1. The one question that matters

Before any string ships, ask:

> اگر این متن را یک کاربر واقعی در یک اپلیکیشن حرفه‌ای ببیند، آیا احساس
> می‌کند یک انسان آن را نوشته است؟

If the answer is no, don't swap a word or two — rewrite the sentence. Word
substitution on a bad sentence usually just produces a differently bad
sentence.

A few things that reliably fail this test:

- A sentence that states a fact but not what it means for the user
  ("Operation failed.")
- A sentence missing its second half ("Unable to restore. Please try.")
- A literal word-for-word Persian translation of an English UI convention
- A message that exposes how the app works internally instead of what
  happened to the user's data
- Marketing language nothing in the product actually backs up ("intelligent
  analysis," "revolutionary," "ensures high-precision recommendations")

---

## 2. Terminology glossary (Persian)

One concept, one term, every time. Mixing synonyms for the same thing reads
as several different writers, not one voice.

| Concept | Use | Don't use | Notes |
|---|---|---|---|
| Owner's property record | **فایل مالک** | ملک مالک، پرونده مالک | "ملک" is the property itself; "فایل" is the record we keep about it — keep that distinction. |
| Applicant's requirement record | **فایل متقاضی** | پرونده متقاضی، درخواست متقاضی | Same pattern as above. |
| A record in general (owner or applicant) | **فایل** | پرونده، رکورد | "پرونده" reads as a legal/administrative file, not the tone we want. |
| Lease/tenancy contract | **قرارداد** | توافق‌نامه، عقد | — |
| The person a referral code came from | **معرف** | ریفرال، دعوت‌کننده | — |
| A local copy of the user's data for safekeeping | **نسخه پشتیبان** | بکاپ، فایل پشتیبان‌گیری | "بکاپ" is common informal usage but reads as a loanword dropped mid-sentence; write it out. |
| The action of writing a backup back onto the device | **بازیابی** | بازگردانی (as a noun), ریستور | Use **بازیابی** as the noun/process name ("بازیابی اطلاعات"); "بازگردانی" is fine only inside a verb phrase describing the *replace* step specifically ("بازیابی و جایگزینی" is the one place both appear together, intentionally — see §6). |
| One weighting a requirement has (MUST_HAVE etc.) | **معیار تطبیق** | فیلتر، شرط | — |
| A scheduled contract-expiration notice | **یادآوری** | اعلان، نوتیفیکیشن | Reserve "اعلان" for the OS-level notification itself if that distinction ever needs to be drawn; in-app copy says "یادآوری." |
| The property itself (as a physical thing, not the record) | **ملک** | خانه، آپارتمان (unless genuinely specific) | — |
| A prospective tenant/buyer | **متقاضی** | مشتری، درخواست‌دهنده | — |

If a new concept needs a Persian term that isn't in this table yet, add it
here in the same pass you introduce it in the UI — don't let usage
outrun the glossary.

## 2a. Forbidden terminology (both languages)

These are banned outright, not because the words are bad Persian or bad
English, but because they claim product behavior that doesn't exist or
contradicts an explicit product decision:

- Cloud Sync / همگام‌سازی ابری
- Smart Analysis / تحلیل هوشمند
- AI matching / تطبیق هوشمند با هوش مصنوعی
- AES-256 (or any specific algorithm named in user-facing copy)
- Server backup / پشتیبان‌گیری سروری
- Email alerts / push notifications (as product claims — this is a
  local-first, on-device product; don't promise delivery channels it
  doesn't have)
- Team / brokerage / Global Realty Group / Team Directory (this is a
  single-agent tool; no multi-user or organizational language)
- "Smart" as a feature qualifier implying AI (e.g. a screen titled "Smart
  Requirements" when the underlying feature is a deterministic,
  user-configured priority list — rename to what it actually is:
  "Applicant Requirements")
- Marketing superlatives with nothing behind them: "revolutionary,"
  "game-changing," "ensures high-precision," "intelligent," "powered by AI"

## 2b. Technical terms that must not leak into user-facing copy

The user never needs to know how we store or move their data to understand
what's happening to it. Translate implementation into consequence:

| Don't say | Say instead |
|---|---|
| "Encrypting local database…" | "Encrypting your data…" |
| "Writing to the local database" | "Applying your backup" / "Saving your changes" |
| database, SQL, schema, backend, API, token, synchronization engine | (omit — describe the user-visible effect, not the mechanism) |
| "encryption algorithm" (naming a specific one, e.g. AES-256) | "your backup is protected with a password" — name the *property* (it's encrypted, it needs a password), not the *implementation* |

Exception: a dedicated Settings → Security screen may describe *that data
is encrypted at rest* as a factual, user-relevant claim ("Your data on this
device is encrypted") — that's a property the user benefits from knowing.
It still should not name the algorithm, key size, or KDF.

---

## 3. Natural Persian — what "natural" actually means here

Persian UI copy should read like something written *in* Persian, by
someone who thinks in Persian, not like an English sentence run through a
formula. Concretely:

- **Don't mirror English sentence order.** English fronts the subject/verb;
  Persian often reads better with the consequence or the object first. If a
  Persian sentence sounds like it's translating an English sentence in
  your head as you read it, restructure it.
- **Avoid unnecessary formal/administrative verbs.** "انجام پذیرفت,"
  "صورت گرفت," "می‌باشد" — these read like a government form, not a phone
  app. Prefer plain, direct verbs: "انجام شد," "شد," "است."
- **Don't translate English idioms literally.** "Are you sure?" is not
  «آیا مطمئن هستید؟» in a well-written app — it's a restated consequence
  ("این کار غیرقابل بازگشت است" / "اطلاعات فعلی جایگزین خواهد شد"), because
  the real question isn't the user's certainty, it's whether they
  understand the outcome.
- **Use ZWNJ (نیم‌فاصله) correctly.** می‌شود, نمی‌تواند, داده‌ها,
  پشتیبان‌گیری — never a plain space in these compounds, and never a
  fully joined word either.
- **Prefer the term already in the glossary (§2)** over a synonym that
  happens to fit the sentence better stylistically. Consistency beats local
  elegance here.

---

## 4. UI copy must answer the user's actual situation

Generic-but-technically-correct copy is still a failure. A message earns
its place on screen by answering, as needed by the situation:

1. **What happened.**
2. **What it means** for the user's data specifically — untouched, at
   risk, replaced, recoverable.
3. **What they can do next** — and if there's exactly one sensible next
   step, the primary button should be that step, named plainly.

Not every message needs all three — a success confirmation for something
low-stakes ("نسخه پشتیبان با موفقیت ایجاد شد.") doesn't need a "what's
next" clause because the next step is obvious from context. A failure
during a destructive-adjacent flow (restore) almost always needs all
three, because the user's anxiety at that moment is specifically "did I
just lose something," and the copy's job is to answer that directly.

Reference implementation: the restore safety-backup flow
(`design-system.md` §8.22) is the canonical example of this rule in
practice — every failure state in that flow says explicitly whether
existing data was touched, because that's the one fact a user in that
moment actually needs.

---

## 5. Error messages

Rules, not vibes:

- **Never blame the user.** "شماره موبایل واردشده صحیح نیست" (a fact),
  not «شما اشتباه وارد کردید» (an accusation).
- **Be specific about the failure**, not generic. "این نسخه پشتیبان
  خراب است و قابل بازیابی نیست" beats «خطایی رخ داد».
- **State the effect on existing data whenever the operation is
  destructive-adjacent.** If nothing was touched, say so — it's the
  single most reassuring sentence available in a restore/delete flow, and
  omitting it leaves genuine anxiety unaddressed.
- **Offer a next step when one exists.** "لطفاً فضای ذخیره‌سازی دستگاه را
  بررسی کنید و دوباره تلاش کنید" beats a bare "دوباره تلاش کنید" when we
  actually know a likely cause.
- **English fallback, if English copy is ever needed**: "Restore couldn't
  be completed. Your existing data on this device wasn't changed. Please
  try again." — not "Unable to restore. Please try."

---

## 6. Confirmations and destructive actions

- State the consequence in plain language before asking for confirmation —
  never a bare "Are you sure?" / «آیا مطمئن هستید؟».
- Name what's affected, specifically, when we know it: "۳ فایل مالک، ۵
  فایل متقاضی و ۲ قرارداد" beats "your data."
- If a safety mechanism exists (a safety backup, an undo window), say so —
  it's part of what makes the confirmation honest, not just alarming.
- **Buttons describe the action, not a yes/no vote.** The two buttons on a
  destructive confirmation are never «بله» / «خیر» or "Yes" / "No" — they
  name what pressing them does:
  - «بازیابی و جایگزینی» / "Restore & Replace" — not «بله»
  - «انصراف» / "Cancel" — not «خیر»
  - «حذف فایل» / "Delete File" — not «تأیید»

---

## 7. Loading states

- Name the actual activity, not a generic verb: «در حال ایجاد نسخه
  پشتیبان امنیتی…» beats «در حال پردازش…».
- If an operation genuinely completes in under roughly half a second, skip
  the loading message rather than flash one — a message that appears and
  vanishes before it can be read is worse than no message.
- Multi-step operations (safety backup → restore) get a message per step,
  matching the actual step in progress, not one generic message spanning
  the whole flow — this is also why the restore safety-backup flow is ten
  distinct screens rather than one screen with an internal state machine
  the user can't see.

---

## 8. Success messages

- Confirm specifically what happened: «نسخه پشتیبان با موفقیت ایجاد شد»
  beats «عملیات با موفقیت انجام شد».
- Skip the message entirely when the result is already visually obvious
  (e.g. an item disappearing from a list after deletion doesn't also need
  a toast saying "Deleted").
- In a multi-step flow, a success screen may also set up the next step
  ("در مرحله بعد از شما خواسته می‌شود…") rather than just confirming and
  stopping — this keeps the user oriented in *where* they are in the flow.

---

## 9. Button labels

- Name the action, not a generic affirmative. Prefer: ذخیره، بازگردانی،
  ایجاد نسخه پشتیبان، ادامه، بازگشت، حذف فایل، لغو.
- Avoid: OK، تأیید (alone, with no object), Submit، Process، Execute — all
  of these describe *that something happens*, not *what*.
- Keep labels short, but never at the cost of ambiguity. "ادامه" is fine
  when there's only one possible next step in context; "بازیابی و
  جایگزینی" is necessary, not verbose, when the alternative reading
  ("ادامه" alone) could be mistaken for something non-destructive.

---

## 10. Matching explanations — deterministic, not "smart"

The matching engine is a deterministic, criteria-based ranking system with
no AI or external model involved (see `/docs/matching/matching-architecture.md`).
Copy must never imply otherwise, even accidentally through word choice like
"smart" or "intelligent."

- Don't say: "Based on your preferences, our system suggests…" / «سیستم
  هوشمند ما پیشنهاد می‌کند…»
- Do say: «این نتیجه بر اساس معیارهای ثبت‌شده برای این فایل محاسبه شده
  است.» — it's accurate, and it's not less confident for being accurate.
- Screen/section titles should name what the feature does, not imply more
  than it does — "Applicant Requirements," not "Smart Requirements," for a
  screen that lets a user set MUST_HAVE/IMPORTANT/PREFERRED/IGNORE weights
  by hand.

---

## 11. Punctuation and formatting

### Persian

- Persian comma «،» and Persian question mark «؟» in Persian sentences —
  never the Latin `,` or `?`.
- Persian quotation marks «» for quoted terms inside Persian prose.
- Half-space (نیم‌فاصله, ZWNJ) in every compound that needs it: می‌شود,
  نمی‌تواند, پشتیبان‌گیری, داده‌ها. Don't use a plain space or omit it.
- A Latin term embedded in a Persian sentence (a filename, an English
  product term with no Persian equivalent) is wrapped `dir="ltr"` so it
  doesn't visually reverse, and is followed by ordinary Persian punctuation
  — don't switch to a Latin comma just because the preceding word was
  Latin.
- Colon «:» is used sparingly, mainly to introduce a short list or a
  labeled value ("وضعیت: فعال"), not as a dramatic pause.

### English

- Sentence case for body copy and most headings ("Confirm restore," not
  "Confirm Restore"), except where the Material 3 pattern in
  `design-system.md` §3 specifically calls for title case (button labels
  and top-level nav labels already follow title case consistently — keep
  that as-is, it's an established pattern, not an inconsistency to fix).
- Oxford comma in lists of three or more.
- No exclamation marks in error or destructive-confirmation copy — reserve
  emphasis for actual severity words ("cannot be undone"), not
  punctuation.

### Numbers, dates, phone numbers (both languages)

- **Prose counts** (item counts, day counts in running text): Persian
  digits in Persian UI — «۳ فایل مالک». English digits in English UI.
- **Currency, phone numbers, percentages, file sizes, version numbers**:
  always Western digits, even inside Persian prose, wrapped `dir="ltr"` —
  this already matches the RTL numeral rule in `design-system.md` §3.3 and
  is not changed by this guide, only restated here as a copy rule.
- **Dates**: written out with the month named, not a bare numeric date
  (`Oct 27, 2023`, «۲۷ اکتبر ۲۰۲۳» or the Persian calendar equivalent if
  the product later adopts one — not yet decided, out of scope here) —
  never `10/27/2023` alone, which is locale-ambiguous.
- **Phone numbers**: keep the format the user entered/expects for their
  locale; don't reformat silently in a way that could look like a
  different number.

---

## 12. RTL/LTR mixed-content rules

These restate `design-system.md` §3.2/§13's RTL rules from a copywriting
angle — the visual/layout rules live there; this is about the text itself:

- Any embedded Latin content in an RTL sentence (filenames, English brand
  terms, email addresses) is wrapped `dir="ltr"` so it reads left-to-right
  in place, without reversing the character order.
- Don't hand-translate a filename or technical identifier that shouldn't
  be translated (`backup_2023-10-27.enc` stays as-is in both LTR and RTL
  copy).
- Icons that carry directional meaning (back/forward arrows) mirror in
  RTL; icons that don't (a shield, a warning triangle, a checkmark) never
  do — this is a design rule (§13) but affects copy in that button labels
  should still make sense without relying on the icon's direction to
  disambiguate meaning.

---

## 13. Editorial pass — before anything ships

For every new or changed string:

1. Read it as if you're the user seeing it for the first time, mid-task,
   possibly anxious (restore/delete flows) or mid-distraction (a
   reminder).
2. Ask the question in §1.
3. Check it against §2 (terminology) and §2a/§2b (forbidden/technical
   terms).
4. Check Persian strings against §3 and §11 specifically — literal
   translation and punctuation mixing are the two most common failures.
5. If it's an error, success, loading, or confirmation string, check it
   against the matching section (§5-§9).

This guide is the source of truth for that pass going forward. Where a
future decision changes terminology or tone, update this file in the same
change that introduces the new copy — don't let the guide drift behind the
product the way `DESIGN.md`'s prose once drifted behind the actual token
values (see `design-system.md` §1 for that history).
