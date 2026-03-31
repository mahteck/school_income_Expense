export default function MetricCard(props: {
  title: string;
  value: number | string;
  hint?: string;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  const tone = props.tone ?? "neutral";
  const toneClasses =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : tone === "danger"
          ? "border-rose-200 bg-rose-50 text-rose-900"
          : "border-zinc-200 bg-zinc-50 text-zinc-900";

  return (
    <div
      className={`rounded-xl border p-4 shadow-sm ${toneClasses} flex flex-col gap-1`}
    >
      <div className="text-sm font-medium text-zinc-700">{props.title}</div>
      <div className="text-2xl font-semibold tracking-tight">{props.value}</div>
      {props.hint ? (
        <div className="text-xs opacity-80">{props.hint}</div>
      ) : null}
    </div>
  );
}

