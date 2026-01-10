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
    { url: 'https://cdn.pixabay.com/video/2019/06/11/24284-342116044_large.mp4', poster: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80' },
    { url: 'https://cdn.pixabay.com/video/2020/02/12/32100-391273907_large.mp4', poster: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&q=80' },
  ],
  security: [
    { url: 'https://cdn.pixabay.com/video/2020/05/25/40130-424930941_large.mp4', poster: 'https://images.unsplash.com/photo-1558002038-1055907df827?w=600&q=80' },
    { url: 'https://cdn.pixabay.com/video/2021/04/06/70495-535612233_large.mp4', poster: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600&q=80' },
  ],
  locks: [
    { url: 'https://cdn.pixabay.com/video/2020/05/25/40130-424930941_large.mp4', poster: 'https://images.unsplash.com/photo-1558002038-1055907df827?w=600&q=80' },
    { url: 'https://cdn.pixabay.com/video/2021/04/06/70495-535612233_large.mp4', poster: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600&q=80' },
  ],
  sensors: [
    { url: 'https://cdn.pixabay.com/video/2019/06/11/24284-342116044_large.mp4', poster: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80' },
    { url: 'https://cdn.pixabay.com/video/2020/02/12/32100-391273907_large.mp4', poster: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&q=80' },
  ],
  hubs: [
    { url: 'https://cdn.pixabay.com/video/2019/06/11/24284-342116044_large.mp4', poster: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80' },
    { url: 'https://cdn.pixabay.com/video/2020/02/12/32100-391273907_large.mp4', poster: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&q=80' },
  ],
  panels: [
    { url: 'https://cdn.pixabay.com/video/2019/06/11/24284-342116044_large.mp4', poster: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80' },
    { url: 'https://cdn.pixabay.com/video/2020/02/12/32100-391273907_large.mp4', poster: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&q=80' },
  ],
  default: [
    { url: 'https://cdn.pixabay.com/video/2019/06/11/24284-342116044_large.mp4', poster: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80' },
    { url: 'https://cdn.pixabay.com/video/2020/02/12/32100-391273907_large.mp4', poster: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&q=80' },
    { url: 'https://cdn.pixabay.com/video/2020/05/25/40130-424930941_large.mp4', poster: 'https://images.unsplash.com/photo-1558002038-1055907df827?w=600&q=80' },
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
