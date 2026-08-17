# AZAR CRM — Architecture Audit & Proposed Architecture (v1)

**وضعیت**: طبق دستور صریح فایل ورودی (§42)، این سند فقط **Audit +
Proposed Architecture + Data Model + Business Rules + UX Impact
Analysis** است. **هیچ کدی هنوز تغییر نکرده.** Screen Map جدید و
Implementation Plan بعد از تأیید این معماری تحویل داده می‌شوند.

برچسب‌گذاری طبق دستور فایل:
- `ASSUMPTION` = فرضی که من گرفته‌ام چون سند فعلی مشخص نکرده بود
- `PRODUCT DECISION REQUIRED` = تصمیمی که فقط شما می‌توانید بگیرید
- `FUTURE` = خارج از MVP

---

## A. Current Architecture Audit

### A.1 چیزی که واقعاً در کد وجود دارد (نه فرض — از migrations/repositories استخراج شده)

7 migration، 8 Entity واقعی:

```
User(id, phoneNumber, referralCode, createdAt, updatedAt)
Session(id, userId, createdAt, expiresAt, revokedAt)
ReferralRelationship(id, referrerUserId, referredUserId, createdAt) — write-once
Property(id, ownerId, title, propertyType, transactionType, city, address,
         price, area, rooms, description, status, createdAt, updatedAt)
Applicant(id, userId, fullName, phoneNumber, email, applicantType,
          preferredTransactionType, preferredPropertyType, city,
          minBudget, maxBudget, minArea, maxArea, rooms, description,
          status, createdAt, updatedAt)
Deal(id, userId, propertyId, applicantId, status, notes, createdAt, updatedAt)
Contract(id, userId, propertyId, applicantId, dealId, type, status,
         amount, startDate, endDate, notes, createdAt, updatedAt)
Reminder(id, userId, propertyId, applicantId, dealId, title, description,
         remindAt, isDone, createdAt, updatedAt)
```

(`email`/`applicantType` روی Applicant در حال حذف از UI هستند طبق
تصمیم فاز قبلی — ستون‌ها در DB می‌مانند، در ورودی همیشه `null` نوشته
می‌شوند.)

### A.2 مشکلات معماری شناسایی‌شده (واقعی، نه فرضی)

1. **Property = Property + Listing به‌صورت ادغام‌شده.** `propertyType`،
   `transactionType`، `price` مستقیم روی Property هستند. یک ملک نمی‌تواند
   دو Listing داشته باشد (مثلاً هم برای فروش هم برای اجاره آگهی شود) بدون
   رکورد Property تکراری.

2. **Contact وجود ندارد.** `Applicant` تنها مدل انسانی سیستم است و فقط
   نقش «خریدار/مستأجر بالقوه» را پوشش می‌دهد. برای مالک ملک هیچ رکوردی
   نیست — `Property.ownerId` در واقع **شناسه‌ی کاربر CRM (مشاور/Agent)
   است، نه مالک واقعی ملک**؛ این یک نام‌گذاری گمراه‌کننده است که مالکیت
   واقعی را اصلاً مدل نمی‌کند. یک نفر نمی‌تواند هم‌زمان «هم مالک هم
   متقاضی» باشد بدون دو رکورد کاملاً مجزا و بی‌ربط.

3. **Single-tenant است، نه Multi-user.** `userId` هم auth user است هم
   تنها «صاحب کسب‌وکار». هیچ Organization/Workspace/Role/Permission
   وجود ندارد؛ دو مشاور نمی‌توانند روی یک Property همکاری کنند؛
   `createdBy`/`assignedTo`/`updatedBy` جدا از `userId` مالک رکورد وجود
   ندارد.

4. **Deal فقط یک enum وضعیت تخت است** (`new/contacted/viewing/
   negotiating/completed/cancelled`) — نه Stage History، نه Lost
   Reason، نه Assigned To، نه Expected Value، نه Next Action.

5. **Contract یک فیلد `amount` عمومی دارد** — بدون تفکیک فروش (قیمت
   کل) در برابر اجاره (ودیعه + اجاره ماهانه).

6. **هیچ Activity Log یا Audit Log‌ای وجود ندارد.** «آخرین فعالیت‌ها»ی
   Dashboard فعلی صرفاً از timestamp ایجاد Property/Applicant/Deal
   ساخته می‌شود (نه یک لاگ واقعی رویداد) — تغییر قیمت، تغییر وضعیت،
   تماس، بازدید هیچ‌کدام ثبت نمی‌شوند.

7. **Visit (بازدید) اصلاً مدل نشده.** فقط Reminder عمومی هست که هیچ
   فیلد اختصاصی بازدید (نتیجه، وضعیت حضور) ندارد.

8. **Reminder به Contact و Contract وصل نمی‌شود** (چون Contact وجود
   ندارد، و لینک به Contract هم در schema نیست) — فقط
   Property/Applicant/Deal.

9. **Location فقط یک رشته‌ی آزاد `city` است.** بدون استان/منطقه/محله؛
   تطبیق شهر با string-normalize انجام می‌شود نه مدل جغرافیایی.

