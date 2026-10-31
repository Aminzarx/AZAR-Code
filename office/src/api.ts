// The office dashboard's calls to azar-auth (/auth for the phone code, /office for everything else).

export type OfficeFile = {
  id: string; title: string; kind: string; propertyType: string; city: string; region: string; address: string;
  size: number | null; rooms: number | null; price: number | null; deposit: number | null; rent: number | null;
  description: string; ownerName: string; ownerPhone: string; createdAt: string; expiresAt: string; sentTo: string[];
  /** Amin #6344: who has the file now and until when (null = no end) */
  shares?: { adviserId: string; until: string | null }[];
  /** Amin #6269: the file's tokens at today's price = what one recipient costs (null while pricing can't be read) */
  tokens?: number | null;
};
export type Adviser = {
  id: string; name: string; newFiles: number; contacts: number; reminders: number; closedToday: number;
  openDeals: number; lastSeen: string | null;
};
export type Rules = { description: boolean; address: boolean; owner: boolean };
export type Overview = {
  office: { name: string; rules: Rules }; asOf: string; files: OfficeFile[]; newToday: number; newWeek: number;
  perDay: { day: string; office: number }[]; expiring: OfficeFile[]; sentFiles: number; advisers: Adviser[];
  stages: { stage: string; count: number }[]; openDeals: number; codes: { code: string; word: string; expires_at: string }[];
  tokens?: { balance: number; priced: boolean };
};
/** Amin #6269: the office's own tokens */
export type TokenLine = { at: string; kind: string; what: string; amount: number };
export type TokenOrder = { id: string; tokens: number; totalToman: number; status: string; paidAt: string | null; createdAt: string; sandbox: boolean };
export type Tokens = {
  balance: number; lines: TokenLine[]; orders: TokenOrder[];
  buy: { open: boolean; reason: string | null; unitToman: number | null; minTokens: number | null };
};
export type Quote = { tokens: number; unitToman: number; baseToman: number; vatToman: number; totalToman: number };
export type NewFile = Partial<Omit<OfficeFile, 'id' | 'createdAt' | 'expiresAt' | 'sentTo'>>;

// Amin #6346: a sign-in lives in this tab only (closing it = sign in again) and for 3 hours at most (the server ends it too)
const TOKEN = 'eyvan-office-token';
const UNTIL = 'eyvan-office-until';
const store = (() => { try { return window.sessionStorage; } catch { return null; } })();
export const session = {
  get: () => {
    const until = Number(store?.getItem(UNTIL) || 0);
    if (until && until <= Date.now()) { store?.removeItem(TOKEN); store?.removeItem(UNTIL); }
    return store?.getItem(TOKEN) ?? null;
  },
  set: (t: string, expiresAt?: string) => {
    store?.setItem(TOKEN, t);
    store?.setItem(UNTIL, String(expiresAt ? Date.parse(expiresAt) : Date.now() + 3 * 60 * 60 * 1000));
  },
  clear: () => { store?.removeItem(TOKEN); store?.removeItem(UNTIL); },
};
try { localStorage.removeItem(TOKEN); } catch { /* the old, lasting sign-in is gone */ }
export type SignedIn = { token: string; office: { name: string }; expiresAt?: string };

/** Amin #6335: the phone book = the manager's app contacts */
export type Contact = { id: string; name: string; phone: string; notes: string; roles: string[]; createdAt: string | null };

/** Amin #6333: the app's own work in the dashboard (the manager's app data, one set with the phone) */
export type Applicant = {
  id: string; name: string; phone: string; kinds: string[]; propertyType: string; city: string; region: string;
  barterItems: string[]; barterOther: string; minBudget: number | null; maxBudget: number | null; minArea: number | null; maxArea: number | null;
  rooms: number | null; deposit: number | null; rent: number | null; convertible: boolean; description: string;
  status: 'active' | 'archived'; createdAt: string | null; updatedAt: string | null; matches?: number;
};
export type NewApplicant = {
  name: string; phone: string; kinds: string[]; propertyType?: string; city: string; region?: string; barterItems?: string[]; barterOther?: string;
  minBudget?: string; maxBudget?: string; minArea?: string; maxArea?: string; rooms?: string; deposit?: string; rent?: string; convertible?: boolean; description?: string;
};
export type MatchFile = {
  id: string; title: string; kinds: string[]; kind: string; propertyType: string; city: string; region: string; price: number | null;
  deposit: number | null; rent: number | null; size: number | null; rooms: number | null; archived: boolean; closed: boolean;
};
export type Contract = {
  id: string; type: string; status: 'active' | 'completed' | 'cancelled'; statusLabel: string; amount: number | null; startDate: string | null; endDate: string | null;
  trackingCode: string; notes: string; fileId: string | null; fileTitle: string; applicantId: string | null; applicantName: string; archived: boolean; createdAt: string | null;
};
export type NewContract = { fileId: string; applicantId: string; type: string; amount?: string; startDate: string; endDate: string; trackingCode?: string; notes?: string };
export type Reminder = {
  id: string; title: string; description: string; remindAt: string; type: 'general' | 'call' | 'visit'; typeLabel: string; done: boolean;
  bucket: 'overdue' | 'today' | 'upcoming' | 'done'; fileId: string | null; fileTitle: string | null; applicantId: string | null; applicantName: string | null;
};
export type NewReminder = { title: string; description?: string; date: string; time: string; type: string; fileId?: string; applicantId?: string };
export type Desk = { applicants: number; contracts: number; reminders: { overdue: number; today: number }; divar: { on: boolean } };
export type Divar = { on: boolean; at: string | null; consent: string; cost: number | null };
export type MatchList = {
  applicants: { id: string; name: string; kinds: string[]; city: string; region: string; count: number; best: number }[];
  files: (MatchFile & { count: number; best: number })[];
};

