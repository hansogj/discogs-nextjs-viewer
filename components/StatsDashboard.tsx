"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { StatsPayload } from "@/lib/data";

interface StatsDashboardProps {
  stats: StatsPayload;
}

// Chart palette is theme-driven: 15 slots + "other". Kept in CSS variables
// (see app/globals.css) so each theme can pick its own ramp. We resolve
// them to concrete rgb() strings after mount because inline SVG/HTML
// `stroke`/`background` values can't accept `var(--x)` in every browser
// engine (Safari transitions in particular).
const PALETTE_VARS = Array.from({ length: 15 }, (_, i) => `--chart-${i + 1}`);
const OTHER_VAR = "--chart-other";

const useResolvedPalette = () => {
  const [palette, setPalette] = useState<{ ramp: string[]; other: string }>(
    () => ({
      ramp: PALETTE_VARS.map((v) => `var(${v})`),
      other: `var(${OTHER_VAR})`,
    }),
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    const compute = () => {
      const cs = getComputedStyle(document.documentElement);
      setPalette({
        ramp: PALETTE_VARS.map((v) => cs.getPropertyValue(v).trim() || "#888"),
        other: cs.getPropertyValue(OTHER_VAR).trim() || "#666",
      });
    };
    compute();
    // Re-resolve if the theme sub-menu flips data-theme on <html>.
    const obs = new MutationObserver(compute);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => obs.disconnect();
  }, []);
  return palette;
};

// Filter names used by /collection?<key>=<value>. AlbumViewer reads these
// on mount to seed its filter state.
const linkFor = (params: Record<string, string | number>) => {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) q.set(k, String(v));
  return `/collection?${q.toString()}`;
};

const BarRow = ({
  name,
  value,
  max,
  color,
  wide = false,
  href,
}: {
  name: string;
  value: number;
  max: number;
  color: string;
  wide?: boolean;
  href?: string;
}) => {
  const inner = (
    <>
      <div title={name} className="truncate text-sm text-discogs-text">
        {name}
      </div>
      <div
        className="overflow-hidden rounded bg-discogs-bg"
        style={{ height: wide ? 18 : 13 }}
      >
        <div
          className="h-full rounded transition-[width] duration-700 ease-out"
          style={{
            width: `${(value / Math.max(max, 1)) * 100}%`,
            background: color,
          }}
        />
      </div>
      <div className="text-right text-sm text-discogs-text-secondary">
        {value}
      </div>
    </>
  );
  const gridStyle = {
    gridTemplateColumns: wide ? "188px 1fr 44px" : "128px 1fr 38px",
    marginBottom: 9,
  } as const;

  if (href) {
    return (
      <Link
        href={href}
        className="grid items-center gap-2.5 rounded transition-colors hover:bg-discogs-bg/60"
        style={gridStyle}
        title={`Filter collection by ${name}`}
      >
        {inner}
      </Link>
    );
  }
  return (
    <div className="grid items-center gap-2.5" style={gridStyle}>
      {inner}
    </div>
  );
};

const VBars = ({
  data,
  highlight,
  primary,
  secondary,
  hrefFor,
}: {
  data: [string, number][];
  highlight?: (label: string) => boolean;
  primary: string;
  secondary: string;
  hrefFor?: (label: string) => string;
}) => {
  const max = Math.max(...data.map((d) => d[1]), 1);
  return (
    <div className="flex h-[200px] items-end gap-2 pt-1.5">
      {data.map(([label, val]) => {
        const bar = (
          <>
            <div className="text-xs text-discogs-text-secondary">{val}</div>
            <div
              title={`${label}: ${val}`}
              className="w-full max-w-[46px] rounded-t transition-[height] duration-700 ease-out"
              style={{
                background: highlight?.(label) ? primary : secondary,
                height: `${(val / max) * 100}%`,
              }}
            />
            <div className="text-xs text-discogs-text-secondary">{label}</div>
          </>
        );
        const href = hrefFor?.(label);
        return href ? (
          <Link
            key={label}
            href={href}
            className="flex h-full flex-1 flex-col items-center justify-end gap-2 rounded transition-colors hover:bg-discogs-bg/60"
            title={`Filter collection to ${label}`}
          >
            {bar}
          </Link>
        ) : (
          <div
            key={label}
            className="flex h-full flex-1 flex-col items-center justify-end gap-2"
          >
            {bar}
          </div>
        );
      })}
    </div>
  );
};

