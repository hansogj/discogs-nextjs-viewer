import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About — Discogs Collection Viewer",
  description:
    "About this application, how it uses the Discogs API, and what data it stores.",
};

export default function AboutPage() {
  return (
    <main className="animate-fade-in p-4 sm:p-6 lg:p-8">
      <article className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-2">
          <p className="text-sm text-discogs-text-secondary">
            <Link href="/" className="text-discogs-blue hover:underline">
              ← Back to sign in
            </Link>
          </p>
          <h1 className="text-4xl font-bold text-discogs-text">
            About this application
          </h1>
          <p className="text-lg text-discogs-text-secondary">
            A personal viewer for your Discogs vinyl collection and wantlist.
          </p>
        </header>

        <Section title="What this is">
          <p>
            Discogs Viewer is a personal-scale web application for browsing your
            own Discogs collection and wantlist with filtering, sorting, and
            statistics that go beyond what the Discogs site itself offers.
            Source code lives on{" "}
            <ExternalLink href="https://github.com/hansogj/discogs-nextjs-viewer">
              GitHub
            </ExternalLink>
            .
          </p>
        </Section>

        <Section title="Discogs attribution">
          <p className="rounded-md border border-discogs-border bg-discogs-bg-light p-4">
            This application uses Discogs&apos; API but is not affiliated with,
            sponsored or endorsed by Discogs.
          </p>
          <p>
            Discogs® is a registered trademark of Zink Media, LLC. Their public
            site lives at{" "}
            <ExternalLink href="https://www.discogs.com">
              discogs.com
            </ExternalLink>{" "}
            and their API terms of use are documented at{" "}
            <ExternalLink href="https://support.discogs.com/hc/en-us/articles/360009334593-API-Terms-of-Use">
              support.discogs.com
            </ExternalLink>
            .
          </p>
        </Section>

        <Section title="What we store">
          <p>
            When you sign in and trigger a sync, the server writes the following
            per-user JSON files, keyed by your Discogs username, to a local
            cache directory:
          </p>
          <ul className="list-inside list-disc space-y-1 pl-2">
            <li>Your collection release list (with folder + notes metadata)</li>
            <li>Your wantlist release list</li>
            <li>Your collection folders</li>
            <li>Your custom-field definitions</li>
            <li>Wantlist price snapshots</li>
            <li>
              Per-release and per-master detail metadata for items already in
              your lists
            </li>
          </ul>
          <p>
            To comply with the Discogs API terms of use, cached data is
            automatically refreshed at least every 6 hours — any page load
            triggers a re-sync if the last one was longer ago than that. A fresh
            sync also runs automatically when you sign in.
          </p>
          <p>
            Ephemeral job state (sync progress) lives in Redis with a 1-hour
            expiry. No copy of your Discogs OAuth tokens is written to disk;
            they live only inside the encrypted session cookie described below.
          </p>
          <p>
            No analytics or third-party trackers are loaded. No data is shared
            with any party other than Discogs (whose API returned it).
          </p>
        </Section>

        <Section title="The session cookie">
          <p>
            A single HTTP-only, encrypted session cookie named{" "}
            <code className="rounded bg-discogs-bg-light px-1 py-0.5 text-sm">
              discogs-viewer-session
            </code>{" "}
            is used to keep you signed in. It expires 8 hours after issue and is
            not readable by JavaScript. It carries your Discogs OAuth access
            token and username so the server can talk to Discogs on your behalf;
            it is not used for advertising or tracking.
          </p>
          <p>
            This is a functional cookie required for the application to work. No
            consent banner is shown for it because no non-functional cookies are
            set.
          </p>
        </Section>

        <Section title="How to remove your data">
          <ul className="list-inside list-disc space-y-1 pl-2">
            <li>
              <strong>Sign out</strong> from the header menu — this destroys the
              session cookie immediately.
            </li>
            <li>
              <strong>Clear cache</strong> from the header menu — this deletes
              all cached JSON files for your username plus any ephemeral Redis
              state.
            </li>
            <li>
              To request full removal (including any residual on-disk files from
              an inactive account), open an issue on the{" "}
              <ExternalLink href="https://github.com/hansogj/discogs-nextjs-viewer/issues">
                GitHub repository
              </ExternalLink>
              .
            </li>
          </ul>
        </Section>

        <Section title="Third-party links">
          <p>
            Item cards link out to their release pages on discogs.com. No other
            third-party services are contacted.
          </p>
        </Section>
      </article>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold text-discogs-blue">{title}</h2>
      <div className="space-y-3 text-discogs-text">{children}</div>
    </section>
  );
}

function ExternalLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-discogs-blue hover:underline"
    >
      {children}
    </a>
  );
}