10. **Matching فعلی: فیلتر سخت شهر + امتیاز وزن‌دار برای بقیه.** این
    دقیقاً همان قانونی است که فایل ورودی در §8 خواسته حذف شود
    («اگر شهر متفاوت بود اصلاً Match نمایش داده نشود»).

11. **OTP**: انقضا (۵ دقیقه) پیاده‌سازی شده، اما max attempts، resend
    cooldown، rate limiting، device binding **هیچ‌کدام وجود ندارند.**

12. **شماره تلفن Canonical ذخیره نمی‌شود.** الگوی اعتبارسنجی فعلی
    (`PhoneEntryScreen`) فقط «حداقل ۸ کاراکتر» است — نه فرمت واقعی
    موبایل ایران؛ ذخیره/نمایش تفکیک نشده‌اند.

13. **هیچ Soft Delete‌ای نیست.** `delete()` روی هر ۵ repository
    (Property/Applicant/Deal/Contract/Reminder) یک `DELETE` واقعی SQL
    اجرا می‌کند — غیرقابل بازیابی.

14. **بدون Duplicate Detection** برای Contact (تلفن) یا Property.

15. **Search و Filter تفکیک نشده‌اند.** هر صفحه‌ی لیست فقط یک فیلد
    جستجوی آزاد دارد؛ نه فیلتر ساختاریافته (شهر/وضعیت/قیمت/Assigned)،
    نه Sort، نه Pagination — کوئری‌ها `LIMIT` ندارند (همه‌ی رکوردها
    یک‌جا لود می‌شوند).

16. **فرم‌ها Draft/Autosave/Unsaved-changes-warning ندارند** (اعتبارسنجی
    و loading/error state دارند، این بخش خوب است).

17. **Empty State‌ها Actionable نیستند.** کامپوننت مشترک `EmptyState`
    از `actionLabel`/`onAction` پشتیبانی می‌کند، اما **هیچ صفحه‌ای در
    حال حاضر آن را استفاده نمی‌کند** — تمام Empty Stateهای فعلی فقط متن
    هستند، بدون دگمه‌ی CTA.

18. **ناوبری: «پیگیری‌ها» (Deal) تب مستقل ندارد** — فقط از طریق کارت
    آماری Dashboard یا از میان Matching قابل دسترس است.

19. **Referral یکی از بالغ‌ترین بخش‌های سیستم فعلی است** — کد یکتا،
    رابطه‌ی write-once، مستند در ADR-009/012. این بخش نیازی به بازطراحی
    اساسی ندارد.

20. **Dashboard از قبل نسبتاً CRM-oriented است** (آمار امروز، اقدامات
    سریع، Timeline، یادآوری‌های نزدیک) — نزدیک‌ترین بخش به چیزی که فایل
    ورودی در §25 خواسته، صرفاً «Recent Activity» باید از یک Activity Log
    واقعی بیاید، نه از timestampهای خام.

---

## B. Proposed Architecture (خلاصه)

```
Organization (FUTURE — امضای رکورد؛ MVP تک‌سازمانی است، رجوع کنید به C.1)
  └─ User ──── Membership ──── Role
                                 │
Contact ◄──────────────────────┘  (نقش‌ها: Owner/Buyer/Tenant/Seller/
  │  ▲                              Landlord/Agent/Referrer/Collaborator)
  │  └── CustomerNeed (نیاز معاملاتی — جایگزین مفهومی Applicant)
  │
Property ── owned by ──► Contact(role=Owner) [۱ به چند]
  │
  └─► Listing (فروش/اجاره روی همان Property، چند Listing ممکن)
         │
         └─► Match (Listing × CustomerNeed، با Score قابل توضیح)
                │
                └─► Deal (Pipeline واقعی با Stage History)
                       ├─► Visit (بازدید مرتبط با یک Deal)
                       ├─► Activity (لاگ هر رویداد مرتبط با هر Entity)
                       ├─► Reminder (وابسته به Contact/Property/
                       │              CustomerNeed/Deal/Contract)
                       └─► Contract (فیلدهای مخصوص فروش/اجاره)

AuditLog: مستقل، هر تغییر روی فیلدهای حساس (قیمت/وضعیت/Assignment) را
          با Actor+Timestamp+Old+New ثبت می‌کند.
```

### B.1 اصل طراحی
چرخه‌ی محصول طبق §41 فایل ورودی:
`Capture → Understand → Match → Engage → Follow Up → Visit → Negotiate
→ Contract → Analyze` — نه صرفاً `Create Property → Create Applicant →
Create Contract`. هر Entity زیر دقیقاً یکی از این مراحل را پوشش می‌دهد.

---

## C. Entity Model

برای هر Entity: چرا لازم است، رابطه‌ها، Lifecycle، و MVP/Phase.

### C.1 Organization / User / Membership / Role
- **چرا**: حتی در MVP تک‌کاربره، اگر `userId` بعداً بخواهد چند همکار
  داشته باشد، بدون این لایه یک Migration اساسی لازم می‌شود (دقیقاً همان
  چیزی که §21 فایل ورودی می‌خواهد جلویش گرفته شود).
