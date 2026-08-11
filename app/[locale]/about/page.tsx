import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about" });
  return {
    title: t("pageTitle"),
    description: t("pageSubtitle"),
  };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("about");

  return (
    <main className="animate-fade-in p-4 sm:p-6 lg:p-8">
      <article className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-2">
          <p className="text-sm text-discogs-text-secondary">
            <Link href="/" className="text-discogs-blue hover:underline">
              {t("backToSignIn")}
            </Link>
          </p>
          <h1 className="text-4xl font-bold text-discogs-text">
            {t("pageTitle")}
          </h1>
          <p className="text-lg text-discogs-text-secondary">
            {t("pageSubtitle")}
          </p>
        </header>

        {/*
          Prose sections that embed links are assembled from plain `t()`
          calls plus inline anchor JSX rather than `t.rich` with callbacks,
          because callback functions don't survive the RSC serialisation
          boundary in Next 16. Each linked phrase is split into before/link
          text/after keys per locale so the whole tree stays JSON-safe.
        */}
        <Section title={t("sectionWhatThisIs")}>
          <p>
            {t("whatThisIs")} {t("sourceOnGithubBefore")}
            <ExternalLink href="https://github.com/hansogj/discogs-nextjs-viewer">
              {t("githubLinkText")}
            </ExternalLink>
            {t("sourceOnGithubAfter")}
          </p>
        </Section>

        <Section title={t("sectionAttribution")}>
          {/*
            The Discogs TOU-mandated attribution phrase stays in English
            regardless of locale — it's a legal/trademark notice.
          */}
          <p className="rounded-md border border-discogs-border bg-discogs-bg-light p-4">
            This application uses Discogs&apos; API but is not affiliated with,
            sponsored or endorsed by Discogs.
          </p>
          <p>
            {t("attribExplanationBefore")}
            <ExternalLink href="https://www.discogs.com">
              {t("discogsLinkText")}
            </ExternalLink>
            {t("attribExplanationBetween")}
            <ExternalLink href="https://support.discogs.com/hc/en-us/articles/360009334593-API-Terms-of-Use">
              {t("touLinkText")}
            </ExternalLink>
            {t("attribExplanationAfter")}
          </p>
        </Section>

        <Section title={t("sectionWhatWeStore")}>
          <p>{t("storeIntro")}</p>
          <ul className="list-inside list-disc space-y-1 pl-2">
            <li>{t("storeItemCollection")}</li>
            <li>{t("storeItemWantlist")}</li>
            <li>{t("storeItemFolders")}</li>
            <li>{t("storeItemCustomFields")}</li>
            <li>{t("storeItemPrices")}</li>
            <li>{t("storeItemDetails")}</li>
          </ul>
          <p>{t("refreshPolicy")}</p>
          <p>{t("tokensPolicy")}</p>
          <p>{t("retentionPolicy")}</p>
          <p>{t("sharingPolicy")}</p>
        </Section>

        <Section title={t("sectionSessionCookie")}>
          <p>
            {t("cookieBody1prefix")}
            <code className="rounded bg-discogs-bg-light px-1 py-0.5 text-sm">
              discogs-viewer-session
            </code>
            {t("cookieBody1suffix")}
          </p>
          <p>{t("cookieBody2")}</p>
        </Section>

        <Section title={t("sectionHowToRemove")}>
          <ul className="list-inside list-disc space-y-1 pl-2">
            <li>
              <strong>{t("removeSignOutStrong")}</strong>
              {t("removeSignOutAfter")}
            </li>
            <li>
              <strong>{t("removeLeaveStrong")}</strong>
              {t("removeLeaveAfter")}
            </li>
            <li>
              {t("removeGithubIssueBefore")}
              <ExternalLink href="https://github.com/hansogj/discogs-nextjs-viewer/issues">
                {t("githubIssuesLinkText")}
              </ExternalLink>
              {t("removeGithubIssueAfter")}
            </li>
          </ul>
        </Section>

        <Section title={t("sectionThirdParty")}>
          <p>{t("thirdPartyBody")}</p>
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