const Card = ({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children: React.ReactNode;
}) => (
  <div className="rounded-xl border border-discogs-border bg-discogs-bg-light p-4 shadow-lg sm:p-6">
    <h2 className="mb-1 text-xl font-semibold text-discogs-blue">{title}</h2>
    {sub && <p className="mb-5 text-sm text-discogs-text-secondary">{sub}</p>}
    {children}
  </div>
);

const MIN_STYLE_COUNT = 10;

const StatsDashboard: React.FC<StatsDashboardProps> = ({ stats }) => {
  const palette = useResolvedPalette();

  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    rootRef.current?.setAttribute("data-hydrated", "true");
  }, []);

  const artistDominantStyle = useMemo(
    () => new Map(stats.artistDominantStyle),
    [stats.artistDominantStyle],
  );

  // Only styles with MIN_STYLE_COUNT+ items get their own bar; the long tail
  // below that threshold is dropped entirely (per product intent — small
  // buckets are noise, not signal).
  const meaningfulStyles = useMemo(
    () => stats.styleCounts.filter(([, c]) => c >= MIN_STYLE_COUNT),
    [stats.styleCounts],
  );
  const maxPillars = Math.max(meaningfulStyles.length, 3);

  const [pillarCount, setPillarCount] = useState(maxPillars);
  // Reclamp during render when the underlying data (or filter threshold)
  // changes — see https://react.dev/learn/you-might-not-need-an-effect
  // (Adjusting state when a prop changes).
  const [prevMaxPillars, setPrevMaxPillars] = useState(maxPillars);
  if (prevMaxPillars !== maxPillars) {
    setPrevMaxPillars(maxPillars);
    setPillarCount((c) => Math.min(Math.max(c, 3), maxPillars));
  }

  const pillars = useMemo(() => {
    const top = meaningfulStyles
      .slice(0, pillarCount)
      .map(([name, count], i) => ({
        name,
        count,
        // Cycle the palette when pillar count exceeds ramp length so every
        // bar still gets a distinct colour.
        color: palette.ramp[i % palette.ramp.length] ?? palette.other,
      }));
    const otherCount = meaningfulStyles
      .slice(pillarCount)
      .reduce((sum, [, c]) => sum + c, 0);
    if (otherCount > 0) {
      top.push({ name: "Andre", count: otherCount, color: palette.other });
    }
    return top;
  }, [meaningfulStyles, pillarCount, palette]);

  const pillarColorByStyle = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of pillars) {
      if (p.name !== "Andre") m.set(p.name, p.color);
    }
    return m;
  }, [pillars]);

  const topArtists = stats.artistCounts;
  const topLabels = stats.labelCounts;
  const decades = stats.decadeCounts;
  const conditions = stats.conditionCounts;

  const formats = useMemo(() => {
    const order = ["Vinyl", "CD", "Annet"];
    const map = new Map(stats.formatCounts);
    return order
      .map((k) => [k, map.get(k) ?? 0] as [string, number])
      .filter(([, v]) => v > 0);
  }, [stats.formatCounts]);

  const pillarMax = Math.max(...pillars.map((p) => p.count), 1);
  const artistMax = topArtists[0]?.[1] ?? 1;
  const labelMax = topLabels[0]?.[1] ?? 1;
  const condMax = conditions[0]?.[1] ?? 1;

  const formatTotal = formats.reduce((s, [, v]) => s + v, 0);
  const donutR = 64;

  const formatLinkFor = (label: string) => {
    // The stats page groups vinyl formats into a single "Vinyl" family;
    // AlbumViewer's format filter matches on the raw format name, so we
    // send the whole family as comma-separated values.
    if (label === "Vinyl") return linkFor({ format: 'Vinyl,LP,12",7",10"' });
    if (label === "CD") return linkFor({ format: "CD,CDr,SACD" });
    return undefined;
  };

  return (
    <div ref={rootRef} className="p-4 sm:p-6">
      <h1 className="mb-6 text-2xl font-bold text-discogs-text">Statistikk</h1>

      {/* stat cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          [stats.totalReleases.toLocaleString("no-NO"), "Utgivelser"],
          [stats.uniqueArtists.toLocaleString("no-NO"), "Unike artister"],
          [stats.uniqueLabels.toLocaleString("no-NO"), "Plateselskaper"],
          [`${stats.vinylPct} %`, "Vinyl"],
        ].map(([n, l]) => (
          <div
            key={l}
            className="rounded-xl border border-discogs-border bg-discogs-bg-light p-4 shadow-lg"
          >
            <div className="text-3xl font-bold text-discogs-text">{n}</div>
            <div className="mt-1 text-xs text-discogs-text-secondary">{l}</div>
          </div>
        ))}
      </div>

      {/* pillar card */}
      <Card
        title="Samlingens søyler"
        sub={`Discogs-stiler med minst ${MIN_STYLE_COUNT} utgivelser, rangert etter antall · klikk en stil for å filtrere samlingen`}
      >
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <label className="text-sm text-discogs-text-secondary">
            Antall søyler
          </label>
          <input
            type="range"
            min={3}
            max={maxPillars}
            value={pillarCount}
            onChange={(e) => setPillarCount(parseInt(e.target.value, 10))}
            className="max-w-[280px] flex-1"
            style={{ accentColor: palette.ramp[0] }}
          />
          <span className="min-w-[28px] text-right text-lg font-semibold text-discogs-text">
            {pillarCount}
          </span>
        </div>

        <div className="mb-5 mt-0.5 flex h-[34px] overflow-hidden rounded-md border border-discogs-border">
          {pillars.map((p) => {
            const total = pillars.reduce((s, x) => s + x.count, 0);
            const w = total > 0 ? (p.count / total) * 100 : 0;
            return (
              <div
                key={p.name}
                title={`${p.name}: ${p.count}`}
                className="transition-[width] duration-1000 ease-out"
                style={{ background: p.color, width: `${w}%` }}
              />
            );
          })}
        </div>

        {pillars.map((p) => (
          <BarRow
            key={p.name}
            name={p.name}
            value={p.count}
            max={pillarMax}
            color={p.color}
            wide
            href={p.name === "Andre" ? undefined : linkFor({ style: p.name })}
          />
        ))}
      </Card>

      {/* artists + labels */}
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card
          title="Mest samlede artister"
          sub="Topp 20, farget etter dominerende stil · klikk for å filtrere"
        >
          {topArtists.map(([name, val]) => {
            const dominant = artistDominantStyle.get(name);
            const color =
              dominant && pillarColorByStyle.has(dominant)
                ? (pillarColorByStyle.get(dominant) ?? palette.other)
                : palette.other;
            return (
              <BarRow
                key={name}
                name={name}
                value={val}
                max={artistMax}
                color={color}
                href={linkFor({ artist: name })}
              />
            );
          })}
        </Card>
        <Card
          title="Mest samlede selskaper"
          sub="Topp 20 · klikk for å filtrere"
        >
          {topLabels.map(([name, val]) => (
            <BarRow
              key={name}
              name={name}
              value={val}
              max={labelMax}
              color={palette.ramp[0]}
              href={linkFor({ label: name })}
            />
          ))}
        </Card>
      </div>

      {decades.length > 0 && (
        <div className="mt-6">
          <Card
            title="Utgivelser per tiår"
            sub="Når musikken opprinnelig kom ut · klikk et tiår for å filtrere"
          >
            <VBars
              data={decades}
              primary={palette.ramp[0]}
              secondary={palette.ramp[1]}
              highlight={(l) => {
                const peak = decades.reduce(
                  (acc, [, v]) => Math.max(acc, v),
                  0,
                );
                return decades.find(([lab]) => lab === l)?.[1] === peak;
              }}
              hrefFor={(label) => linkFor({ decade: label })}
            />
          </Card>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card title="Format" sub="Vinyl, CD og annet · klikk for å filtrere">
          <div className="flex flex-wrap items-center gap-6">
            <svg width={180} height={180} viewBox="0 0 180 180">
              {(() => {
                let cum = 0;
                return formats.map(([label, val]) => {
                  const frac = formatTotal > 0 ? val / formatTotal : 0;
                  const a0 = (cum - 0.25) * 2 * Math.PI;
                  cum += frac;
                  const a1 = (cum - 0.25) * 2 * Math.PI;
                  const x0 = 90 + donutR * Math.cos(a0);
                  const y0 = 90 + donutR * Math.sin(a0);
                  const x1 = 90 + donutR * Math.cos(a1);
                  const y1 = 90 + donutR * Math.sin(a1);
                  const large = frac > 0.5 ? 1 : 0;
                  const color =
                    label === "Vinyl"
                      ? palette.ramp[0]
                      : label === "CD"
                        ? palette.ramp[1]
                        : palette.other;
                  return (
                    <path
                      key={label}
                      d={`M ${x0} ${y0} A ${donutR} ${donutR} 0 ${large} 1 ${x1} ${y1}`}
                      stroke={color}
                      strokeWidth={26}
                      fill="none"
                    />
                  );
                });
              })()}
              <text
                x={90}
                y={92}
                textAnchor="middle"
                className="fill-discogs-text"
                fontSize={28}
                fontWeight={700}
              >
                {stats.vinylPct}%
              </text>
              <text
                x={90}
                y={112}
                textAnchor="middle"
                className="fill-discogs-text-secondary"
                fontSize={11}
              >
                Vinyl
              </text>
            </svg>
            <div className="flex flex-col gap-3 text-sm">
              {formats.map(([label, val]) => {
                const pct =
                  formatTotal > 0 ? Math.round((val / formatTotal) * 100) : 0;
                const color =
                  label === "Vinyl"
                    ? palette.ramp[0]
                    : label === "CD"
                      ? palette.ramp[1]
                      : palette.other;
                const href = formatLinkFor(label);
                const content = (
                  <>
                    <span
                      className="h-3 w-3 rounded"
                      style={{ background: color }}
                    />
                    <span>{label}</span>
                    <span className="ml-auto pl-4 text-discogs-text-secondary">
                      {val} · {pct}%
                    </span>
                  </>
                );
                return href ? (
                  <Link
                    key={label}
                    href={href}
                    className="flex items-center gap-2.5 rounded px-1 py-0.5 hover:bg-discogs-bg/60"
                    title={`Filter collection to ${label}`}
                  >
                    {content}
                  </Link>
                ) : (
                  <div
                    key={label}
                    className="flex items-center gap-2.5 px-1 py-0.5"
                  >
                    {content}
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
        {conditions.length > 0 && (
          <Card title="Tilstand" sub="Discogs media-gradering">
            {conditions.map(([name, val]) => (
              <BarRow
                key={name}
                name={name}
                value={val}
                max={condMax}
                color={palette.ramp[1]}
              />
            ))}
          </Card>
        )}
      </div>

      <footer className="mt-10 border-t border-discogs-border pt-4 text-sm text-discogs-text-secondary">
        Søyler utledet fra Discogs-stiler i samlingen din · juster glidebryteren
        for å endre granularitet
      </footer>
    </div>
  );
};

export default StatsDashboard;
