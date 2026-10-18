import React from 'react';
import { createRoot } from 'react-dom/client';
import DotCursor from './components/originkit/ui/dot-cursor';

export function mountDotCursor() {
  // Check if touch device
  if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: coarse)').matches) {
    return;
  }

  // Ensure cursor root container exists
  let container = document.getElementById('originkit-cursor-root');
  if (!container) {
    container = document.createElement('div');
    container.id = 'originkit-cursor-root';
    container.style.position = 'fixed';
    container.style.inset = '0';
    container.style.width = '100vw';
    container.style.height = '100vh';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '999999';
    document.body.appendChild(container);
  }

  const root = createRoot(container);
  // Render dot cursor with only the cursor animation (label: false)
  root.render(<DotCursor label={false} />);
}
