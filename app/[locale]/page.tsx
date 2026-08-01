import { getIronSession } from "iron-session";
import Login from "@/components/Login";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session-options";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions,
  );

  const isTokenLoggedIn = !!session.token && !!session.user;
  const isOAuthLoggedIn =
    !!session.accessToken && !!session.accessTokenSecret && !!session.user;

  if (isTokenLoggedIn || isOAuthLoggedIn) {
    redirect({ href: "/collection", locale });
  }

  const t = await getTranslations("login");

  return (
    <main className="flex min-h-screen animate-fade-in items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-discogs-border bg-discogs-bg-light p-8 shadow-2xl shadow-black/30">
        <h1 className="mb-2 text-center text-3xl font-bold text-discogs-blue">
          {t("title")}
        </h1>
        <p className="mb-8 text-center text-discogs-text-secondary">
          {t("subtitle")}
        </p>
        <Login />
        <p className="mt-6 text-center text-xs text-discogs-text-secondary/70">
          {t("oauthNote")}
        </p>
      </div>
    </main>
  );
}
