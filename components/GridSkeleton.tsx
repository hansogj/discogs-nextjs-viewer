import React from 'react';

const SkeletonCard: React.FC = () => {
    return (
        <div className="relative overflow-hidden rounded-lg bg-discogs-bg-light shadow-lg">
            <div className="aspect-square w-full bg-discogs-border"></div>
            <div className="absolute bottom-0 left-0 p-4 w-full">
                <div className="h-4 bg-discogs-border rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-discogs-border rounded w-1/2"></div>
            </div>
        </div>
    );
};


const GridSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4 p-4 animate-pulse">
      {Array.from({ length: 24 }).map((_, index) => (
        <SkeletonCard key={index} />
      ))}
    </div>
  );
};

export default GridSkeleton;
