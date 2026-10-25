/**
 * EYVAN web (#5183): on an iPhone/iPad opened in Safari (not from the Home Screen), first a short guide to add EYVAN
 * to the Home Screen: it then opens full-screen like an app and the browser keeps its data. «ادامه در مرورگر» skips
 * it for this visit.
 */
const SKIP_KEY = 'eyvan-browser-ok'

function isIos(): boolean {
  if (import.meta.env.DEV && location.search.includes('guide')) return true // dev: see the guide on any browser
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

function isStandalone(): boolean {
  return (navigator as { standalone?: boolean }).standalone === true || matchMedia('(display-mode: standalone)').matches
}

const SHARE_ICON =
  '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="M8 7l4-4 4 4"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>'
const ADD_ICON =
  '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 8v8M8 12h8"/></svg>'

/** true when the guide is on screen (the app waits until the user skips it) */
export function showInstallGuide(root: HTMLElement, onSkip: () => void): boolean {
  if (!isIos() || isStandalone() || sessionStorage.getItem(SKIP_KEY)) return false
  root.innerHTML = `
    <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;padding:32px 24px;
      background:#0b1220;color:#e2e8f0;font-family:'Vazirmatn-Regular',system-ui,sans-serif;text-align:center" dir="rtl">
      <img src="/icon-192.png" alt="" width="88" height="88" style="border-radius:20px">
      <div style="font-family:'IRANYekan-Bold',system-ui;font-size:22px">ایوان را به صفحهٔ اصلی اضافه کنید</div>
      <div style="font-size:15px;line-height:1.9;color:#94a3b8;max-width:320px">
        تا مثل یک برنامه، تمام‌صفحه باز شود و اطلاعاتتان روی همین گوشی بماند.
      </div>
      <ol style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:12px;width:100%;max-width:320px">
        <li style="display:flex;align-items:center;gap:12px;background:#16213a;border-radius:14px;padding:14px 16px;font-size:15px">
          <span style="color:#facc15">${SHARE_ICON}</span><span>۱. دکمهٔ «اشتراک‌گذاری» پایین صفحهٔ سافاری را بزنید</span>
        </li>
        <li style="display:flex;align-items:center;gap:12px;background:#16213a;border-radius:14px;padding:14px 16px;font-size:15px">
          <span style="color:#facc15">${ADD_ICON}</span><span>۲. «افزودن به صفحهٔ اصلی» را بزنید<br><bdi dir="ltr" style="font-size:13px;color:#94a3b8">Add to Home Screen</bdi></span>
        </li>
        <li style="display:flex;align-items:center;gap:12px;background:#16213a;border-radius:14px;padding:14px 16px;font-size:15px">
          <img src="/icon-192.png" alt="" width="22" height="22" style="border-radius:6px"><span>۳. ایوان را از صفحهٔ اصلی گوشی باز کنید</span>
        </li>
      </ol>
      <button id="eyvan-skip-guide" style="margin-top:8px;background:none;border:0;color:#94a3b8;font:inherit;font-size:14px;text-decoration:underline">
        ادامه در مرورگر
      </button>
    </div>`
  root.querySelector('#eyvan-skip-guide')?.addEventListener('click', () => {
    sessionStorage.setItem(SKIP_KEY, '1')
    root.innerHTML = ''
    onSkip()
  })
  return true
}