- **پیشنهاد MVP**: **یک ردیف Organization پنهان** به ازای هر User در
  ثبت‌نام ساخته شود (۱ کاربر = ۱ Organization، خودکار، بدون UI مجزا).
  هر Entity مهم (Property/Contact/Deal/...) به‌جای `userId` مستقیم،
  `organizationId` + `createdBy` + `assignedTo` داشته باشد.
- `PRODUCT DECISION REQUIRED`: آیا در MVP همین «۱ کاربر = ۱ Organization
  خودکار» کافی است، یا می‌خواهید از روز اول UI دعوت همکار هم باشد؟
  (پیشنهاد من: فقط مدل داده آماده باشد، UI دعوت‌کردن = Phase 2.)
- **Role/Permission**: `FUTURE`. مدل داده (Membership.role) رزرو شود،
  اما هیچ منطق مجوزدهی در MVP اجرا نشود (چون تک‌کاربره است، معنا ندارد).

### C.2 Contact
- **چرا**: یک شخص می‌تواند هم‌زمان چند نقش داشته باشد (مالک + معرف،
  خریدار + مستأجر). مدل فعلی (Applicant) این را نمی‌تواند نشان دهد.
- **فیلدها**: `id, organizationId, fullName, phoneNumber(canonical),
  email(optional), roles: ContactRole[], notes, createdBy, createdAt,
  updatedAt, isArchived`
- **ContactRole** (جدول جدا، چون یک Contact چند Role دارد):
  `id, contactId, role(Owner|Buyer|Tenant|Seller|Landlord|Agent|
  Collaborator|Referrer), createdAt`
- **رابطه‌ها**: Property (owner)، CustomerNeed (۱ به چند)، Deal (طرف
  معامله)، Reminder، Activity، Visit
- **Lifecycle**: Active → Archived (Soft Delete، نه حذف فیزیکی)
- **MVP**: بله — این Entity پایه‌ی همه‌چیز است، بدون آن Owner و
  Referral-as-data معنا ندارند.
- `PRODUCT DECISION REQUIRED`: `Applicant` فعلی مستقیماً به `CustomerNeed`
  تبدیل می‌شود و `fullName/phoneNumber` آن به یک `Contact` جدید منتقل
  می‌شود (Migration داده‌ی موجود، نه فقط schema). این یک Migration
  واقعی روی داده‌ی کاربران فعلی است — تأیید می‌کنید؟

### C.3 Property
- **فیلدها** (کوچک‌تر از الان، چون Listing جدا می‌شود):
  `id, organizationId, ownerContactId, propertyType, city, district?,
  address, area, rooms, description, status(active|archived), createdBy,
  assignedTo, createdAt, updatedAt`
- **رابطه‌ها**: Contact (owner, ۱ به چند — چند مالک روی یک ملک از طریق
  جدول واسط `PropertyOwner(propertyId, contactId, sharePercent?)`)،
  Listing (۱ به چند)
- **MVP**: بله (جایگزین مستقیم Property فعلی، با schema اصلاح‌شده)

### C.4 Listing
- **چرا**: قیمت‌گذاری و نوع معامله متعلق به «این آگهی روی این ملک»
  است، نه خودِ ملک.
- **فیلدها**: `id, propertyId, transactionType(sale|rent|
  rent_and_deposit), status(draft|active|paused|closed), createdBy,
  assignedTo, createdAt, updatedAt`
  - اگر `sale`: `totalPrice`
  - اگر `rent` یا `rent_and_deposit`: `deposit, monthlyRent`
  - `PRODUCT DECISION REQUIRED`: مدل قیمت به‌صورت یک زیرجدول
    `ListingPricing(listingId, totalPrice?, deposit?, monthlyRent?)`
    پیاده شود یا فیلدهای nullable مستقیم روی Listing؟ (پیشنهاد من:
    فیلدهای nullable مستقیم — یک ملک‌CRM ساده، زیرجدول برای این مقیاس
    over-engineering است؛ ولی این خودش یک تصمیم محصولی سبک است.)
- **MVP**: بله — بدون این، §3 فایل ورودی برآورده نمی‌شود.

### C.5 CustomerNeed (جایگزین مفهومی Applicant)
- **فیلدها**: `id, contactId, transactionType(buy|rent), propertyType,
  city, district?, minBudget, maxBudget, minArea, maxArea, bedrooms?,
  features?, notes, priority(low|medium|high), status(active|paused|
  fulfilled|archived), createdBy, assignedTo, createdAt, updatedAt`
- **Business Rules**: `BR-001 minBudget<=maxBudget`، `BR-002
  minArea<=maxArea` (هر دو از الان هم در validation فعلی پیاده‌اند —
  فقط اسم Entity عوض می‌شود)
- **MVP**: بله (جایگزین مستقیم Applicant، رابطه‌اش با Contact جدید است)

