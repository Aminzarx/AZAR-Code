export type ToastKind = "success" | "error" | "warning" | "info";
export interface ToastOptions { kind?: ToastKind; title?: string; ms?: number }
export interface ToastHandle { close(): void }
export interface KssToastApi {
  show(message: string, options?: ToastOptions): ToastHandle | null;
  success(message: string, title?: string, ms?: number): ToastHandle | null;
  error(message: string, title?: string, ms?: number): ToastHandle | null;
  warning(message: string, title?: string, ms?: number): ToastHandle | null;
  info(message: string, title?: string, ms?: number): ToastHandle | null;
  clear(): void;
}
declare const KssToast: KssToastApi;
export default KssToast;
