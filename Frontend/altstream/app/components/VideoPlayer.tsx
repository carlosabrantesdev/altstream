'use client';

import React, { useEffect, useRef, useState } from 'react';
import 'plyr-react/plyr.css';

interface VideoPlayerProps {
  videoSrc: string;
  poster?: string;
  onTimeUpdate?: (time: number) => void;
  initialTime?: number;
}

export default function VideoPlayer({
  videoSrc,
  poster,
  onTimeUpdate,
  initialTime = 0,
}: VideoPlayerProps) {
  const [PlyrComponent, setPlyrComponent] = useState<any>(null);
  const ref = useRef<any>(null);
  const initialTimeApplied = useRef(false);

  useEffect(() => {
    import('plyr-react').then(({ Plyr }) => {
      setPlyrComponent(() => Plyr);
    });
  }, []);

  useEffect(() => {
    if (!PlyrComponent) return;

    const checkPlayer = setInterval(() => {
      const player = ref.current?.plyr;

      if (player) {
        clearInterval(checkPlayer);

        player.on('timeupdate', () => {
          const currentTime = player.currentTime;

          if (onTimeUpdate) {
            onTimeUpdate(currentTime);
          }
        });

        player.on('loadedmetadata', () => {

          if (initialTime > 0 && !initialTimeApplied.current) {
            player.currentTime = initialTime;
            initialTimeApplied.current = true;
          }
        });

        if (player.duration > 0 && initialTime > 0 && !initialTimeApplied.current) {
          player.currentTime = initialTime;
          initialTimeApplied.current = true;
        }
      }
    }, 100);

    return () => clearInterval(checkPlayer);
  }, [PlyrComponent, onTimeUpdate, initialTime]);

  const plyrSource = {
    type: 'video' as const,
    sources: [
      {
        src: videoSrc,
        type: 'video/mp4',
      },
    ],
    poster,
  };

  const plyrOptions = {
    ratio: '16:9',
    controls: [
      'play-large',
      'play',
      'progress',
      'current-time',
      'mute',
      'volume',
      'settings',
      'pip',
      'fullscreen',
    ],
  };

  return (
    <div className="w-full bg-black rounded-xl overflow-hidden [--plyr-color-main:#d0bcff]">
      {PlyrComponent && (
        <PlyrComponent
          ref={ref}
          source={plyrSource}
          options={plyrOptions}
        />
      )}
    </div>
  );
}