### C.6 Match
- **فیلدها**: `id, listingId, customerNeedId, score(0-100),
  scoreBreakdown: {criterion, weight, matched, reason}[], status(
  suggested|viewed|dismissed|converted_to_deal), createdAt`
- **چرا Persist شود** (نه فقط محاسبه‌ی زنده مثل الان): تا بشود گفت «این
  Match قبلاً دیده/رد شده» و در Activity ثبتش کرد. فعلاً Matching کاملاً
  بی‌حالت (stateless) است.
- `PRODUCT DECISION REQUIRED`: آیا در MVP لازم است Match در دیتابیس
  Persist شود، یا همچنان محاسبه‌ی آنی (stateless) کافی است و فقط لحظه‌ی
  «تبدیل به Deal» ثبت شود؟ (پیشنهاد من برای MVP: **stateless بماند**،
  Persist کردن هر Match را `Phase 2` بگذاریم — امروز هم هیچ نیاز واقعی
  محصولی برای «Match دیده‌شده» بیان نشده.)
- **MVP** (نسخه‌ی سبک، stateless): بله، منطق/فرمول است نه جدول.
  **Persist شدن Match به‌عنوان رکورد**: `Phase 2`.

### C.7 Deal
- **فیلدها**: `id, organizationId, listingId, customerNeedId,
  currentStage, createdBy, assignedTo, expectedValue?, nextAction?,
  nextActionDueAt?, lostReasonId?, notes, createdAt, updatedAt`
- **DealStageHistory**: `id, dealId, fromStage, toStage, actorId,
  changedAt, note?`
- **MVP**: بله — این قلب Pipeline است.

### C.8 LostReason
- **فیلدها**: `id, label, isSystemDefault` — لیست ثابت اما قابل توسعه
  (نه هاردکد در UI): قیمت بالا، ملک مناسب نبود، مشتری منصرف شد، ملک
  فروخته شد، بودجه ناکافی، معامله با مشاور دیگر، سایر.
- **Business Rule**: `BR-004 وقتی Deal به Lost می‌رود، lostReasonId
  الزامی است.`
- **MVP**: بله (جدول کوچک، پیاده‌سازی ارزان، ارزش محصولی بالا).

### C.9 Activity
- **فیلدها**: `id, organizationId, actorId, entityType, entityId,
  activityType(call|message|visit|note|status_change|
  property_created|...|reminder_completed), description, metadata:json,
  beforeValue?, afterValue?, createdAt`
- **MVP**: نسخه‌ی سبک بله (فقط auto-logged رویدادهای سیستمی: created/
  updated/status_change/deal_stage_change) — ثبت دستی Call/Message با UI
  اختصاصی = `Phase 2` (چون به گفته‌ی خودِ فایل ورودی در §13: «اگر
  Integration واقعی وجود ندارد، UI نباید وانمود کند وجود دارد» — پس
  ثبت تماس دستی به‌عنوان فرم ساده «یادداشتِ نوعِ تماس» در Phase 2 قابل
  اضافه‌شدن است، نه به‌عنوان Integration واقعی تلفن).

### C.10 Interaction (Call/Message/Note دستی روی یک Contact)
- `FUTURE` (Phase 2) — طبق §13، فقط اگر Integration واقعی (تماس/
  واتس‌اپ/تلگرام) وجود نداشته باشد، UI نباید ادعای آن را داشته باشد. در
  MVP، «ثبت یادداشت» ساده از طریق Activity (نوع `note`) کافی است؛
  فیلدهای اختصاصی Call (Direction/Duration/Outcome) بدون یک UI و
  Use-case واقعی، حدس محصولی است.

### C.11 Reminder (توسعه‌یافته)
- **فیلدها**: مثل الان + `contactId?` اضافه شود (Contract هم از قبل
  `dealId` دارد، پس از طریق Deal به Contract هم می‌رسد — لینک مستقیم
  `contractId?` هم اضافه می‌شود چون فایل ورودی صراحتاً خواسته).
- **Status جدید**: `pending|due_today|overdue|completed|cancelled`
  (فعلاً فقط `isDone: boolean` است — این یک تغییر واقعی state model است)
- **MVP**: بله.

### C.12 Visit
- **فیلدها**: `id, dealId, propertyId, customerNeedId, scheduledAt,
  status(scheduled|completed|cancelled|no_show), outcome?, notes,
  createdBy, createdAt, updatedAt`
- `PRODUCT DECISION REQUIRED`: آیا Visit در MVP یک Entity کامل با
  صفحه‌ی خودش باشد، یا در MVP فقط **یک نوع خاص از Reminder** باشد
  (`Reminder.kind = 'visit'`) و Entity کامل با فیلدهای outcome در
  Phase 2 اضافه شود؟ (پیشنهاد من: **Phase 2 کامل، MVP = نوع Reminder**؛
  چون بدون UI بازدید امروز، ساختن یک Entity کامل حدس محصولی است — دقیقاً
  همان چیزی که Rule 8 هشدار می‌دهد.)
- **MVP**: نسخه‌ی سبک (Reminder با kind='visit'). Entity مستقل کامل:
  `Phase 2`.

