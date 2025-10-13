import AppLayout from '@/components/layout/AppLayout';
import { getCachedUserProfile } from '@/lib/data';
import Image from 'next/image';
import React from 'react';

const StatCard: React.FC<{
  label: string;
  value: string | number;
  icon: React.ReactNode;
}> = ({ label, value, icon }) => (
  <div className="flex flex-col items-center justify-center rounded-xl bg-discogs-bg p-4 text-center shadow-inner">
    <div className="mb-2 text-discogs-blue">{icon}</div>
    <p className="text-2xl font-bold text-white">{value}</p>
    <p className="text-xs text-discogs-text-secondary">{label}</p>
  </div>
);

export default async function UserProfilePage() {
  const profile = await getCachedUserProfile();

  if (!profile) {
    return (
      <AppLayout activeView="user">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-lg text-discogs-text-secondary">
            User profile not found.
          </p>
          <p className="mt-2 text-discogs-text-secondary">
            Please sync with Discogs to load your profile data.
          </p>
        </div>
      </AppLayout>
    );
  }

  const registeredDate = new Date(profile.registered).toLocaleDateString(
    'en-US',
    { year: 'numeric', month: 'long', day: 'numeric' },
  );

  return (
    <AppLayout activeView="user">
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-4xl">
          <header className="mb-8 flex flex-col items-center gap-6 sm:flex-row">
            <Image
              src={profile.avatar_url}
              alt={profile.username}
              width={128}
              height={128}
              className="h-32 w-32 rounded-full border-4 border-discogs-blue shadow-lg"
            />
            <div className="text-center sm:text-left">
              <h1 className="text-4xl font-bold text-white">
                {profile.name || profile.username}
              </h1>
              {profile.name && (
                <p className="text-lg text-discogs-text-secondary">
                  {profile.username}
                </p>
              )}
              {profile.location && (
                <p className="mt-1 text-sm text-discogs-text-secondary">
                  {profile.location}
                </p>
              )}
              <p className="mt-2 text-xs text-discogs-text-secondary/70">
                Member since {registeredDate}
              </p>
            </div>
          </header>

          {profile.profile && (
            <section className="mb-8 rounded-xl border border-discogs-border bg-discogs-bg-light p-6">
              <h2 className="mb-3 text-lg font-semibold text-discogs-blue">
                Profile
              </h2>
              <p className="whitespace-pre-wrap text-discogs-text">
                {profile.profile}
              </p>
            </section>
          )}

          <section>
            <h2 className="mb-4 text-xl font-semibold text-white">
              Discogs Stats
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              <StatCard
                label="In Collection"
                value={profile.num_collection}
                icon={
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-8 w-8"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                }
              />
              <StatCard
                label="In Wantlist"
                value={profile.num_wantlist}
                icon={
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-8 w-8"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                }
              />
              <StatCard
                label="Contributions"
                value={profile.releases_contributed}
                icon={
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-8 w-8"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                }
              />
              <StatCard
                label="Ratings"
                value={profile.releases_rated}
                icon={
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-8 w-8"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                    />
                  </svg>
                }
              />
              <StatCard
                label="Lists"
                value={profile.num_lists}
                icon={
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-8 w-8"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 10h16M4 14h16M4 18h16"
                    />
                  </svg>
                }
              />
            </div>
          </section>

          <footer className="mt-8 text-center">
            {(profile.home_page || profile.uri) && (
              <div className="space-x-4">
                {profile.home_page && (
                  <a
                    href={profile.home_page}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-discogs-blue hover:underline"
                  >
                    Personal Website
                  </a>
                )}
                {profile.uri && (
                  <a
                    href={profile.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-discogs-blue hover:underline"
                  >
                    View on Discogs
                  </a>
                )}
              </div>
            )}
          </footer>
        </div>
      </div>
    </AppLayout>
  );
}
