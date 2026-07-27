'use client';

import { useState } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useDragContextOptional } from '@/app/program/[id]/workout-schedule/dnd/drag-context';
import { Blurhash } from 'react-blurhash';

export type ThumbnailUrlShape = {
  blurhash?: string;
  image_url?: string;
} | null;

interface PlayButtonProps {
  videoUrl: string | null;
  videoType?: string;
  exerciseName?: string;
  thumbnailUrl?: ThumbnailUrlShape;
  disableHover?: boolean;
}

export function PlayButton({
  videoUrl,
  videoType,
  exerciseName,
  thumbnailUrl,
  disableHover = false,
}: PlayButtonProps) {
  const dragContext = useDragContextOptional();
  const isDragging = dragContext?.isDragging ?? false;
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);

  if (!videoUrl || !videoType) {
    return null;
  }

  const getVideoUrl = () => {
    if (!videoUrl) return null;
    if (videoType === 'youtube') {
      return `https://www.youtube.com/embed/${videoUrl}?autoplay=1`;
    }
    if (videoType === 'file') {
      return videoUrl;
    }
    return null;
  };

  const embeddedUrl = getVideoUrl();

  if (!embeddedUrl) {
    return null;
  }

  const canOpenVideo = !isDragging && !disableHover;
  const shouldShowBlurhash =
    !!thumbnailUrl?.blurhash && (!isVideoLoaded || !isVideoOpen);

  return (
    <Popover
      open={isVideoOpen}
      onOpenChange={(open) => {
        if (canOpenVideo) {
          if (open) {
            setIsVideoLoaded(false);
          }
          setIsVideoOpen(open);
        }
      }}
    >
      <PopoverTrigger asChild>
        <div
          className="w-5 h-5 mx-3 text-muted-foreground hover:text-primary cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            if (canOpenVideo) {
              setIsVideoOpen((prev) => {
                const nextOpen = !prev;
                if (nextOpen) {
                  setIsVideoLoaded(false);
                }
                return nextOpen;
              });
            }
          }}
        >
          <svg
            className="w-5 h-5"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
          </svg>
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-[300px] min-w-[300px] max-w-[300px] p-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative aspect-video w-[300px] min-w-[300px] max-w-[300px] overflow-hidden rounded-lg bg-black">
          {shouldShowBlurhash && (
            <Blurhash
              hash={thumbnailUrl?.blurhash ?? ''}
              width="100%"
              height="100%"
              resolutionX={32}
              resolutionY={32}
              punch={1}
              className="absolute inset-0 z-0"
            />
          )}

          {videoType === 'youtube' ? (
            <iframe
              src={embeddedUrl}
              className="absolute inset-0 z-10 h-full w-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={exerciseName || 'Exercise Video'}
              onLoad={() => setIsVideoLoaded(true)}
            />
          ) : (
            <video
              src={embeddedUrl}
              className="absolute inset-0 z-10 h-full w-full object-cover"
              autoPlay
              controls
              playsInline
              onCanPlay={() => setIsVideoLoaded(true)}
            >
              Your browser does not support the video tag.
            </video>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