### C.13 Contract (اصلاح‌شده)
- **فیلدها**: `id, organizationId, listingId, dealId, buyerContactId,
  sellerOrLandlordContactId, transactionType(sale|rent|
  rent_and_deposit), totalPrice?, deposit?, monthlyRent?,
  status(draft|active|completed|cancelled), startDate, endDate?,
  notes, createdBy, assignedTo, createdAt, updatedAt, archivedAt?`
- **Business Rule**: `BR-005 Contract نمی‌تواند Active شود بدون
  buyerContactId و sellerOrLandlordContactId مشخص.`
- **Soft Delete**: `archivedAt` به‌جای DELETE فیزیکی.
- **MVP**: بله (بازطراحی مستقیم Contract فعلی).

### C.14 AuditLog
- **فیلدها**: `id, organizationId, actorId, entityType, entityId,
  field, oldValue, newValue, changedAt`
- **دامنه‌ی MVP**: فقط فیلدهای صراحتاً حساس طبق §18: `price`(روی
  Listing)، `status`(Deal/Contract/Listing)، `assignedTo`. نه هر فیلد
  دلخواه (over-engineering).
- **MVP**: نسخه‌ی سبک بله — فقط این ۳ دسته فیلد.

---

## D. Business Rules (با ID، طبق §31)

```
BR-001  CustomerNeed.minBudget <= CustomerNeed.maxBudget
BR-002  CustomerNeed.minArea <= CustomerNeed.maxArea
BR-003  اگر minBudget/maxBudget یکی خالی باشد، آن معیار در Matching
        Score شرکت نمی‌کند (نه صفر محسوب می‌شود، نه امتیاز کامل) —
        این Rule از قبل در matchingService.ts پیاده است، فقط اینجا
        رسمی می‌شود.
BR-004  Deal نمی‌تواند به Lost برود بدون lostReasonId.
BR-005  Contract نمی‌تواند Active شود بدون طرفین معامله
        (buyerContactId + sellerOrLandlordContactId).
BR-006  Match Score باید فرمول قطعی (deterministic) و قابل بازتولید
        داشته باشد — هیچ مقدار تصادفی/حدسی در محاسبه‌ی Score.
BR-007  رکوردهای معاملاتی حذف‌شده (Property/Contact/Deal/Contract)
        باید قابل بازیابی باشند (Soft Delete، نه DELETE فیزیکی).
BR-008  [جدید] Listing.status نمی‌تواند 'active' شود اگر Property
        متعلق به آن archived باشد.
BR-009  [جدید] شهر Match یک Hard Filter نیست — فقط یک معیار وزن‌دار
        (وزن پیشنهادی در بخش F). این Rule جایگزین رفتار فعلی می‌شود.
BR-010  [جدید] هر Deal که وارد stage='contract' می‌شود باید حداقل یک
        Contract مرتبط (draft یا بالاتر) داشته باشد — در غیر این صورت
        UI اجازه‌ی این انتقال را نمی‌دهد.
```

`PRODUCT DECISION REQUIRED` — BR-010 یک قانون جدید پیشنهادی من است
(فایل ورودی صراحتاً این را نخواسته)؛ اگر می‌خواهید Deal بتواند بدون
Contract هم به مرحله‌ی «قرارداد» برود (مثلاً قرارداد بیرون از سیستم
امضا شده)، این Rule را رد کنید.

---

## E. State Machines

### E.1 Deal
```
new → contacted → interested → visit_scheduled → visited
    → negotiation → offer → contract → won
                                      → lost   (نیازمند lostReasonId)

هر مرحله می‌تواند مستقیم به lost برود (مثلاً از 'new' هم مشتری می‌تواند
منصرف شود) — انتقال به lost از هر stage مجاز است، انتقال به سایر
stageها فقط «رو به جلو» (نمی‌شود از 'negotiation' مستقیم به 'new'
برگشت؛ باید Deal جدید ساخته شود) مگر یک Rollback صریح با ثبت دلیل.
```
`PRODUCT DECISION REQUIRED`: آیا Rollback (برگشت به مرحله‌ی قبل) اصلاً
لازم است در MVP، یا Deal فقط رو-به-جلو حرکت می‌کند و برگشت=Lost+Deal
جدید؟ (پیشنهاد من برای سادگی MVP: **فقط رو-به-جلو + Lost**، Rollback
دستی توسط کاربر Phase 2.)

### E.2 Listing
```
draft → active → paused → active (rotate)
              → closed (وقتی Deal مرتبط won می‌شود، یا دستی)
```

### E.3 Contract
```
draft → active → completed
              → cancelled
```
(archived جدا از این state machine است — یک flag مستقل `archivedAt`
روی هر status، طبق §17 و §19.)

### E.4 Reminder
```
pending → due_today (خودکار، بر اساس تاریخ) → overdue (خودکار)
   └────────────────────────────────────────► completed / cancelled
```

