import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import LoginForm from '@/components/auth/LoginForm';

export default async function LoginPage() {
  const session = await getSession();

  if (session.isLoggedIn) {
    redirect('/collection');
  }

  return (
    <main className="flex min-h-screen animate-fade-in items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-discogs-border bg-discogs-bg-light p-8 shadow-2xl shadow-black/30">
        <h1 className="mb-2 text-center text-3xl font-bold text-discogs-blue">
          Discogs Viewer
        </h1>
        <p className="mb-8 text-center text-discogs-text-secondary">
          Enter your Personal Access Token to continue.
        </p>
        <LoginForm />
        <p className="mt-6 text-center text-xs text-discogs-text-secondary/70">
          You can generate a token in your Discogs account under Settings &gt;
          Developers.
        </p>
      </div>
    </main>
  );
}
