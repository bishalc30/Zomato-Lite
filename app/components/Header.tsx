// The global header bar, shared by both screens. Defined once here so the
// wordmark never drifts out of sync between pages.
export default function Header() {
  return (
    <header className="w-full border-b border-neutral-200 bg-white">
      <div className="mx-auto flex w-full max-w-[560px] items-center justify-between px-6 py-3">
        <p className="text-lg tracking-tight">
          <span className="font-extrabold" style={{ color: "#E23744" }}>
            zomato
          </span>{" "}
          <span className="font-normal text-neutral-400">lite</span>
        </p>
        <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide" style={{ backgroundColor: "#FDE8EA", color: "#E23744" }}>
          Beta
        </span>
      </div>
    </header>
  );
}
