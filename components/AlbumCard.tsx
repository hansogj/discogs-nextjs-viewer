import React from 'react';
import Image from 'next/image';

// Using a data URI for the placeholder SVG to avoid creating new files.
// This SVG displays a simple musical note on a record, matching the app's dark theme.
const PLACEHOLDER_IMAGE_URL = "data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' fill='none'%3e%3crect width='100' height='100' fill='%231d1f24'/%3e%3ccircle cx='50' cy='50' r='35' stroke='%232f323a' stroke-width='4'/%3e%3ccircle cx='50' cy='50' r='10' fill='%23101114' stroke='%232f323a' stroke-width='2'/%3e%3cpath d='M45 55 a5,5 0 0,1 10,0 l0,-20 a5,5 0 0,1 5,-5 a5,5 0 0,1 5,5' stroke='%23a0a0a0' stroke-width='3'/%3e%3ccircle cx='47.5' cy='55' r='4' fill='%23a0a0a0'/%3e%3ccircle cx='62.5' cy='40' r='4' fill='%23a0a0a0'/%3e%3c/svg%3e";

interface AlbumCardProps {
  imageUrl: string | null | undefined;
  title: string;
  artist: string;
}

const AlbumCard: React.FC<AlbumCardProps> = ({ imageUrl, title, artist }) => {
  const imageToDisplay = imageUrl || PLACEHOLDER_IMAGE_URL;

  return (
    <div className="group relative overflow-hidden rounded-lg bg-discogs-bg-light shadow-lg transition-all duration-300 ease-in-out hover:shadow-2xl hover:scale-105 hover:shadow-glow-blue/30 transform">
      <Image
        src={imageToDisplay}
        alt={`${artist} - ${title}`}
        width={300}
        height={300}
        className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-110"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
      <div className="absolute bottom-0 left-0 p-4 w-full">
        <h3 className="text-white font-bold text-base leading-tight drop-shadow-md truncate">{title}</h3>
        <p className="text-gray-300 text-sm drop-shadow-md truncate">{artist}</p>
      </div>
    </div>
  );
};

export default AlbumCard;