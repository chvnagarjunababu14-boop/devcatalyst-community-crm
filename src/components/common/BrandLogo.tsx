import React from 'react';

export interface BrandLogoProps {
  /**
   * Preset sizing for the logo image container.
   * - 'xs': 28x28px
   * - 'sm': 36x36px (Navbar, Footer)
   * - 'md': 44x44px (Sidebar)
   * - 'lg': 64x64px (Auth screens)
   * - 'xl': 96x96px or larger (Hero showcase)
   */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /**
   * Optional custom container class name to override default wrapper.
   */
  className?: string;
  /**
   * Optional class name for the img element.
   */
  imgClassName?: string;
  /**
   * Accessible alternative text for the image. Defaults to "DevCatalyst Club logo".
   */
  alt?: string;
  /**
   * When true, renders a subtle white badge container to maintain contrast on dark backgrounds.
   * Defaults to true since the official artwork features black linework on white.
   */
  withContainer?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  className = '',
  imgClassName = '',
  alt = 'DevCatalyst Club logo',
  withContainer = true,
}) => {
  const sizeMap: Record<NonNullable<BrandLogoProps['size']>, { container: string; img: string }> = {
    xs: { container: 'w-7 h-7 rounded-lg p-0.5', img: 'w-6 h-6' },
    sm: { container: 'w-9 h-9 sm:w-10 sm:h-10 rounded-xl p-1', img: 'w-full h-full' },
    md: { container: 'w-10 h-10 rounded-xl p-1', img: 'w-full h-full' },
    lg: { container: 'w-16 h-16 sm:w-20 sm:h-20 rounded-2xl p-1.5', img: 'w-full h-full' },
    xl: { container: 'w-28 h-28 sm:w-36 sm:h-36 rounded-3xl p-3', img: 'w-full h-full' },
  };

  const currentSize = sizeMap[size];

  if (!withContainer) {
    return (
      <img
        src="/brand/devcatalyst-logo.jpg"
        alt={alt}
        className={`object-contain select-none ${currentSize.img} ${imgClassName}`}
        loading="eager"
      />
    );
  }

  return (
    <div
      className={`bg-white flex items-center justify-center shrink-0 shadow-sm border border-slate-200/80 overflow-hidden select-none transition-transform ${currentSize.container} ${className}`}
    >
      <img
        src="/brand/devcatalyst-logo.jpg"
        alt={alt}
        className={`w-full h-full object-contain ${imgClassName}`}
        loading="eager"
      />
    </div>
  );
};

export default BrandLogo;
