import React, { useState } from 'react';
import { Media } from '../types';

interface MediaCardProps {
  media: Media;
  onClick: () => void;
}

const MediaCard: React.FC<MediaCardProps> = ({ media, onClick }) => {
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  return (
    <button
      onClick={onClick}
      className="group relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-gray-800 shadow-md transition-all duration-300 ease-in-out active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950 md:hover:scale-105 md:hover:shadow-lg md:hover:shadow-indigo-900/40"
      aria-label={media.title.english || media.title.romaji}
    >
      <img
        src={media.coverImage.extraLarge}
        alt={media.title.romaji}
        className={`h-full w-full object-cover transition-opacity duration-500 ${isImageLoaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setIsImageLoaded(true)}
        loading="lazy"
      />
       {media.isAdult && (
        <div className="absolute top-2 right-2 z-10 rounded-md bg-red-600/90 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-lg backdrop-blur-sm">
          +18
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent transition-all duration-300 group-hover:from-black/80" />
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <h3 className="text-sm font-semibold text-white drop-shadow-lg truncate">
          {media.title.english || media.title.romaji}
        </h3>
        <p className="text-xs text-gray-300 drop-shadow-md capitalize">
          {media.format?.replace(/_/g, ' ').toLowerCase()}
        </p>
      </div>
    </button>
  );
};

export default MediaCard;