### E.5 Contact / Property / CustomerNeed (مشترک)
```
active → archived → (deleted — فقط اگر هیچ رکورد وابسته‌ی معامله‌ای
                      نداشته باشد؛ در غیر این صورت فقط archived می‌ماند)
```

---

## F. Matching Specification

### F.1 معیارها و وزن‌ها (پیش‌فرض، قابل تغییر — طبق §8 باید معماری
قابل‌تغییر باشد نه هاردکد)

```
Location (شهر/منطقه):     30%
Budget (بازه‌ی قیمت):       25%
Property Type:              15%
Area (متراژ):                10%
Bedrooms (تعداد اتاق):       10%
Transaction Type (سازگاری
  خرید/فروش یا اجاره/مستأجر): 10%
```

این اعداد **نمونه** هستند (دقیقاً مطابق مثال §8 فایل ورودی) و باید در
یک جدول/constant قابل‌تغییر پیاده شوند، نه به‌صورت hardcode پخش در چند
فایل — یک تفاوت مهم با پیاده‌سازی فعلی (`CRITERION_WEIGHTS` امروز هم
یک ثابت مرکزی است، این بخش خوب پیاده شده و فقط اعداد وزن‌ها عوض
می‌شوند + معیار `location` دیگر Hard Filter نیست، فقط وزن‌دار است).

### F.2 Transaction Type Compatibility (بدون تغییر نسبت به فاز قبلی)
نگاشت فروشنده/خریدار و موجر/مستأجر که قبلاً پیاده شده
(`فروش↔خرید`, `اجاره/رهن‌و‌اجاره↔اجاره`) **حفظ می‌شود** — این دقیقاً
همان چیزی است که §8 فایل ورودی می‌خواهد و از قبل درست است.

### F.3 قانون تازه: Location = Hard Filter حذف می‌شود
به‌جای فیلتر «اگر شهر متفاوت، اصلاً نمایش نده»، حالا:
- اگر شهر یکسان: امتیاز کامل معیار Location (۳۰٪).
- اگر شهر متفاوت: امتیاز صفر برای این معیار، **اما Match همچنان در
  نتایج ظاهر می‌شود** (با Score پایین‌تر).
- `PRODUCT DECISION REQUIRED`: آیا باید یک **حداقل Score** (مثلاً کمتر
  از ۲۰٪) برای مخفی‌کردن نتایج کاملاً نامرتبط وجود داشته باشد، یا همه‌ی
  نتایج (حتی Score=۰) نمایش داده شوند؟ (پیشنهاد من: یک آستانه‌ی پایین،
  مثلاً `minScoreToShow = 20`، تا لیست شلوغ نشود — این آستانه هم باید
  قابل‌تغییر باشد نه هاردکد.)

### F.4 Explainability (طبق §9)
هر Match باید برگرداند:
```
{
  score: number,
  breakdown: [
    { criterion: 'location', weight: 30, matched: true,  reason: 'شهر مطابق' },
    { criterion: 'budget',   weight: 25, matched: true,  reason: 'قیمت در محدوده بودجه' },
    { criterion: 'bedrooms', weight: 10, matched: false, reason: 'تعداد اتاق متفاوت' },
    ...
  ]
}
```
UI هرکدام را با ✓ (matched) یا △ (mismatch) نشان می‌دهد — این دقیقاً
همان چیزی است که `matchedCriteria` فعلی از قبل برمی‌گرداند (فقط بدون
reason متنی و بدون نمایش موارد ناقص)؛ توسعه‌ی این بخش کم‌هزینه است.

### F.5 داده‌ی ناقص (BR-003)
اگر `minBudget`/`maxBudget` یا `minArea`/`maxArea` خالی باشند، آن
معیار نه matched نه mismatch است — از مخرج کسر امتیاز حذف می‌شود (وزن
باقی‌مانده‌ها نرمالایز می‌شود) تا داده‌ی ناقص باعث Score کاذب پایین
نشود. این «نرمالایز کردن وزن باقی‌مانده» یک تغییر واقعی نسبت به امروز
است (امروز فقط آن معیار امتیاز نمی‌گیرد، ولی مخرج کل صد ثابت می‌ماند —
یعنی داده‌ی ناقص همیشه سقف Score را پایین می‌آورد؛ فایل ورودی می‌خواهد
این رفتار اصلاح شود).
`PRODUCT DECISION REQUIRED`: تأیید می‌کنید که وزن‌ها نرمالایز شوند
(هر معیار گمشده باعث نشود سقف Score واقعی کمتر از ۱۰۰٪ باشد)؟

---

## G. UX Changes (خلاصه — تفصیل کامل در Screen Map جدید بعد از تأیید)

- **Deal تب مستقل پیدا می‌کند یا دست‌کم از Dashboard/Matching قابل‌دسترس‌تر
  می‌شود** — رجوع کنید به بخش H.
- **Matching Tab**: طبق §29، به‌جای انتخاب خام «ملک یا متقاضی»، یک
  سؤال صریح‌تر: «چه چیزی می‌خواهید پیدا کنید؟» با دو گزینه‌ی روشن.
