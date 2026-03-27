import { useEffect, useMemo, useRef, useState } from "react";

type Option<T extends string | number> = {
  value: T;
  label: string;
};

export default function PremiumSelect<T extends string | number>({
  value,
  options,
  onChange,
  placeholder = "Tanlang",
  disabled = false,
}: {
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const selected = useMemo(
    () => options.find((o) => o.value === value) || null,
    [options, value],
  );

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (wrapRef.current.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={wrapRef} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        className="input appearance-none flex w-full items-center justify-between gap-3 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="min-w-0 truncate text-left">
          {selected?.label || placeholder}
        </span>
        <span className="pointer-events-none inline-flex items-center justify-center text-surface-900/60">
          ▾
        </span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-surface-200/60">
          <div className="max-h-60 overflow-auto">
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm transition ${
                    isSelected
                      ? "bg-primary-50 text-primary-700"
                      : "bg-white text-surface-900 hover:bg-surface-100"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

