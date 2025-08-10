import React, { useState } from 'react';
import { Media, MediaFormat } from '../types';

interface MediaCardProps {
  media: Media;
  onClick: () => void;
}

const MediaCard: React.FC<MediaCardProps> = ({ media, onClick }) => {
  const isManga = media.format === MediaFormat.MANGA || media.format === MediaFormat.NOVEL || media.format === MediaFormat.ONE_SHOT;
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  return (
    <button
      onClick={onClick}
      className="group relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-slate-800 shadow-lg transition-transform duration-300 ease-in-out active:scale-95 md:hover:scale-105"
      aria-label={media.title.english || media.title.romaji}
    >
      <img
        src={media.coverImage.extraLarge}
        alt={media.title.romaji}
        className={`h-full w-full object-cover transition-opacity duration-500 ${isImageLoaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setIsImageLoaded(true)}
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-2.5">
        <h3 className="text-sm font-bold text-white drop-shadow-lg truncate">
          {media.title.english || media.title.romaji}
        </h3>
        <p className="text-xs text-slate-300 drop-shadow-md capitalize">
          {media.format.replace(/_/g, ' ').toLowerCase()}
        </p>
      </div>
    </button>
  );
};

export default MediaCard;