- **Empty Stateها Actionable می‌شوند** (دگمه‌ی CTA در همه‌ی لیست‌های
  خالی — کامپوننت از قبل پشتیبانی می‌کند، فقط باید در هر صفحه استفاده
  شود).
- **Contact به‌عنوان یک بخش/تب یا زیرِ Files اضافه می‌شود** —
  `PRODUCT DECISION REQUIRED`: تب ششم در nav (فضای کم روی موبایل) یا
  زیرمجموعه‌ی «پرونده‌ها»/Files (مثل الان که Property/Applicant زیر یک
  Segmented Control هستند)؟ (پیشنهاد من: **زیر Files**، یک گزینه‌ی سوم
  به Segmented Control اضافه شود: «مخاطبین» — بدون اضافه‌کردن تب جدید،
  چون nav فعلی همین‌الان ۵ تب دارد و اضافه‌کردن تب ششم روی موبایل باریک
  می‌شود.)
- **Dashboard**: بخش «Pipeline» جدید (Dealها بر اساس Stage، خلاصه) اضافه
  می‌شود؛ «Recent Activity» به Activity Log واقعی وصل می‌شود (UI بدون
  تغییر ظاهری قابل توجه، فقط منبع داده عوض می‌شود).
- **فرم‌ها**: افزودن هشدار «تغییرات ذخیره‌نشده» هنگام خروج از فرم پر شده
  — Autosave/Draft واقعی `Phase 2` (پیچیدگی بالا نسبت به ارزش MVP).
- **Search/Filter**: فیلدهای جستجوی فعلی می‌مانند؛ یک شیت/پنل Filter
  (شهر، وضعیت، Assigned To، بازه‌ی قیمت) به لیست‌های اصلی اضافه می‌شود؛
  Sort به‌صورت یک دگمه‌ی ساده (نه منوی پیچیده).

---

## H. Navigation Changes

وضعیت فعلی نوار پایین: خانه / پرونده‌ها / تطبیق / قراردادها / پروفایل.

`PRODUCT DECISION REQUIRED` — سه گزینه، برای انتخاب شما:

1. **حداقلی**: نوار پایین بدون تغییر می‌ماند؛ Deal از طریق کارت
   Dashboard + دکمه‌ی «مشاهده‌ی همه‌ی پیگیری‌ها» در صفحه‌ی تطبیق در
   دسترس است (وضعیت تقریباً فعلی، فقط با CTA بهتر).
2. **جایگزینی**: تب «قراردادها» با تب «پیگیری‌ها» (Deal Pipeline)
   جایگزین شود و Contract از داخل Deal قابل دسترس بماند (چون Contract
   همیشه از یک Deal می‌آید) — این با جریان واقعی کار (Deal قبل از
   Contract می‌آید) هم‌خوان‌تر است.
3. **افزودن تب ششم**: nav به ۶ آیتم برسد (خانه/پرونده‌ها/تطبیق/
   پیگیری‌ها/قراردادها/پروفایل) — روی موبایل باریک تنگ می‌شود، خلاف اصل
   §33 («UX را قربانی معماری نکن»).

**پیشنهاد من: گزینه‌ی ۲.** Deal مرکز چرخه‌ی کار واقعی CRM است (§41)؛
Contract صرفاً خروجی نهایی یک Deal موفق است، نه یک مسیر مستقل. این
یک تصمیم UX با اثر مستقیم روی معماری ناوبری است — نیاز به تأیید شما دارد.

---

## I. Data Dictionary (نمونه — Property و Deal؛ کامل بعد از تأیید معماری در فاز Data Model پیوست می‌شود)

| Entity | Field | Type | Required | Default | Validation | Description | Relationship | Editable | Searchable | Filterable | Sensitive |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Property | id | string(uuid) | ✓ | — | — | شناسه | — | ✗ | ✗ | ✗ | ✗ |
| Property | organizationId | string | ✓ | — | FK | تنانت | Organization | ✗ | ✗ | ✗ | ✗ |
| Property | ownerContactId | string | ✓ | — | FK, باید role=Owner داشته باشد | مالک ملک | Contact | ✓ | ✗ | ✓ | ✗ |
| Property | propertyType | string(enum-like) | ✗ | null | از لیست پیشنهادی، آزاد هم مجاز | نوع ملک | — | ✓ | ✓ | ✓ | ✗ |
| Property | city | string | ✓ | — | غیرخالی | شهر | — | ✓ | ✓ | ✓ | ✗ |
| Property | area | number | ✗ | null | >0 | متراژ | — | ✓ | ✗ | ✓ | ✗ |
| Property | status | enum(active,archived) | ✓ | active | — | وضعیت | — | ✓ | ✗ | ✓ | ✗ |
| Property | createdBy | string | ✓ | — | FK | ایجادکننده | User | ✗ | ✗ | ✓ | ✗ |
| Property | assignedTo | string | ✗ | createdBy | FK | مسئول | User | ✓ | ✗ | ✓ | ✗ |
| Deal | id | string(uuid) | ✓ | — | — | شناسه | — | ✗ | ✗ | ✗ | ✗ |
| Deal | listingId | string | ✓ | — | FK | آگهی مرتبط | Listing | ✗ | ✗ | ✓ | ✗ |
| Deal | customerNeedId | string | ✓ | — | FK | نیاز مشتری مرتبط | CustomerNeed | ✗ | ✗ | ✓ | ✗ |
| Deal | currentStage | enum | ✓ | new | State machine E.1 | مرحله‌ی فعلی | — | ✓ | ✗ | ✓ | ✗ |
| Deal | lostReasonId | string | شرطی (BR-004) | null | FK, الزامی اگر stage=lost | علت شکست | LostReason | ✓ | ✗ | ✓ | ✗ |
| Deal | expectedValue | number | ✗ | null | ≥0 | ارزش تخمینی معامله | — | ✓ | ✗ | ✓ | ✓ (مالی) |

