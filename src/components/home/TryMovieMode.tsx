import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, Monitor, Blinds, Lightbulb } from 'lucide-react';

export const TryMovieMode = () => {
  const [isMovieMode, setIsMovieMode] = useState(false);

  return (
    <section className="py-16 md:py-24 relative overflow-hidden">
      {/* Background effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />
      
      <div className="container relative z-10">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Try Movie Mode
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            One button transforms your living room into a cinema. Curtains close, lights dim, 
            TV turns on, and speakers set to perfect volume.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Movie Scene */}
          <div className="relative rounded-2xl overflow-hidden aspect-video bg-card border border-border shadow-2xl">
            {/* Room background */}
            <div 
              className="absolute inset-0 bg-cover bg-center transition-all duration-1000"
              style={{
                backgroundImage: 'url(https://images.unsplash.com/photo-1600210492493-0946911123ea?auto=format&fit=crop&w=1200&q=80)',
                filter: isMovieMode ? 'brightness(0.15)' : 'brightness(0.7)',
              }}
            />

            {/* TV Screen overlay */}
            <AnimatePresence>
              {isMovieMode && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.5 }}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2/3 aspect-video"
                >
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-blue-500/20 rounded-lg border-4 border-primary/30 flex items-center justify-center">
                    <div className="text-center">
                      <Monitor className="w-16 h-16 text-primary mx-auto mb-4" />
                      <p className="text-foreground/90 font-medium">Now Playing</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Status indicators */}
            <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-3">
              <motion.div
                animate={{
                  backgroundColor: isMovieMode ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
                }}
                className="px-3 py-1.5 rounded-full flex items-center gap-2 text-xs font-medium"
              >
                <Blinds className="w-3.5 h-3.5" />
                <span className={isMovieMode ? 'text-primary-foreground' : 'text-muted-foreground'}>
                  Curtains {isMovieMode ? 'Closed' : 'Open'}
                </span>
              </motion.div>
              
              <motion.div
                animate={{
                  backgroundColor: isMovieMode ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
                }}
                className="px-3 py-1.5 rounded-full flex items-center gap-2 text-xs font-medium"
              >
                <Lightbulb className="w-3.5 h-3.5" />
                <span className={isMovieMode ? 'text-primary-foreground' : 'text-muted-foreground'}>
                  Lights {isMovieMode ? '5%' : '100%'}
                </span>
              </motion.div>
              
              <motion.div
                animate={{
                  backgroundColor: isMovieMode ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
                }}
                className="px-3 py-1.5 rounded-full flex items-center gap-2 text-xs font-medium"
              >
                {isMovieMode ? (
                  <Volume2 className="w-3.5 h-3.5" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5" />
                )}
                <span className={isMovieMode ? 'text-primary-foreground' : 'text-muted-foreground'}>
                  Speakers {isMovieMode ? 'Surround' : 'Off'}
                </span>
              </motion.div>
            </div>
          </div>

          {/* Control Button */}
          <div className="flex justify-center mt-8">
            <motion.button
              onClick={() => setIsMovieMode(!isMovieMode)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`
                group relative px-10 py-5 rounded-2xl font-medium text-lg
                flex items-center gap-3 transition-all duration-300
                ${isMovieMode 
                  ? 'bg-destructive/20 text-destructive hover:bg-destructive/30' 
                  : 'bg-primary text-primary-foreground hover:bg-primary/90 glow-primary'
                }
              `}
            >
              <motion.div
                animate={{ rotate: isMovieMode ? 0 : 0 }}
                className="w-10 h-10 rounded-full bg-background/20 flex items-center justify-center"
              >
                {isMovieMode ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5 ml-0.5" />
                )}
              </motion.div>
              <span>
                {isMovieMode ? 'Exit Movie Mode' : 'Start Movie Mode'}
              </span>
            </motion.button>
          </div>
        </div>
      </div>
    </section>
  );
};
