import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import LoginForm from "@/components/auth/LoginForm";

export default async function LoginPage() {
  const session = await getSession();

  if (session.isLoggedIn) {
    redirect("/collection");
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-md bg-discogs-bg-light rounded-2xl shadow-2xl shadow-black/30 p-8 border border-discogs-border">
        <h1 className="text-3xl font-bold text-center mb-2 text-discogs-blue">Discogs Viewer</h1>
        <p className="text-center text-discogs-text-secondary mb-8">
          Enter your Personal Access Token to continue.
        </p>
        <LoginForm />
        <p className="text-xs text-discogs-text-secondary/70 mt-6 text-center">
          You can generate a token in your Discogs account under Settings &gt; Developers.
        </p>
      </div>
    </main>
  );
}