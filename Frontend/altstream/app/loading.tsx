'use client';

import React from 'react';

export default function Loading() {
  return (
    <div className="bg-background text-on-background min-h-screen flex items-center justify-center">
      <div className="h-14 w-14 animate-spin rounded-full border-[5px] border-primary/20 border-t-primary" />
    </div>
  );
}