import { motion } from 'framer-motion';
import { Play, Volume2, VolumeX } from 'lucide-react';
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/i18n';

const SHOWCASE_VIDEOS = [
  {
    id: 1,
    title: 'Smart Living Room',
    subtitle: 'Voice-controlled lighting & entertainment',
    video: 'https://cdn.pixabay.com/video/2019/06/11/24284-342116044_large.mp4',
    poster: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
  },
  {
    id: 2,
    title: 'Smart Security',
    subtitle: 'AI-powered cameras & smart locks',
    video: 'https://cdn.pixabay.com/video/2020/05/25/40130-424930941_large.mp4',
    poster: 'https://images.unsplash.com/photo-1558002038-1055907df827?w=800&q=80',
  },
  {
    id: 3,
    title: 'Climate Control',
    subtitle: 'Automated temperature & air quality',
    video: 'https://cdn.pixabay.com/video/2020/02/12/32100-391273907_large.mp4',
    poster: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=800&q=80',
  },
];

export function VideoShowcase() {
  const { t } = useLanguage();
  const [activeVideo, setActiveVideo] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleVideoClick = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <section className="py-24 bg-background relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      
      <div className="container px-6 md:px-12">
        <div className="text-center mb-16">
          <motion.span 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-sm tracking-[0.3em] uppercase text-muted-foreground font-medium block mb-4"
          >
            See It In Action
          </motion.span>
          <motion.h2 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-display text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight"
          >
            Experience Smart Living
          </motion.h2>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Video Player */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="lg:col-span-2 relative aspect-video rounded-2xl overflow-hidden bg-card border border-border group cursor-pointer"
            onClick={handleVideoClick}
          >
            <video
              key={SHOWCASE_VIDEOS[activeVideo].id}
              ref={videoRef}
              src={SHOWCASE_VIDEOS[activeVideo].video}
              poster={SHOWCASE_VIDEOS[activeVideo].poster}
              className="w-full h-full object-cover"
              autoPlay
              loop
              muted={isMuted}
              playsInline
            />
            
            {/* Overlay controls */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
                <div>
                  <h3 className="font-display text-2xl font-bold text-white mb-1">
                    {SHOWCASE_VIDEOS[activeVideo].title}
                  </h3>
                  <p className="text-white/80">{SHOWCASE_VIDEOS[activeVideo].subtitle}</p>
                </div>
                <div className="flex gap-3">
                  <Button
                    size="icon"
                    variant="secondary"
                    className="rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm"
                    onClick={toggleMute}
                  >
                    {isMuted ? <VolumeX className="h-5 w-5 text-white" /> : <Volume2 className="h-5 w-5 text-white" />}
                  </Button>
                </div>
              </div>
            </div>

            {/* Play indicator */}
            {!isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Play className="h-10 w-10 text-white fill-white ml-1" />
                </div>
              </div>
            )}
          </motion.div>

          {/* Video Thumbnails */}
          <div className="flex lg:flex-col gap-4">
            {SHOWCASE_VIDEOS.map((video, index) => (
              <motion.button
                key={video.id}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                onClick={() => setActiveVideo(index)}
                className={`relative aspect-video lg:aspect-[16/10] rounded-xl overflow-hidden border-2 transition-all duration-300 flex-1 ${
                  activeVideo === index 
                    ? 'border-primary ring-2 ring-primary/20' 
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <img
                  src={video.poster}
                  alt={video.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/30 transition-colors">
                  <Play className="h-8 w-8 text-white/80" />
                </div>
                <div className="absolute bottom-2 left-2 right-2">
                  <p className="text-xs font-medium text-white truncate">{video.title}</p>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