(جدول کامل ۱۴ Entity — با همین سطح جزئیات — بخشی از **Phase 1:
Data Model** در Implementation Plan خواهد بود، نه این سند اولیه؛ آوردن
کامل آن اینجا حجم سند را چند برابر می‌کند بدون افزودن تصمیم جدید.)

---

## J. MVP vs Phase 2 vs Future — جمع‌بندی

### MVP (این فاز)
Contact، ContactRole، Property (بازطراحی‌شده)، Listing، CustomerNeed
(بازنام‌گذاری Applicant)، Matching (وزن‌دار، بدون Hard Filter شهر،
stateless)، Deal (با Stage History)، LostReason، Contract
(بازطراحی‌شده با Soft Delete)، Reminder (وضعیت جدید + لینک Contact/
Contract)، Activity (نسخه‌ی سبک، فقط رویدادهای خودکار)، AuditLog
(نسخه‌ی سبک، فقط ۳ دسته فیلد حساس)، Organization/Membership (پنهان،
۱-به-۱ با User)، Empty State‌های Actionable، Filter/Sort ساده،
Canonical Phone Storage.

### Phase 2
Visit (Entity کامل)، Persist شدن Match به‌عنوان رکورد، Interaction
(Call/Message دستی)، دعوت همکار به Organization (UI)، Draft/Autosave
فرم‌ها، Duplicate Detection، Location hierarchy کامل (استان/منطقه/محله).

### Future
Role/Permission واقعی (چند نقش با دسترسی متفاوت)، Commission روی
Referral، Integration واقعی تماس/پیامک، گزارش‌گیری/Analytics پیشرفته.

---

## نکات باز (Rule 9 — تناقض‌های صریح بین سند فعلی و ورودی جدید)

1. سند `app-screen-map.txt` قانون «شهر متفاوت = Match نمایش داده
   نشود» را به‌عنوان یک ویژگی مستند کرده بود؛ فایل ورودی صراحتاً این
   قانون را نقض می‌کند و می‌خواهد حذف شود. **این سند (بخش F.3) با
   ورودی جدید هم‌راستا است، نه با نسخه‌ی قبلی.**
2. سند قبلی «کد معرف» را یک Field ساده در Settings توصیف کرده بود.
   بخش §23 فایل ورودی می‌خواهد این به یک Architecture مستقل تبدیل شود؛
   من در بخش C این را عمداً کم‌ریسک نگه داشتم (Referral از قبل نسبتاً
   بالغ است) و `Commission` را صراحتاً `Future` گذاشتم چون هیچ مدل
   قیمت‌گذاری/Commission در هیچ سندی مشخص نشده.

---

## خلاصه‌ی تصمیمات مورد نیاز از شما (`PRODUCT DECISION REQUIRED`)

1. مدل Organization: خودکار/پنهان در MVP — تأیید؟ (بخش C.1)
2. Migration داده‌ی Applicant موجود به Contact+CustomerNeed — تأیید؟ (C.2)
3. مدل قیمت Listing: فیلد nullable مستقیم یا زیرجدول؟ (C.4)
4. Match: stateless بماند در MVP یا Persist شود؟ (C.6)
5. Visit: نوع Reminder در MVP یا Entity کامل؟ (C.12)
6. Deal Rollback: مجاز باشد یا فقط رو-به-جلو+Lost؟ (E.1)
7. آستانه‌ی حداقل نمایش Match بعد از حذف Hard Filter شهر؟ (F.3)
8. نرمالایز وزن‌ها برای داده‌ی ناقص — تأیید؟ (F.5)
9. ناوبری: گزینه‌ی ۱ / ۲ / ۳ کدام؟ (بخش H)
10. Contact در nav: زیر Files یا تب مستقل؟ (بخش G)
11. BR-010 (Deal نمی‌تواند بدون Contract وارد stage='contract' شود) — تأیید یا رد؟ (بخش D)

بعد از پاسخ به این‌ها (یا تأیید پیشنهادهای من به‌عنوان پیش‌فرض)، مرحله‌ی
بعدی طبق §42: **Screen Map جدید** و سپس **Implementation Plan
مرحله‌بندی‌شده** (Phase 1 تا 8) تحویل داده می‌شود.
