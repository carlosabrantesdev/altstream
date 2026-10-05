'use client';

import React, { useEffect, useRef, useState } from 'react';
import 'plyr-react/plyr.css';

interface VideoPlayerProps {
  videoSrc: string; 
  poster?: string;  
  onTimeUpdate?: (time: number) => void; 
}

export default function VideoPlayer({ videoSrc, poster, onTimeUpdate }: VideoPlayerProps) {
  const [PlyrComponent, setPlyrComponent] = useState<any>(null);
  const ref = useRef<any>(null);

  useEffect(() => {
    import('plyr-react').then(({ Plyr }) => {
      setPlyrComponent(() => Plyr);
    });
  }, []);

  useEffect(() => {
    const player = ref.current?.plyr;
    
    if (player && onTimeUpdate) {
      player.on('timeupdate', () => {
        onTimeUpdate(player.currentTime);
      });
    }
  }, [onTimeUpdate]);

  const plyrSource = {
    type: 'video' as const,
    sources: [
      {
        src: videoSrc,
        type: 'video/mp4',
      },
    ],
    poster: poster,
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
      'fullscreen'
    ],
  };

  return (
    <div className="w-full bg-black rounded-xl overflow-hidden [--plyr-color-main:#d0bcff]">
      {PlyrComponent && <PlyrComponent ref={ref} source={plyrSource} options={plyrOptions} />}
    </div>
  );
}