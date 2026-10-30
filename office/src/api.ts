// The office dashboard's calls to azar-auth (/auth for the phone code, /office for everything else).

export type OfficeFile = {
  id: string; title: string; kind: string; propertyType: string; city: string; region: string; address: string;
  size: number | null; rooms: number | null; price: number | null; deposit: number | null; rent: number | null;
  description: string; ownerName: string; ownerPhone: string; createdAt: string; expiresAt: string; sentTo: string[];
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

const TOKEN = 'eyvan-office-token';
export const session = {
  get: () => localStorage.getItem(TOKEN),
  set: (t: string) => localStorage.setItem(TOKEN, t),
  clear: () => localStorage.removeItem(TOKEN),
};

export class ApiError extends Error {
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
    if (res.status === 401 && path.startsWith('/office/') && !['/office/login', '/office/sso', '/office/sso/open', '/office/password', '/office/link/start', '/office/link/poll'].includes(path)) { session.clear(); location.reload(); }
    const err = new ApiError(data?.error?.code ?? 'error', persian(data?.error?.code, data?.error?.message), res.status);
    if (data?.ticket) (err as ApiError & { ticket?: string }).ticket = data.ticket;
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
    call<{ token: string; office: { name: string } }>('POST', '/office/login', { phoneNumber: intl(phone), officeName }),
  sso: (h: string) => call<{ token: string; office: { name: string } }>('POST', '/office/sso', { h }),
  ssoOpen: (ticket: string, officeName: string) => call<{ token: string; office: { name: string } }>('POST', '/office/sso/open', { ticket, officeName }),
  /** Amin #6034: the username + password chosen on the request in the app */
  password: (username: string, password: string) => call<{ token: string; office: { name: string } }>('POST', '/office/password', { username, password }),
  /** Amin #6033 «ورود با ایوان»: a 2-minute code the app confirms; poll until it does */
  linkStart: () => call<{ code: string; poll: string; expiresAt: string }>('POST', '/office/link/start', {}),
  linkPoll: (poll: string) => call<{ pending: true } | { token: string; office: { name: string } }>('POST', '/office/link/poll', { poll }),
  logout: () => call<void>('POST', '/office/logout', {}),
  overview: () => call<Overview>('GET', '/office/overview'),
  createFile: (f: NewFile) => call<{ id: string }>('POST', '/office/files', f),
  renew: (id: string) => call<void>('POST', `/office/files/${id}/renew`, {}),
  archive: (id: string) => call<void>('POST', `/office/files/${id}/archive`, {}),
  share: (fileIds: string[], to: 'all' | string[], fields: Rules) => call<{ sent: number }>('POST', '/office/share', { fileIds, to, fields }),
  rules: (r: Rules) => call<{ rules: Rules }>('PUT', '/office/rules', r),
  newCode: () => call<{ code: string; word: string; expiresAt: string }>('POST', '/office/codes', {}),
  revokeCode: (code: string) => call<void>('POST', `/office/codes/${code}/revoke`, {}),
  unlink: (id: string) => call<void>('POST', `/office/advisers/${id}/unlink`, {}),
  tokens: () => call<Tokens>('GET', '/office/tokens'),
  tokenQuote: (tokens: number) => call<{ quote: Quote }>('POST', '/office/tokens/quote', { tokens }),
  tokenBuy: (tokens: number, idem: string) => call<{ order: TokenOrder; payUrl: string | null }>('POST', '/office/tokens/buy', { tokens }, { 'idempotency-key': idem }),
};
