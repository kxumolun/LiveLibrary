import { useMemo, useState } from "react";

type Fit = "cover" | "contain";

export default function CoverImage({
  src,
  alt,
  className = "",
  fit = "cover",
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  fit?: Fit;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = !!src && !failed;

  const objectClass = useMemo(() => {
    return fit === "contain" ? "object-contain" : "object-cover";
  }, [fit]);

  return (
    <div
      className={`relative w-full h-full overflow-hidden ${className}`}
    >
      {showImage ? (
        <img
          src={src!}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className={`w-full h-full ${objectClass} object-center`}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-surface-100 to-surface-50">
          <div className="flex flex-col items-center gap-2 text-surface-900/50">
            <div className="text-3xl leading-none">📘</div>
            <div className="text-[11px] font-semibold">Muqova yo‘q</div>
          </div>
        </div>
      )}
    </div>
  );
}

