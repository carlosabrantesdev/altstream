'use client';

import { useState } from 'react';

type AvatarProps = {
  name: string;
  src?: string | null;
  className?: string;
};

function AvatarImage({ name, src }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const initials = name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('');

  if (!src || failed) {
    return <span aria-hidden="true" className="font-semibold">{initials.toUpperCase() || 'A'}</span>;
  }

  return (
    <img
      src={src}
      alt=""
      className="h-full w-full object-cover"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}

export default function Avatar({ name, src, className = 'h-10 w-10' }: AvatarProps) {
  return (
    <span className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-primary ${className}`}>
      <AvatarImage key={src || 'initials'} name={name} src={src} />
    </span>
  );
}
