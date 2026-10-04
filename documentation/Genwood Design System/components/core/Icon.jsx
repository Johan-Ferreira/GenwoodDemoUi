import React from 'react';
const LUCIDE='https://unpkg.com/lucide-static@0.469.0/icons/';
export function Icon({ name, size = 16, color = 'currentColor', style, title }) {
  const url = 'url(' + LUCIDE + name + '.svg)';
  return <span role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}
    style={{ display: 'inline-block', flex: 'none', width: size, height: size, background: color,
      WebkitMask: url + ' center/contain no-repeat', mask: url + ' center/contain no-repeat', ...style }} />;
}
