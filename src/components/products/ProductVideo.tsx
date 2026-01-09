import { motion } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, Maximize2 } from 'lucide-react';
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';

interface ProductVideoProps {
  productName: string;
  brand?: string | null;
}

// Smart home product demo videos from Pexels
const PRODUCT_VIDEOS = [
  'https://videos.pexels.com/video-files/6899124/6899124-uhd_2560_1440_25fps.mp4',
  'https://videos.pexels.com/video-files/3129671/3129671-uhd_2560_1440_30fps.mp4',
  'https://videos.pexels.com/video-files/5380642/5380642-uhd_2732_1440_25fps.mp4',
  'https://videos.pexels.com/video-files/4473941/4473941-uhd_2560_1440_25fps.mp4',
];

export function ProductVideo({ productName, brand }: ProductVideoProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showVideo, setShowVideo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Get a consistent video based on product name hash
  const videoIndex = productName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % PRODUCT_VIDEOS.length;
  const videoUrl = PRODUCT_VIDEOS[videoIndex];

  const handlePlayClick = () => {
    setShowVideo(true);
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }, 100);
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoRef.current.requestFullscreen();
      }
    }
  };

  if (!showVideo) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-8 rounded-2xl border border-border bg-gradient-to-br from-primary/5 to-primary/10 p-8 cursor-pointer group"
        onClick={handlePlayClick}
      >
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors group-hover:scale-110 duration-300">
            <Play className="h-8 w-8 text-primary fill-primary ml-1" />
          </div>
          <div>
            <h3 className="font-display text-lg font-semibold mb-1">Watch Product Demo</h3>
            <p className="text-muted-foreground text-sm">
              See how {brand || 'this product'} transforms your smart home experience
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mt-8 rounded-2xl overflow-hidden border border-border bg-card relative group"
    >
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full aspect-video object-cover"
        loop
        muted={isMuted}
        playsInline
      />
      
      {/* Controls overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
          <div className="flex gap-2">
            <Button
              size="icon"
              variant="secondary"
              className="rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm h-10 w-10"
              onClick={togglePlay}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5 text-white" />
              ) : (
                <Play className="h-5 w-5 text-white fill-white ml-0.5" />
              )}
            </Button>
            <Button
              size="icon"
              variant="secondary"
              className="rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm h-10 w-10"
              onClick={toggleMute}
            >
              {isMuted ? (
                <VolumeX className="h-5 w-5 text-white" />
              ) : (
                <Volume2 className="h-5 w-5 text-white" />
              )}
            </Button>
          </div>
          <Button
            size="icon"
            variant="secondary"
            className="rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm h-10 w-10"
            onClick={toggleFullscreen}
          >
            <Maximize2 className="h-5 w-5 text-white" />
          </Button>
        </div>
      </div>

      {/* Pause overlay */}
      {!isPlaying && (
        <div 
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          onClick={togglePlay}
        >
          <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors">
            <Play className="h-8 w-8 text-white fill-white ml-1" />
          </div>
        </div>
      )}
    </motion.div>
  );
}
