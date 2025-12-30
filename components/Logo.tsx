
import React from 'react';
import { ShoppingCart } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCart?: boolean;
}

export default function Logo({ size = 'md', showCart = true }: LogoProps) {
  const sizeClasses = {
    sm: 'w-10 h-10 text-xl border-2',
    md: 'w-16 h-16 text-2xl border-2',
    lg: 'w-32 h-32 text-4xl border-4',
    xl: 'w-48 h-48 text-6xl border-[6px]',
  };

  const cartSize = {
    sm: 12,
    md: 18,
    lg: 32,
    xl: 48
  };

  return (
    <div className="relative flex flex-col items-center justify-center">
      <div className={`${sizeClasses[size]} bg-white rounded-full border-amber-400 flex flex-col items-center justify-center shadow-lg relative overflow-visible`}>
        <span className="font-black text-blue-600 tracking-tighter drop-shadow-[1px_1px_0_rgba(251,191,36,1)]">
          QFD
        </span>
        {showCart && (
          <div className="absolute -bottom-2 translate-y-1/2">
             <ShoppingCart size={cartSize[size]} className="text-slate-700 fill-slate-100" />
          </div>
        )}
      </div>
    </div>
  );
}
