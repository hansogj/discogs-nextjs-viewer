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

const Header: React.FC<HeaderProps> = ({ user, onLogout, onViewChange, activeView, collectionCount, wantlistCount }) => {
  const buttonBaseClasses = "px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-sky-500";
  const activeButtonClasses = "bg-sky-600 text-white";
  const inactiveButtonClasses = "bg-gray-700 text-gray-300 hover:bg-gray-600";

  return (
    <header className="bg-gray-800/80 backdrop-blur-sm sticky top-0 z-10 p-4 shadow-lg border-b border-gray-700">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <img src={user.avatar_url} alt={user.username} className="w-12 h-12 rounded-full border-2 border-sky-500" />
          <div>
            <p className="text-white font-semibold">{user.username}</p>
            <p className="text-gray-400 text-sm">Discogs User</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 bg-gray-900/50 p-1 rounded-lg border border-gray-700">
            <button 
                onClick={() => onViewChange(ViewType.COLLECTION)}
                className={`${buttonBaseClasses} ${activeView === ViewType.COLLECTION ? activeButtonClasses : inactiveButtonClasses}`}
            >
                Collection <span className="bg-gray-600 text-gray-200 text-xs font-bold ml-2 px-2 py-0.5 rounded-full">{collectionCount}</span>
            </button>
            <button 
                onClick={() => onViewChange(ViewType.WANTLIST)}
                className={`${buttonBaseClasses} ${activeView === ViewType.WANTLIST ? activeButtonClasses : inactiveButtonClasses}`}
            >
                Wantlist <span className="bg-gray-600 text-gray-200 text-xs font-bold ml-2 px-2 py-0.5 rounded-full">{wantlistCount}</span>
            </button>
        </div>

        <button
          onClick={onLogout}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300"
        >
          Logout
        </button>
      </div>
    </header>
  );
};

export default Header;
