import React from 'react';
import type { DiscogsUser } from '../types';
import { ViewType } from '../types';

interface HeaderProps {
  user: DiscogsUser;
  onLogout: () => void;
  onViewChange: (view: ViewType) => void;
  activeView: ViewType;
  collectionCount: number;
  wantlistCount: number;
}

const Header: React.FC<HeaderProps> = ({
  user,
  onLogout,
  onViewChange,
  activeView,
  collectionCount,
  wantlistCount,
}) => {
  const buttonBaseClasses =
    'focus:outline-none rounded-md px-4 py-2 text-sm font-medium transition-colors duration-200 focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-gray-800';
  const activeButtonClasses = 'bg-sky-600 text-white';
  const inactiveButtonClasses = 'bg-gray-700 text-gray-300 hover:bg-gray-600';

  return (
    <header className="sticky top-0 z-10 border-b border-gray-700 bg-gray-800/80 p-4 shadow-lg backdrop-blur-sm">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <img
            src={user.avatar_url}
            alt={user.username}
            className="h-12 w-12 rounded-full border-2 border-sky-500"
          />
          <div>
            <p className="font-semibold text-white">{user.username}</p>
            <p className="text-sm text-gray-400">Discogs User</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 rounded-lg border border-gray-700 bg-gray-900/50 p-1">
          <button
            onClick={() => onViewChange(ViewType.COLLECTION)}
            className={`${buttonBaseClasses} ${
              activeView === ViewType.COLLECTION
                ? activeButtonClasses
                : inactiveButtonClasses
            }`}
          >
            Collection{' '}
            <span className="ml-2 rounded-full bg-gray-600 px-2 py-0.5 text-xs font-bold text-gray-200">
              {collectionCount}
            </span>
          </button>
          <button
            onClick={() => onViewChange(ViewType.WANTLIST)}
            className={`${buttonBaseClasses} ${
              activeView === ViewType.WANTLIST
                ? activeButtonClasses
                : inactiveButtonClasses
            }`}
          >
            Wantlist{' '}
            <span className="ml-2 rounded-full bg-gray-600 px-2 py-0.5 text-xs font-bold text-gray-200">
              {wantlistCount}
            </span>
          </button>
        </div>

        <button
          onClick={onLogout}
          className="rounded-lg bg-red-600 px-4 py-2 font-bold text-white transition-colors duration-300 hover:bg-red-700"
        >
          Logout
        </button>
      </div>
    </header>
  );
};

export default Header;
