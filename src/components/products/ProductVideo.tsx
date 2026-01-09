import { motion } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, Maximize2 } from 'lucide-react';
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';

interface ProductVideoProps {
  productName: string;
  brand?: string | null;
  category?: string | null;
}

// Category-specific smart home videos from Pexels
const CATEGORY_VIDEOS: Record<string, { url: string; poster: string }[]> = {
  lighting: [
    { url: 'https://videos.pexels.com/video-files/5532770/5532770-uhd_2732_1440_25fps.mp4', poster: 'https://images.pexels.com/videos/5532770/pexels-photo-5532770.jpeg?auto=compress&w=600' },
    { url: 'https://videos.pexels.com/video-files/4440903/4440903-uhd_2560_1440_25fps.mp4', poster: 'https://images.pexels.com/videos/4440903/pexels-photo-4440903.jpeg?auto=compress&w=600' },
  ],
  security: [
    { url: 'https://videos.pexels.com/video-files/5380642/5380642-uhd_2732_1440_25fps.mp4', poster: 'https://images.pexels.com/videos/5380642/pexels-photo-5380642.jpeg?auto=compress&w=600' },
    { url: 'https://videos.pexels.com/video-files/8090067/8090067-uhd_2560_1440_25fps.mp4', poster: 'https://images.pexels.com/videos/8090067/pexels-photo-8090067.jpeg?auto=compress&w=600' },
  ],
  locks: [
    { url: 'https://videos.pexels.com/video-files/5380642/5380642-uhd_2732_1440_25fps.mp4', poster: 'https://images.pexels.com/videos/5380642/pexels-photo-5380642.jpeg?auto=compress&w=600' },
    { url: 'https://videos.pexels.com/video-files/4499571/4499571-uhd_2560_1440_24fps.mp4', poster: 'https://images.pexels.com/videos/4499571/pexels-photo-4499571.jpeg?auto=compress&w=600' },
  ],
  sensors: [
    { url: 'https://videos.pexels.com/video-files/6899124/6899124-uhd_2560_1440_25fps.mp4', poster: 'https://images.pexels.com/videos/6899124/pexels-photo-6899124.jpeg?auto=compress&w=600' },
    { url: 'https://videos.pexels.com/video-files/3129671/3129671-uhd_2560_1440_30fps.mp4', poster: 'https://images.pexels.com/videos/3129671/free-video-3129671.jpg?auto=compress&w=600' },
  ],
  hubs: [
    { url: 'https://videos.pexels.com/video-files/3129671/3129671-uhd_2560_1440_30fps.mp4', poster: 'https://images.pexels.com/videos/3129671/free-video-3129671.jpg?auto=compress&w=600' },
    { url: 'https://videos.pexels.com/video-files/4473941/4473941-uhd_2560_1440_25fps.mp4', poster: 'https://images.pexels.com/videos/4473941/pexels-photo-4473941.jpeg?auto=compress&w=600' },
  ],
  panels: [
    { url: 'https://videos.pexels.com/video-files/5532770/5532770-uhd_2732_1440_25fps.mp4', poster: 'https://images.pexels.com/videos/5532770/pexels-photo-5532770.jpeg?auto=compress&w=600' },
    { url: 'https://videos.pexels.com/video-files/4473941/4473941-uhd_2560_1440_25fps.mp4', poster: 'https://images.pexels.com/videos/4473941/pexels-photo-4473941.jpeg?auto=compress&w=600' },
  ],
  default: [
    { url: 'https://videos.pexels.com/video-files/3129671/3129671-uhd_2560_1440_30fps.mp4', poster: 'https://images.pexels.com/videos/3129671/free-video-3129671.jpg?auto=compress&w=600' },
    { url: 'https://videos.pexels.com/video-files/6899124/6899124-uhd_2560_1440_25fps.mp4', poster: 'https://images.pexels.com/videos/6899124/pexels-photo-6899124.jpeg?auto=compress&w=600' },
    { url: 'https://videos.pexels.com/video-files/5380642/5380642-uhd_2732_1440_25fps.mp4', poster: 'https://images.pexels.com/videos/5380642/pexels-photo-5380642.jpeg?auto=compress&w=600' },
  ],
};

function getVideoForProduct(productName: string, brand?: string | null): { url: string; poster: string } {
  const name = productName.toLowerCase();
  
  // Determine category from product name
  let category = 'default';
  if (name.includes('light') || name.includes('bulb') || name.includes('led') || name.includes('lamp')) {
    category = 'lighting';
  } else if (name.includes('lock') || name.includes('door')) {
    category = 'locks';
  } else if (name.includes('sensor') || name.includes('detector') || name.includes('motion')) {
    category = 'sensors';
  } else if (name.includes('camera') || name.includes('security') || name.includes('alarm')) {
    category = 'security';
  } else if (name.includes('hub') || name.includes('gateway') || name.includes('dongle') || name.includes('zigbee')) {
    category = 'hubs';
  } else if (name.includes('panel') || name.includes('control') || name.includes('touch') || name.includes('switch')) {
    category = 'panels';
  }

  const videos = CATEGORY_VIDEOS[category] || CATEGORY_VIDEOS.default;
  const hash = productName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return videos[hash % videos.length];
}

export function ProductVideo({ productName, brand }: ProductVideoProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showVideo, setShowVideo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const video = getVideoForProduct(productName, brand);

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
        className="mt-8 rounded-2xl border border-border bg-gradient-to-br from-primary/5 to-primary/10 overflow-hidden cursor-pointer group"
        onClick={handlePlayClick}
      >
        <div className="relative aspect-video">
          <img 
            src={video.poster} 
            alt="Product demo preview"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/40 transition-colors">
            <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 group-hover:scale-110 transition-all duration-300">
              <Play className="h-10 w-10 text-white fill-white ml-1" />
            </div>
          </div>
          <div className="absolute bottom-4 left-4 right-4">
            <h3 className="font-display text-lg font-semibold text-white mb-1">Watch Product Demo</h3>
            <p className="text-white/80 text-sm">
              See how {brand || 'this product'} transforms your smart home
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
        src={video.url}
        poster={video.poster}
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
