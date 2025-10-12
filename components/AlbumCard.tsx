import React from 'react';
import Image from 'next/image';

interface AlbumCardProps {
  imageUrl: string;
  title: string;
  artist: string;
}

const AlbumCard: React.FC<AlbumCardProps> = ({ imageUrl, title, artist }) => {
  return (
    <div className="group relative overflow-hidden rounded-lg bg-discogs-bg-light shadow-lg transition-all duration-300 ease-in-out hover:shadow-2xl hover:scale-105 hover:shadow-glow-blue/30 transform">
      <Image
        src={imageUrl}
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
