'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type {
  CollectionRelease,
  ProcessedWantlistItem,
} from '@/lib/types';

interface StatsDashboardProps {
  collection: CollectionRelease[];
  wantlist: ProcessedWantlistItem[];
}

// Chart-color palette (extends the two main accent tokens into a 15-slot
// jewel/earth ramp for pillar bars). Tailwind tokens cover all UI chrome.
const PALETTE = [
  '#e8a33d', // amber (= discogs-blue token)
  '#5fb6a8', // teal  (= discogs-teal token)
  '#c56a1e', // burnt orange
  '#9e6b86', // mauve
  '#f4d08a', // light amber
  '#2f8074', // dark teal
  '#c4694e', // terracotta
  '#a07a33', // dark gold
  '#8e7cc3', // lavender
  '#6fa8dc', // sky
  '#b45f06', // rust
  '#674ea7', // purple
  '#76a5af', // slate teal
  '#cc7a6f', // coral
  '#38761d', // moss
];
const OTHER_COLOR = '#7d7259';

const COND_LABELS = [
  'Mint (M)',
  'Near Mint (NM or M-)',
  'Very Good Plus (VG+)',
  'Very Good (VG)',
  'Good Plus (G+)',
  'Good (G)',
  'Fair (F)',
  'Poor (P)',
];

const VINYL_FORMATS = new Set(['Vinyl', 'LP', '12"', '7"', '10"']);
const CD_FORMATS = new Set(['CD', 'CDr', 'SACD']);

const formatFamily = (name: string | undefined): string => {
  if (!name) return 'Annet';
  if (VINYL_FORMATS.has(name)) return 'Vinyl';
  if (CD_FORMATS.has(name)) return 'CD';
  return 'Annet';
};

