/* eslint-disable @next/next/no-img-element -- small static SVG; next/image adds nothing here */

/** Logo symbol (public/branding vector) plus the "Kiko" wordmark as real text. */
export function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  const symbol = size === "lg" ? "h-10 w-9" : "h-8 w-7";
  const word = size === "lg" ? "text-[1.75rem]" : "text-[1.5rem]";
  return (
    <span className="inline-flex items-center gap-2">
      <img src="/branding/kiko-symbol-editable-vector.svg" alt="" aria-hidden="true" className={symbol} />
      <span className={`${word} leading-none font-extrabold tracking-tight text-ink`}>Kiko</span>
    </span>
  );
}

/** Soft mesh glows (DESIGN.md §3.2): decorative, fixed behind content, never scrollable. */
export function MeshBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-40 -left-40 size-[26rem] rounded-full bg-[radial-gradient(circle,rgba(125,211,252,.55),transparent_70%)] md:size-[48rem]" />
      <div className="absolute -top-32 -right-32 size-[22rem] rounded-full bg-[radial-gradient(circle,rgba(252,165,165,.4),transparent_70%)] md:size-[40rem]" />
      <div className="absolute -right-40 -bottom-40 size-[24rem] rounded-full bg-[radial-gradient(circle,rgba(167,139,250,.3),transparent_70%)] md:size-[44rem]" />
      <div className="absolute -bottom-32 -left-32 size-[20rem] rounded-full bg-[radial-gradient(circle,rgba(252,211,77,.3),transparent_70%)] md:size-[38rem]" />
    </div>
  );
}
