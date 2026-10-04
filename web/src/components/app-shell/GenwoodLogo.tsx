import Image from 'next/image';

/** Intrinsic size of the supplied raster (208x83, opaque on Forest). */
const LOGO_WIDTH = 208;
const LOGO_HEIGHT = 83;

interface GenwoodLogoProps {
  /** Rendered height in px: 36 in the header, 52 on sign-in. */
  height: 36 | 52;
  priority?: boolean;
}

/**
 * The Genwood logo. Only place it on the Forest 800 brand surface; it is an
 * opaque raster and must not be recoloured or stretched.
 */
export function GenwoodLogo({ height, priority = false }: GenwoodLogoProps) {
  const width = Math.round((LOGO_WIDTH * height) / LOGO_HEIGHT);
  return (
    <Image
      src="/genwood-logo.png"
      alt="Genwood"
      width={width}
      height={height}
      priority={priority}
    />
  );
}
