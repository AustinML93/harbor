import { useState, useEffect } from "react";

const CDN_BASE = "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png";

interface Props {
  slug: string;
  name?: string;
  url?: string;
  size?: number;
}

function nameToHue(name: string): number {
  return name.split("").reduce((h, c) => h + c.charCodeAt(0), 0) % 360;
}

/**
 * Three-tier icon fallback:
 * 1. Dashboard icon from CDN (by slug)
 * 2. Favicon from the service URL
 * 3. Letter avatar with deterministic color
 */
export function ServiceIcon({ slug, name, url, size = 20 }: Props) {
  const [tier, setTier] = useState<1 | 2 | 3>(1);

  useEffect(() => { setTier(1); }, [slug]);

  const displayName = name ?? slug;
  const hue = nameToHue(displayName);

  if (tier === 1 && slug) {
    return (
      <img
        src={`${CDN_BASE}/${slug.toLowerCase()}.png`}
        alt={displayName}
        width={size}
        height={size}
        className="flex-shrink-0 rounded"
        style={{ objectFit: "contain" }}
        onError={() => setTier(url ? 2 : 3)}
      />
    );
  }

  if (tier === 2 && url) {
    try {
      const origin = new URL(url).origin;
      return (
        <img
          src={`${origin}/favicon.ico`}
          alt={displayName}
          width={size}
          height={size}
          className="flex-shrink-0 rounded"
          style={{ objectFit: "contain" }}
          onError={() => setTier(3)}
        />
      );
    } catch {
      setTier(3);
    }
  }

  // Tier 3: letter avatar
  return (
    <div
      className="flex flex-shrink-0 items-center justify-center rounded"
      style={{
        width: size,
        height: size,
        backgroundColor: `hsla(${hue}, 60%, 45%, 0.12)`,
        color: `hsl(${hue}, 60%, 45%)`,
        fontSize: size * 0.5,
        fontWeight: 700,
      }}
    >
      {displayName[0]?.toUpperCase() ?? "?"}
    </div>
  );
}
