// The office dashboard's calls to azar-auth (/auth for the phone code, /office for everything else).

export type OfficeFile = {
  id: string; title: string; kind: string; propertyType: string; city: string; region: string; address: string;
  size: number | null; rooms: number | null; price: number | null; deposit: number | null; rent: number | null;
  description: string; ownerName: string; ownerPhone: string; createdAt: string; expiresAt: string; sentTo: string[];
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
};
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

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = session.get();
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      headers: { 'content-type': 'application/json', ...(token ? { 'x-office-token': token } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('offline', 'به سرور وصل نشد؛ اینترنت را بررسی کنید.', 0);
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    if (res.status === 401 && path.startsWith('/office/') && path !== '/office/login') { session.clear(); location.reload(); }
    throw new ApiError(data?.error?.code ?? 'error', persian(data?.error?.code, data?.error?.message), res.status);
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
};
