import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronUp, ChevronDown, Blinds, Sun, Moon } from 'lucide-react';

export const TryCurtainControl = () => {
  const [curtainLevel, setCurtainLevel] = useState(100); // 100 = fully open, 0 = fully closed
  const [blindsAngle, setBlindsAngle] = useState(0); // 0 = horizontal, 90 = vertical

  const adjustCurtain = (amount: number) => {
    setCurtainLevel(prev => Math.max(0, Math.min(100, prev + amount)));
  };

  return (
    <section className="py-16 md:py-24 bg-muted/30 relative overflow-hidden">
      <div className="container relative z-10">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Try Curtain Control
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Control your curtains and blinds with precision. Set schedules, 
            link to sunrise/sunset, or control with voice commands.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Curtain Demo */}
          <div className="bg-card rounded-2xl border border-border p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-primary/10">
                <Blinds className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">Smart Curtains</h3>
            </div>

            {/* Window visualization */}
            <div className="relative h-64 bg-gradient-to-b from-sky-400 to-sky-300 rounded-xl overflow-hidden mb-6 border-4 border-muted">
              {/* Sun/light effect */}
              <div 
                className="absolute top-4 right-4 w-12 h-12 rounded-full bg-yellow-300 shadow-lg transition-opacity duration-500"
                style={{ opacity: curtainLevel / 100 }}
              />
              
              {/* Curtain */}
              <motion.div
                animate={{ height: `${100 - curtainLevel}%` }}
                transition={{ type: 'spring', stiffness: 100, damping: 15 }}
                className="absolute top-0 left-0 right-0 bg-gradient-to-b from-amber-800 to-amber-900"
                style={{
                  backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 20px, rgba(0,0,0,0.1) 20px, rgba(0,0,0,0.1) 40px)',
                }}
              />
              
              {/* Level indicator */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-background/90 rounded-full text-sm font-medium">
                {curtainLevel}% Open
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => adjustCurtain(25)}
                className="p-4 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <ChevronUp className="w-6 h-6" />
              </motion.button>
              
              <div className="flex flex-col gap-2">
                <button 
                  onClick={() => setCurtainLevel(100)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    curtainLevel === 100 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                  }`}
                >
                  <Sun className="w-4 h-4 inline mr-2" />
                  Open
                </button>
                <button 
                  onClick={() => setCurtainLevel(0)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    curtainLevel === 0 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                  }`}
                >
                  <Moon className="w-4 h-4 inline mr-2" />
                  Close
                </button>
              </div>
              
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => adjustCurtain(-25)}
                className="p-4 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <ChevronDown className="w-6 h-6" />
              </motion.button>
            </div>
          </div>

          {/* Blinds Demo */}
          <div className="bg-card rounded-2xl border border-border p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-primary/10">
                <Blinds className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">Smart Blinds</h3>
            </div>

            {/* Blinds visualization */}
            <div className="relative h-64 bg-gradient-to-b from-sky-400 to-sky-300 rounded-xl overflow-hidden mb-6 border-4 border-muted">
              {/* Blind slats */}
              <div className="absolute inset-0 flex flex-col">
                {Array.from({ length: 12 }).map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ 
                      rotateX: blindsAngle,
                      height: blindsAngle > 45 ? '4px' : '20px'
                    }}
                    transition={{ delay: i * 0.02 }}
                    className="bg-slate-100 border-b border-slate-300 origin-top"
                    style={{ 
                      transformStyle: 'preserve-3d',
                      flex: '0 0 auto'
                    }}
                  />
                ))}
              </div>
              
              {/* Light indicator */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-background/90 rounded-full text-sm font-medium">
                {Math.round((90 - blindsAngle) / 90 * 100)}% Light
              </div>
            </div>

            {/* Angle Slider */}
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Angle</span>
                <span className="font-medium">{blindsAngle}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="90"
                value={blindsAngle}
                onChange={(e) => setBlindsAngle(Number(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between gap-2">
                <button 
                  onClick={() => setBlindsAngle(0)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    blindsAngle === 0 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                  }`}
                >
                  Full Light
                </button>
                <button 
                  onClick={() => setBlindsAngle(45)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    blindsAngle === 45 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                  }`}
                >
                  Half
                </button>
                <button 
                  onClick={() => setBlindsAngle(90)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    blindsAngle === 90 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                  }`}
                >
                  Privacy
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