const StatsDashboard: React.FC<StatsDashboardProps> = ({ collection }) => {
  const [pillarCount, setPillarCount] = useState(8);

  // data-hydrated flag — flips to "true" after client mount. Tests wait on
  // this before interacting with the slider; before hydration the input's
  // onChange handler isn't wired up yet.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);

  const stats = useMemo(() => {
    const artistCounts = new Map<string, number>();
    const labelCounts = new Map<string, number>();
    const styleCounts = new Map<string, number>();
    const decadeCounts = new Map<string, number>();
    const formatCounts = new Map<string, number>();
    const conditionCounts = new Map<string, number>();
    const artistStyles = new Map<string, Map<string, number>>();

    for (const item of collection) {
      const info = item.basic_information;

      const primaryArtist = info.artists?.[0]?.name;
      if (primaryArtist && primaryArtist !== 'Various') {
        artistCounts.set(
          primaryArtist,
          (artistCounts.get(primaryArtist) ?? 0) + 1,
        );
      }

      const primaryLabel = info.labels?.[0]?.name;
      if (primaryLabel) {
        labelCounts.set(
          primaryLabel,
          (labelCounts.get(primaryLabel) ?? 0) + 1,
        );
      }

      const styles = item.details?.styles ?? [];
      for (const s of styles) {
        styleCounts.set(s, (styleCounts.get(s) ?? 0) + 1);
        if (primaryArtist && primaryArtist !== 'Various') {
          if (!artistStyles.has(primaryArtist)) {
            artistStyles.set(primaryArtist, new Map());
          }
          const m = artistStyles.get(primaryArtist)!;
          m.set(s, (m.get(s) ?? 0) + 1);
        }
      }

      const year = info.year;
      if (year && year > 1900) {
        const decade = `${Math.floor(year / 10) * 10}s`;
        decadeCounts.set(decade, (decadeCounts.get(decade) ?? 0) + 1);
      }

      const fmt = formatFamily(info.formats?.[0]?.name);
      formatCounts.set(fmt, (formatCounts.get(fmt) ?? 0) + 1);

      for (const n of item.notes ?? []) {
        if (COND_LABELS.includes(n.value)) {
          conditionCounts.set(
            n.value,
            (conditionCounts.get(n.value) ?? 0) + 1,
          );
          break;
        }
      }
    }

    return {
      artistCounts,
      labelCounts,
      styleCounts,
      decadeCounts,
      formatCounts,
      conditionCounts,
      artistStyles,
      totalReleases: collection.length,
      uniqueArtists: artistCounts.size,
      uniqueLabels: labelCounts.size,
    };
  }, [collection]);

  const sortedDesc = <K,>(m: Map<K, number>) =>
    Array.from(m.entries()).sort((a, b) => b[1] - a[1]);

  const pillars = useMemo(() => {
    const sorted = sortedDesc(stats.styleCounts);
    const top = sorted.slice(0, pillarCount).map(([name, count], i) => ({
      name,
      count,
      color: PALETTE[i] ?? OTHER_COLOR,
    }));
    const otherCount = sorted
      .slice(pillarCount)
      .reduce((sum, [, c]) => sum + c, 0);
    if (otherCount > 0) {
      top.push({ name: 'Andre', count: otherCount, color: OTHER_COLOR });
    }
    return top;
  }, [stats.styleCounts, pillarCount]);

  const pillarColorByStyle = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of pillars) {
      if (p.name !== 'Andre') m.set(p.name, p.color);
    }
    return m;
  }, [pillars]);

  const dominantStyleForArtist = (artist: string): string | undefined => {
    const styles = stats.artistStyles.get(artist);
    if (!styles) return undefined;
    let best: { name: string; count: number } | null = null;
    for (const [s, c] of styles) {
      if (pillarColorByStyle.has(s) && (!best || c > best.count)) {
        best = { name: s, count: c };
      }
    }
    return best?.name;
  };

  const topArtists = useMemo(
    () => sortedDesc(stats.artistCounts).slice(0, 20),
    [stats.artistCounts],
  );
  const topLabels = useMemo(
    () => sortedDesc(stats.labelCounts).slice(0, 20),
    [stats.labelCounts],
  );
  const decades = useMemo(
    () =>
      Array.from(stats.decadeCounts.entries()).sort((a, b) =>
        a[0].localeCompare(b[0]),
      ),
    [stats.decadeCounts],
  );
  const conditions = useMemo(
    () => sortedDesc(stats.conditionCounts),
    [stats.conditionCounts],
  );
  const formats = useMemo(() => {
    const order = ['Vinyl', 'CD', 'Annet'];
    return order
      .map((k) => [k, stats.formatCounts.get(k) ?? 0] as [string, number])
      .filter(([, v]) => v > 0);
  }, [stats.formatCounts]);

  const vinylPct =
    stats.totalReleases > 0
      ? Math.round(
          ((stats.formatCounts.get('Vinyl') ?? 0) / stats.totalReleases) * 100,
        )
      : 0;

  const BarRow = ({
    name,
    value,
    max,
    color,
    wide = false,
  }: {
    name: string;
    value: number;
    max: number;
    color: string;
    wide?: boolean;
  }) => (
    <div
      className="grid items-center gap-2.5"
      style={{
        gridTemplateColumns: wide ? '188px 1fr 44px' : '128px 1fr 38px',
        marginBottom: 9,
      }}
    >
      <div
        title={name}
        className="truncate text-[13px] text-discogs-text"
      >
        {name}
      </div>
      <div
        className="overflow-hidden rounded-[3px] bg-discogs-bg"
        style={{ height: wide ? 18 : 13 }}
      >
        <div
          className="h-full rounded-[3px] transition-[width] duration-700 ease-out"
          style={{
            width: `${(value / Math.max(max, 1)) * 100}%`,
            background: color,
          }}
        />
      </div>
      <div className="text-right font-mono text-xs text-discogs-text-secondary">
        {value}
      </div>
    </div>
  );

  const VBars = ({
    data,
    highlight,
  }: {
    data: [string, number][];
    highlight?: (label: string) => boolean;
  }) => {
    const max = Math.max(...data.map((d) => d[1]), 1);
    return (
      <div className="flex h-[200px] items-end gap-2 pt-1.5">
        {data.map(([label, val]) => (
          <div
            key={label}
            className="flex h-full flex-1 flex-col items-center justify-end gap-2"
          >
            <div className="font-mono text-[11px] text-discogs-text-secondary">
              {val}
            </div>
            <div
              title={`${label}: ${val}`}
              className="w-full max-w-[46px] rounded-t transition-[height] duration-700 ease-out"
              style={{
                background: highlight?.(label) ? PALETTE[0] : PALETTE[1],
                height: `${(val / max) * 100}%`,
              }}
            />
            <div className="font-mono text-[11px] text-discogs-text-secondary">
              {label}
            </div>
          </div>
        ))}
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
    <div className="rounded-xl border border-discogs-border bg-discogs-bg-light p-6">
      <h2 className="mb-1 font-serif text-xl font-semibold text-discogs-text">
        {title}
      </h2>
      {sub && (
        <p className="mb-5 text-[13px] text-discogs-text-secondary">{sub}</p>
      )}
      {children}
    </div>
  );

  const pillarMax = Math.max(...pillars.map((p) => p.count), 1);
  const artistMax = topArtists[0]?.[1] ?? 1;
  const labelMax = topLabels[0]?.[1] ?? 1;
  const condMax = conditions[0]?.[1] ?? 1;

  const formatTotal = formats.reduce((s, [, v]) => s + v, 0);
  const donutR = 64;

  return (
    <div
      data-hydrated={hydrated ? 'true' : undefined}
      className="min-h-full px-[clamp(20px,4vw,56px)] py-[clamp(20px,4vw,56px)]"
    >
      <div className="mx-auto max-w-[1080px]">
        <p className="mb-4 font-mono text-xs uppercase tracking-[0.28em] text-discogs-blue">
          Platesamling · Discogs
        </p>
        <h1 className="mb-4 font-serif font-black leading-[0.92] tracking-tight text-discogs-text [font-size:clamp(38px,8vw,82px)]">
          {stats.totalReleases.toLocaleString('no-NO')} plater,
          <br />
          <em className="font-normal italic text-discogs-blue">
            {pillarCount} søyler.
          </em>
        </h1>
        <p className="mb-10 max-w-[58ch] text-discogs-text-secondary [font-size:clamp(15px,1.6vw,18px)]">
          Velg hvor mange søyler du vil bryte ned samlingen i — fra grove
          familier til finkornet sjangerprofil.
        </p>

        {/* stat cards */}
        <div className="mb-8 grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-discogs-border bg-discogs-border sm:grid-cols-4">
          {[
            [stats.totalReleases.toLocaleString('no-NO'), 'Utgivelser'],
            [stats.uniqueArtists.toLocaleString('no-NO'), 'Unike artister'],
            [stats.uniqueLabels.toLocaleString('no-NO'), 'Plateselskaper'],
            [`${vinylPct} %`, 'Vinyl'],
          ].map(([n, l]) => (
            <div key={l} className="bg-discogs-bg-light px-4 py-5">
              <div className="font-serif font-semibold leading-none [font-size:clamp(26px,4vw,40px)]">
                {n}
              </div>
              <div className="mt-2 font-mono text-[11px] uppercase tracking-[0.12em] text-discogs-text-secondary">
                {l}
              </div>
            </div>
          ))}
        </div>

        {/* pillar card */}
        <Card
          title="Samlingens søyler"
          sub="Topp Discogs-stiler i samlingen, rangert etter antall utgivelser"
        >
          <div className="mb-4 flex flex-wrap items-center gap-3.5">
            <label className="font-mono text-[11px] uppercase tracking-[0.14em] text-discogs-text-secondary">
              Antall søyler
            </label>
            <input
              type="range"
              min={3}
              max={15}
              value={pillarCount}
              onChange={(e) => setPillarCount(parseInt(e.target.value, 10))}
              className="max-w-[280px] flex-1"
              style={{ accentColor: PALETTE[0] }}
            />
            <span className="min-w-[28px] text-right font-serif text-[22px] text-discogs-text">
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
            />
          ))}
        </Card>

        {/* artists + labels */}
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card title="Mest samlede artister" sub="Topp 20, farget etter dominerende stil">
            {topArtists.map(([name, val]) => {
              const dominant = dominantStyleForArtist(name);
              const color = dominant
                ? pillarColorByStyle.get(dominant) ?? OTHER_COLOR
                : OTHER_COLOR;
              return (
                <BarRow
                  key={name}
                  name={name}
                  value={val}
                  max={artistMax}
                  color={color}
                />
              );
            })}
          </Card>
          <Card title="Mest samlede selskaper" sub="Topp 20">
            {topLabels.map(([name, val]) => (
              <BarRow
                key={name}
                name={name}
                value={val}
                max={labelMax}
                color={PALETTE[0]}
              />
            ))}
          </Card>
        </div>

        {decades.length > 0 && (
          <div className="mt-6">
            <Card title="Utgivelser per tiår" sub="Når musikken opprinnelig kom ut">
              <VBars
                data={decades}
                highlight={(l) => {
                  const peak = decades.reduce(
                    (acc, [, v]) => Math.max(acc, v),
                    0,
                  );
                  return decades.find(([lab]) => lab === l)?.[1] === peak;
                }}
              />
            </Card>
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card title="Format" sub="Vinyl, CD og annet">
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
                      label === 'Vinyl'
                        ? PALETTE[0]
                        : label === 'CD'
                          ? PALETTE[1]
                          : OTHER_COLOR;
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
                  className="fill-discogs-text font-serif"
                  fontSize={30}
                  fontWeight={600}
                >
                  {vinylPct}%
                </text>
                <text
                  x={90}
                  y={114}
                  textAnchor="middle"
                  className="fill-discogs-text-secondary font-mono"
                  fontSize={10}
                  letterSpacing="1.5"
                >
                  VINYL
                </text>
              </svg>
              <div className="flex flex-col gap-3 text-sm">
                {formats.map(([label, val]) => {
                  const pct =
                    formatTotal > 0
                      ? Math.round((val / formatTotal) * 100)
                      : 0;
                  const color =
                    label === 'Vinyl'
                      ? PALETTE[0]
                      : label === 'CD'
                        ? PALETTE[1]
                        : OTHER_COLOR;
                  return (
                    <div
                      key={label}
                      className="flex items-center gap-2.5"
                    >
                      <span
                        className="h-[11px] w-[11px] rounded-[3px]"
                        style={{ background: color }}
                      />
                      <span>{label}</span>
                      <span className="ml-auto pl-4 font-mono text-discogs-text-secondary">
                        {val} · {pct}%
                      </span>
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
                  color={PALETTE[1]}
                />
              ))}
            </Card>
          )}
        </div>

        <footer className="mt-14 border-t border-discogs-border pt-5 font-mono text-xs tracking-wider text-discogs-text-secondary">
          Søyler utledet fra Discogs-stiler i samlingen din · juster
          glidebryteren for å endre granularitet
        </footer>
      </div>
    </div>
  );
};

export default StatsDashboard;
