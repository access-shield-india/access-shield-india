import Image from 'next/image';
import { cn } from '@/lib/utils';

export interface MarketingImageProps {
  src: string;
  alt: string;
  /** Width/height set intrinsic aspect; use fill when inside a sized relative parent */
  width?: number;
  height?: number;
  fill?: boolean;
  priority?: boolean;
  className?: string;
  sizes?: string;
}

/**
 * Accessible marketing photo with consistent rounded treatment and priority loading for heroes.
 */
export function MarketingImage({
  src,
  alt,
  width,
  height,
  fill = false,
  priority = false,
  className,
  sizes,
}: MarketingImageProps) {
  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes={sizes ?? '(max-width: 1024px) 100vw, 50vw'}
        className={cn('object-cover', className)}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width ?? 1200}
      height={height ?? 675}
      priority={priority}
      sizes={sizes}
      className={cn('h-auto w-full', className)}
    />
  );
}
