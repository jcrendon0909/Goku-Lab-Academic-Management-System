import React from 'react';

interface BackgroundVideoProps {
  videoSrc: string;
  decorativeVideos?: { src: string; position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' }[];
  children: React.ReactNode;
}

const positionClasses = {
  'top-left': 'top-2 left-2',
  'top-right': 'top-2 right-2',
  'bottom-left': 'bottom-2 left-2',
  'bottom-right': 'bottom-2 right-2',
};

const BackgroundVideo: React.FC<BackgroundVideoProps> = ({ videoSrc, decorativeVideos = [], children }) => {
  return (
    // ✅ Cambio: w-full en lugar de w-screen para evitar desborde por scroll
    <div className="relative w-full h-screen overflow-hidden">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute top-0 left-0 w-full h-full object-cover"
      >
        <source src={videoSrc} type="video/mp4" />
        Tu navegador no soporta videos HTML5.
      </video>

      <div className="absolute top-0 left-0 w-full h-full bg-black/30 backdrop-blur-sm"></div>

      {decorativeVideos.map((v, index) => (
        <video
          key={index}
          autoPlay
          loop
          muted
          playsInline
          className={`absolute ${positionClasses[v.position]} w-20 md:w-28 h-auto opacity-60 hover:opacity-90 transition-opacity duration-500 z-20 rounded-xl shadow-2xl border border-white/20`}
        >
          <source src={v.src} type="video/mp4" />
        </video>
      ))}

      {/* ✅ Cambio: items-center para centrar horizontalmente, justify-center para centrar verticalmente */}
      <div className="relative z-10 w-full h-full flex items-center justify-center p-1 md:p-2 overflow-hidden">
        <div className="w-full max-w-7xl mx-auto h-full flex flex-col">
          {children}
        </div>
      </div>
    </div>
  );
};

export default BackgroundVideo;