export class ApiError extends Error {
  /** a form's field-by-field messages (field → message), when the server sends them */
  fields?: Record<string, string>;
  constructor(public code: string, message: string, public status: number) { super(message); }
}

/** Amin #5967: inside the one panel (kssx.ir/app/office) the calls go through the panel's own address */
export const IN_PANEL = location.pathname.startsWith('/app/office');
const BASE = IN_PANEL ? '/app/office/api' : '';

async function call<T>(method: string, path: string, body?: unknown, extra: Record<string, string> = {}): Promise<T> {
  const token = session.get();
  let res: Response;
  try {
    res = await fetch(BASE + path, {
      method,
      headers: { 'content-type': 'application/json', ...(token ? { 'x-office-token': token } : {}), ...extra },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('offline', 'به سرور وصل نشد؛ اینترنت را بررسی کنید.', 0);
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    if (res.status === 401 && path.startsWith('/office/') && !['/office/login', '/office/sso', '/office/sso/open', '/office/password', '/office/link/start', '/office/link/poll', '/office/link/phone'].includes(path)) { session.clear(); location.reload(); }
    const err = new ApiError(data?.error?.code ?? 'error', persian(data?.error?.code, data?.error?.message), res.status);
    if (data?.ticket) (err as ApiError & { ticket?: string }).ticket = data.ticket;
    if (data?.fields) err.fields = data.fields;
    throw err;
  }
  return data as T;
}

const MESSAGES: Record<string, string> = {
  invalid_phone_number: 'شمارهٔ موبایل درست نیست.',
  invalid_otp: 'کد درست نیست.',
  otp_expired: 'کد منقضی شده؛ دوباره بگیرید.',
  sms_unavailable: 'الان پیامک فرستاده نمی‌شود؛ کمی بعد دوباره امتحان کنید.',
};
const persian = (code: string | undefined, message: string | undefined) =>
  (code && MESSAGES[code]) || (message && /[؀-ۿ]/.test(message) ? message : 'انجام نشد؛ دوباره امتحان کنید.');

/** 09xxxxxxxxx → +989xxxxxxxxx (the form the server keys codes by) */
export const intl = (p: string) => '+98' + p.replace(/\D/g, '').replace(/^0/, '');

export const api = {
  sendCode: (phone: string) => call<void>('POST', '/auth/send-otp', { phoneNumber: intl(phone) }),
  verify: (phone: string, code: string) => call<void>('POST', '/auth/verify-otp', { phoneNumber: intl(phone), code }),
  login: (phone: string, officeName?: string) =>
    call<SignedIn>('POST', '/office/login', { phoneNumber: intl(phone), officeName }),
  sso: (h: string) => call<SignedIn>('POST', '/office/sso', { h }),
  ssoOpen: (ticket: string, officeName: string) => call<SignedIn>('POST', '/office/sso/open', { ticket, officeName }),
  /** Amin #6034: the username + password chosen on the request in the app */
  password: (username: string, password: string) => call<SignedIn>('POST', '/office/password', { username, password }),
  /** Amin #6346 «ورود با ایوان»: the mobile number; that account's open EYVAN app asks to hold its button; poll until it does */
  linkPhone: (phone: string) => call<{ poll: string; expiresAt: string }>('POST', '/office/link/phone', { phone }),
  linkPoll: (poll: string) => call<{ pending: true } | SignedIn>('POST', '/office/link/poll', { poll }),
  /** Amin #6343: take the request back — the files go home to the app, every share and adviser ends */
  withdraw: () => call<{ returned: number; files: number }>('POST', '/office/withdraw', { confirm: 'withdraw' }),
  logout: () => call<void>('POST', '/office/logout', {}),
  overview: () => call<Overview>('GET', '/office/overview'),
  createFile: (f: NewFile) => call<{ id: string }>('POST', '/office/files', f),
  renew: (id: string) => call<void>('POST', `/office/files/${id}/renew`, {}),
  contacts: () => call<{ contacts: Contact[]; roles: Record<string, string> }>('GET', '/office/contacts'),
  addContact: (c: { name: string; phone: string; role?: string; notes?: string }) => call<{ contact: Contact }>('POST', '/office/contacts', c),
  /** the CSV comes with the session header, so it is fetched and handed to the browser as a file */
  contactsCsv: async () => {
    const token = session.get();
    const res = await fetch(BASE + '/office/contacts.csv', { headers: token ? { 'x-office-token': token } : {} });
    if (!res.ok) throw new ApiError('csv_failed', 'فایل ساخته نشد؛ دوباره امتحان کنید.', res.status);
    return res.blob();
  },
  archive: (id: string) => call<void>('POST', `/office/files/${id}/archive`, {}),
  share: (fileIds: string[], to: 'all' | string[], fields: Rules, until: string | null) => call<{ sent: number }>('POST', '/office/share', { fileIds, to, fields, until }),
  /** Amin #6344: end a share now (one adviser, or everyone who has the file) */
  shareCancel: (fileId: string, adviserId?: string) => call<{ cancelled: number }>('POST', '/office/share/cancel', { fileId, adviserId }),
  rules: (r: Rules) => call<{ rules: Rules }>('PUT', '/office/rules', r),
  newCode: () => call<{ code: string; word: string; expiresAt: string }>('POST', '/office/codes', {}),
  revokeCode: (code: string) => call<void>('POST', `/office/codes/${code}/revoke`, {}),
  unlink: (id: string) => call<void>('POST', `/office/advisers/${id}/unlink`, {}),
  tokens: () => call<Tokens>('GET', '/office/tokens'),
  tokenQuote: (tokens: number) => call<{ quote: Quote }>('POST', '/office/tokens/quote', { tokens }),
  tokenBuy: (tokens: number, idem: string) => call<{ order: TokenOrder; payUrl: string | null }>('POST', '/office/tokens/buy', { tokens }, { 'idempotency-key': idem }),
  // Amin #6333/#6337: the app's work on the manager's own app data
  desk: () => call<Desk>('GET', '/office/desk'),
  applicants: () => call<{ applicants: Applicant[]; kinds: string[]; propertyTypes: string[]; barterItems: string[] }>('GET', '/office/applicants'),
  applicant: (id: string) => call<{ applicant: Applicant; matches: { file: MatchFile; score: number; criteria: string[] }[]; contracts: Contract[]; reminders: Reminder[] }>('GET', `/office/applicants/${encodeURIComponent(id)}`),
  addApplicant: (a: NewApplicant) => call<{ applicant: Applicant; tokens: number; balance: number }>('POST', '/office/applicants', a),
  applicantStatus: (id: string, status: 'active' | 'archived') => call<{ applicant: Applicant }>('POST', `/office/applicants/${encodeURIComponent(id)}/status`, { status }),
  matches: () => call<MatchList>('GET', '/office/matches'),
  matchesForApplicant: (id: string) => call<{ applicant: Applicant; files: { file: MatchFile; score: number; criteria: string[] }[] }>('GET', `/office/matches/applicant/${encodeURIComponent(id)}`),
  matchesForFile: (id: string) => call<{ file: MatchFile; applicants: { applicant: Applicant; score: number; criteria: string[] }[] }>('GET', `/office/matches/file/${encodeURIComponent(id)}`),
  contracts: () => call<{ contracts: Contract[]; kinds: string[]; statuses: Record<string, string> }>('GET', '/office/contracts'),
  addContract: (c: NewContract) => call<{ contract: Contract; tokens: number; balance: number }>('POST', '/office/contracts', c),
  contractStatus: (id: string, status: Contract['status']) => call<{ contract: Contract }>('POST', `/office/contracts/${encodeURIComponent(id)}/status`, { status }),
  reminders: () => call<{ reminders: Reminder[]; types: Record<string, string> }>('GET', '/office/reminders'),
  addReminder: (r: NewReminder) => call<{ reminder: Reminder }>('POST', '/office/reminders', r),
  reminderDone: (id: string, done: boolean) => call<{ reminder: Reminder }>('POST', `/office/reminders/${encodeURIComponent(id)}/done`, { done }),
  divar: () => call<Divar>('GET', '/office/divar'),
  divarConsent: (on: boolean, agree?: boolean) => call<{ on: boolean; at: string }>('POST', '/office/divar/consent', { on, agree }),
  divarImport: (link: string) => call<{ file: NewFile; photos: number; charged: number; balance: number }>('POST', '/office/divar/import', { link }),
};
