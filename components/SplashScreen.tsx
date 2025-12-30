
import React from 'react';
import Logo from './Logo';

export default function SplashScreen() {
  return (
    <div className="fixed inset-0 bg-blue-600 flex flex-col items-center justify-center z-[100] animate-in fade-in duration-700">
      <div className="animate-bounce">
        <Logo size="lg" />
      </div>
      
      <div className="mt-16 text-center space-y-2">
        <h1 className="text-white text-4xl font-black tracking-tighter animate-pulse drop-shadow-md">
          QFD
        </h1>
        <p className="text-blue-100/80 text-sm font-bold uppercase tracking-[0.2em]">
          Quick Food Delivery
        </p>
        <div className="flex items-center justify-center gap-1.5 pt-4">
          <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
          <div className="w-2 h-2 bg-white/70 rounded-full animate-bounce [animation-delay:-0.15s]" />
          <div className="w-2 h-2 bg-white rounded-full animate-bounce" />
        </div>
      </div>
      
      <p className="absolute bottom-10 text-white/50 text-xs font-bold uppercase tracking-widest">
        Freshness Guaranteed
      </p>
    </div>
  );
}
