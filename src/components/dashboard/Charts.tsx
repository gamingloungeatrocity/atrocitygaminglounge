import { Rupee } from "@/components/ui/Rupee";

/* ------------------------------------------------------------------ */
/* Pure SVG Responsive Charts — Crimson Arcade & Bloodlines theme      */
/* Every value is dynamically rendered from real PostgreSQL records.    */
/* ------------------------------------------------------------------ */

export function DailyRevenueChart({ data }: { data: { date: string; label: string; revenue: number }[] }) {
  const max = Math.max(100, ...data.map((d) => d.revenue));
  const total = data.reduce((s, d) => s + d.revenue, 0);

  return (
    <div className="rounded-2xl border border-white/10 bg-coal p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-tech text-xs font-bold uppercase tracking-[0.24em] text-white/45">Last 14 Days</p>
          <h3 className="mt-1 font-display text-base font-black uppercase">Daily Revenue</h3>
        </div>
        <p className="font-display text-lg font-black text-blood-400">
          <Rupee />
          {total.toLocaleString("en-IN")}
        </p>
      </div>

      <div className="mt-6 flex h-44 items-end gap-1.5 sm:gap-2">
        {data.map((item) => {
          const pct = max > 0 ? Math.max(3, Math.round((item.revenue / max) * 100)) : 3;
          return (
            <div key={item.date} className="group relative flex h-full flex-1 flex-col items-center justify-end">
              <div className="pointer-events-none absolute -top-7 z-10 hidden whitespace-nowrap rounded bg-black px-2 py-0.5 text-[10px] font-bold text-white ring-1 ring-blood/50 group-hover:block">
                {item.date}: ₹{item.revenue}
              </div>
              <div
                style={{ height: `${item.revenue > 0 ? pct : 3}%` }}
                className={
                  item.revenue > 0
                    ? "w-full rounded-t-md bg-linear-to-t from-blood-800 to-blood transition-all duration-300 group-hover:from-blood group-hover:to-blood-300"
                    : "w-full rounded-t-md bg-white/10"
                }
              />
              <span className="mt-2 font-tech text-[10px] font-semibold text-white/40">{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function WeeklyBookingsChart({
  data,
}: {
  data: { date: string; label: string; online: number; walkin: number; group: number; total: number }[];
}) {
  const max = Math.max(1, ...data.map((d) => d.total));
  return (
    <div className="rounded-2xl border border-white/10 bg-coal p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-tech text-xs font-bold uppercase tracking-[0.24em] text-white/45">Last 7 Days</p>
          <h3 className="mt-1 font-display text-base font-black uppercase">Weekly Bookings</h3>
        </div>
        <div className="flex flex-wrap items-center gap-3 font-tech text-[11px] font-bold uppercase tracking-wider text-white/60">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-blood" /> Online
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-amber-400" /> Walk-in
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-sky-400" /> Whole Lounge
          </span>
        </div>
      </div>

      <div className="mt-6 flex h-44 items-end gap-3">
        {data.map((row) => {
          const onlineH = (row.online / max) * 100;
          const walkinH = (row.walkin / max) * 100;
          const groupH = (row.group / max) * 100;
          return (
            <div key={row.date} className="group relative flex h-full flex-1 flex-col items-center justify-end">
              <div className="pointer-events-none absolute -top-8 z-10 hidden whitespace-nowrap rounded bg-black px-2 py-0.5 text-[10px] text-white ring-1 ring-white/20 group-hover:block">
                Online {row.online} · Walk-in {row.walkin} · Lounge {row.group}
              </div>
              <div className="flex h-full w-full max-w-[36px] flex-col justify-end gap-0.5">
                {row.group > 0 && <div style={{ height: `${groupH}%` }} className="w-full rounded-sm bg-sky-400" />}
                {row.walkin > 0 && <div style={{ height: `${walkinH}%` }} className="w-full rounded-sm bg-amber-400" />}
                {row.online > 0 && <div style={{ height: `${onlineH}%` }} className="w-full rounded-sm bg-blood" />}
                {row.total === 0 && <div className="h-[3%] w-full rounded-sm bg-white/10" />}
              </div>
              <span className="mt-2 font-tech text-[11px] font-semibold text-white/50">{row.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function MonthlyTrendChart({
  data,
}: {
  data: { date: string; label: string; bookings: number; revenue: number }[];
}) {
  const maxBookings = Math.max(1, ...data.map((d) => d.bookings));
  const w = 640;
  const h = 160;
  const pad = 12;
  const stepX = data.length > 1 ? (w - pad * 2) / (data.length - 1) : 0;

  const points = data.map((d, i) => {
    const x = pad + i * stepX;
    const y = h - pad - (d.bookings / maxBookings) * (h - pad * 2);
    return { x, y, ...d };
  });

  const polyline = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = points.length
    ? `M${points[0].x.toFixed(1)},${h - pad} ` +
      points.map((p) => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") +
      ` L${points[points.length - 1].x.toFixed(1)},${h - pad} Z`
    : "";

  return (
    <div className="rounded-2xl border border-white/10 bg-coal p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-tech text-xs font-bold uppercase tracking-[0.24em] text-white/45">Last 30 Days</p>
          <h3 className="mt-1 font-display text-base font-black uppercase">Monthly Booking Trend</h3>
        </div>
        <span className="font-tech text-xs font-bold uppercase tracking-wider text-white/60">
          Total: {data.reduce((s, d) => s + d.bookings, 0)} bookings
        </span>
      </div>

      <div className="mt-4 overflow-hidden">
        <svg viewBox={`0 0 ${w} ${h}`} className="h-44 w-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e50914" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#e50914" stopOpacity="0" />
            </linearGradient>
          </defs>
          <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
          <line x1={pad} y1={h / 2} x2={w - pad} y2={h / 2} stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
          {area && <path d={area} fill="url(#trendGrad)" />}
          {polyline && (
            <polyline fill="none" stroke="#e50914" strokeWidth="2.5" strokeLinejoin="round" points={polyline} />
          )}
        </svg>
        <div className="mt-1 flex justify-between font-tech text-[11px] text-white/40">
          <span>{data[0]?.label}</span>
          <span>{data[Math.floor(data.length / 2)]?.label}</span>
          <span>{data[data.length - 1]?.label}</span>
        </div>
      </div>
    </div>
  );
}

export function ConsoleSplitCard({ data }: { data: { name: string; bookings: number; revenue: number }[] }) {
  const totalBookings = Math.max(1, data.reduce((s, d) => s + d.bookings, 0));
  return (
    <div className="rounded-2xl border border-white/10 bg-coal p-5">
      <p className="font-tech text-xs font-bold uppercase tracking-[0.24em] text-white/45">Hardware Split</p>
      <h3 className="mt-1 font-display text-base font-black uppercase">PS4 vs PS4 Pro</h3>

      <div className="mt-5 space-y-4">
        {data.map((row, idx) => {
          const pct = Math.round((row.bookings / totalBookings) * 100);
          return (
            <div key={row.name}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-tech font-bold uppercase tracking-wider text-white">{row.name}</span>
                <span className="text-white/70">
                  {row.bookings} bookings · <Rupee />
                  {row.revenue.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  style={{ width: `${row.bookings > 0 ? Math.max(4, pct) : 0}%` }}
                  className={idx === 0 ? "h-full rounded-full bg-white/80" : "h-full rounded-full bg-blood"}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DistributionCard({
  eyebrow,
  title,
  items,
  isCurrency = false,
}: {
  eyebrow: string;
  title: string;
  items: { name: string; value: number }[];
  isCurrency?: boolean;
}) {
  const total = Math.max(1, items.reduce((s, i) => s + i.value, 0));
  const colors = ["bg-blood", "bg-amber-400", "bg-sky-400", "bg-emerald-400"];

  return (
    <div className="rounded-2xl border border-white/10 bg-coal p-5">
      <p className="font-tech text-xs font-bold uppercase tracking-[0.24em] text-white/45">{eyebrow}</p>
      <h3 className="mt-1 font-display text-base font-black uppercase">{title}</h3>

      <div className="mt-5 space-y-3.5">
        {items.map((item, idx) => {
          const pct = Math.round((item.value / total) * 100);
          return (
            <div key={item.name}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-tech font-bold uppercase tracking-wider text-white/80">{item.name}</span>
                <span className="font-semibold text-white">
                  {isCurrency && <Rupee />}
                  {item.value.toLocaleString("en-IN")} <span className="text-xs text-white/45">({item.value > 0 ? pct : 0}%)</span>
                </span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  style={{ width: `${item.value > 0 ? Math.max(3, pct) : 0}%` }}
                  className={`h-full rounded-full ${colors[idx % colors.length]}`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
