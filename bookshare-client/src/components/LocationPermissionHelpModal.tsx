import { useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onRetry: () => Promise<boolean> | boolean;
};

function detectBrowserName() {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("edg/")) return "Edge";
  if (ua.includes("firefox/")) return "Firefox";
  if (ua.includes("safari/") && !ua.includes("chrome/")) return "Safari";
  if (ua.includes("chrome/")) return "Chrome";
  return "Brauzer";
}

function browserSteps(name: string) {
  switch (name) {
    case "Chrome":
    case "Edge":
      return [
        "Manzil satri yonidagi qulf belgisini bosing.",
        "Location/Joylashuv bo'limini toping.",
        "Allow/Ruxsat berish ni tanlang.",
        "Sahifani yangilang va qayta urinib ko'ring.",
      ];
    case "Firefox":
      return [
        "Manzil satridagi qulf yoki ruxsat belgisini bosing.",
        "Joylashuv uchun oldingi blokni olib tashlang.",
        "Sahifani yangilang.",
        "Qayta urinish tugmasini bosing.",
      ];
    case "Safari":
      return [
        "Safari sozlamalariga kiring (Settings yoki Safari > Settings for This Website).",
        "Location/Joylashuv ruxsatini Allow ga o'zgartiring.",
        "Sahifani qayta yuklang.",
        "Qayta urinish tugmasini bosing.",
      ];
    default:
      return [
        "Brauzer ruxsatlari (Permissions/Site settings) bo'limiga kiring.",
        "Joylashuv ruxsatini Allow ga o'zgartiring.",
        "Sahifani yangilang.",
        "Qayta urinish tugmasini bosing.",
      ];
  }
}

export default function LocationPermissionHelpModal({
  open,
  onClose,
  onRetry,
}: Props) {
  const [retrying, setRetrying] = useState(false);
  if (!open) return null;

  const browser = detectBrowserName();
  const steps = browserSteps(browser);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-soft ring-1 ring-surface-200/70">
        <div className="border-b border-surface-200/70 px-5 py-4">
          <h3 className="text-lg font-extrabold tracking-tight text-surface-900">
            Joylashuv ruxsatini yoqish
          </h3>
          <p className="mt-1 text-sm text-surface-900/70">
            {browser} brauzerida joylashuv bloklangan. Quyidagicha yoqing:
          </p>
        </div>

        <div className="px-5 py-4">
          <ol className="space-y-2 text-sm text-surface-900/80">
            {steps.map((s, i) => (
              <li key={s} className="flex gap-2">
                <span className="font-bold text-primary-700">{i + 1}.</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>

          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Eslatma: ruxsat brauzer darajasida boshqariladi. Saytning o'zi uni
            majburan qayta yoqa olmaydi.
          </p>
        </div>

        <div className="flex gap-2 border-t border-surface-200/70 px-5 py-4">
          <button onClick={onClose} className="btn-ghost flex-1">
            Yopish
          </button>
          <button
            onClick={async () => {
              setRetrying(true);
              const minHoldMs = 700;
              const startedAt = Date.now();
              try {
                const ok = await onRetry();
                if (ok) onClose();
              } finally {
                const elapsed = Date.now() - startedAt;
                if (elapsed < minHoldMs) {
                  await new Promise((r) => setTimeout(r, minHoldMs - elapsed));
                }
                setRetrying(false);
              }
            }}
            disabled={retrying}
            className="btn-primary flex-1 disabled:opacity-50"
          >
            {retrying ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Qayta tekshirilyapti...
              </span>
            ) : (
              "Yoqdim, qayta tekshir"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
