'use client';

import { useState } from 'react';
import { Blurhash } from 'react-blurhash';
import { cn } from '@/lib/utils';
import Image from 'next/image';

export interface ExerciseThumbnailProps {
  blurhash?: string | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
  videoType?: 'youtube' | 'file' | string;
  alt: string;
  className?: string;
  /** When true, content fills container (absolute inset-0). When false, container shrinks to content. */
  fill?: boolean;
  /** When true and fill, container gets aspect-video. When false and fill, parent controls aspect (e.g. aspect-4/3). */
  aspectVideo?: boolean;
  /** Show video as fallback (iframe for youtube, video tag for file). When false, only show image/thumbnail fallback for youtube. */
  showVideoFallback?: boolean;
}

export function ExerciseThumbnail({
  blurhash,
  imageUrl,
  videoUrl,
  videoType,
  alt,
  className,
  fill = true,
  aspectVideo = true,
  showVideoFallback = true,
}: ExerciseThumbnailProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const useImage = imageUrl && !imageError;
  const useVideoFallback =
    showVideoFallback &&
    videoUrl &&
    (videoType === 'youtube' || videoType === 'file') &&
    (!useImage || imageError);

  // Blurhash is always the background layer when present; image/video render on top
  const showBlurhash = !!blurhash;

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-muted',
        fill && aspectVideo && 'aspect-video w-full',
        fill && !aspectVideo && 'h-full w-full',
        className,
      )}
    >
      {showBlurhash && (
        <Blurhash
          hash={blurhash}
          width="100%"
          height="100%"
          resolutionX={32}
          resolutionY={32}
          punch={1}
          className="absolute inset-0 z-0"
        />
      )}

      {useImage && (
        <Image
          src={imageUrl}
          alt={alt}
          fill
          className={cn(
            'absolute inset-0 z-10 h-full w-full object-cover transition-opacity duration-300',
            !imageLoaded && 'opacity-0',
          )}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
        />
      )}

      {useVideoFallback && (
        <>
          {videoType === 'youtube' && videoUrl ? (
            <iframe
              src={`https://www.youtube.com/embed/${videoUrl}`}
              className={cn(
                'absolute inset-0 z-10 border-0',
                fill && 'h-full w-full',
              )}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={alt}
            />
          ) : videoType === 'file' && videoUrl ? (
            <video
              src={videoUrl}
              className={cn(
                'absolute inset-0 z-10 object-cover',
                fill && 'h-full w-full',
              )}
              muted
              playsInline
            />
          ) : null}
        </>
      )}

      {!showBlurhash && !useImage && !useVideoFallback && (
        <div className="flex h-full w-full items-center justify-center">
          <span className="text-muted-foreground text-sm font-medium">
            No video
          </span>
        </div>
      )}
    </div>
  );
}
