import { getIronSession } from "iron-session";
import { redirect } from "next/navigation";
import Login from "@/components/Login";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session-options";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions,
  );

  const isTokenLoggedIn = !!session.token && !!session.user;
  const isOAuthLoggedIn =
    !!session.accessToken && !!session.accessTokenSecret && !!session.user;

  if (isTokenLoggedIn || isOAuthLoggedIn) {
    redirect("/collection");
  }

  return (
    <main className="flex min-h-screen animate-fade-in items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-discogs-border bg-discogs-bg-light p-8 shadow-2xl shadow-black/30">
        <h1 className="mb-2 text-center text-3xl font-bold text-discogs-blue">
          Discogs Viewer
        </h1>
        <p className="mb-8 text-center text-discogs-text-secondary">
          Connect your Discogs account to view your collection and wantlist.
        </p>
        <Login /> {/* Use the new Login component */}
        <p className="mt-6 text-center text-xs text-discogs-text-secondary/70">
          This application uses Discogs OAuth to securely access your data.
        </p>
      </div>
    </main>
  );
}
