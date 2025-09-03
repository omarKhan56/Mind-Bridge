import React from 'react'

// Pure CSS Brain animation - no Three.js dependencies
const Brain3D = ({ className = "" }) => {
  return (
    <div className={`w-full h-full flex items-center justify-center ${className}`}>
      <div className="relative">
        {/* Animated brain emoji with glow effect */}
        <div className="text-8xl animate-pulse filter drop-shadow-lg">
          🧠
        </div>
        
        {/* Floating particles around brain */}
        <div className="absolute inset-0 -z-10">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-blue-400/50 rounded-full animate-float"
              style={{
                left: `${20 + (i * 10)}%`,
                top: `${30 + (i % 3) * 20}%`,
                animationDelay: `${i * 0.5}s`,
                animationDuration: `${3 + (i % 2)}s`
              }}
            />
          ))}
        </div>
        
        {/* Pulsing rings */}
        <div className="absolute inset-0 flex items-center justify-center -z-20">
          <div className="w-32 h-32 border-2 border-blue-400/30 rounded-full animate-ping" />
          <div className="absolute w-24 h-24 border-2 border-purple-400/30 rounded-full animate-ping animation-delay-1000" />
        </div>
        
        {/* Text below */}
        <div className="text-center mt-4">
          <div className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            AI Mental Health Support
          </div>
        </div>
      </div>
    </div>
  )
}

export default Brain3D
