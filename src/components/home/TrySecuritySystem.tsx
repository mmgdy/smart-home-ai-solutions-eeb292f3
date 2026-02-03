import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ShieldCheck, ShieldAlert, Camera, DoorOpen, DoorClosed, Bell, Lock, Unlock, Eye } from 'lucide-react';

export const TrySecuritySystem = () => {
  const [isArmed, setIsArmed] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [doorLocked, setDoorLocked] = useState(true);

  const zones = [
    { id: 'front', name: 'Front Door', icon: DoorClosed, status: 'secure' },
    { id: 'back', name: 'Back Door', icon: DoorClosed, status: 'secure' },
    { id: 'garage', name: 'Garage', icon: DoorClosed, status: 'secure' },
    { id: 'motion', name: 'Motion Sensor', icon: Eye, status: isArmed ? 'active' : 'inactive' },
  ];

  return (
    <section className="py-16 md:py-24 bg-muted/30 relative overflow-hidden">
      <div className="container relative z-10">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Try Security System
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Comprehensive home security with smart locks, cameras, motion sensors, 
            and instant alerts directly to your phone.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Arm/Disarm Panel */}
          <div className="bg-card rounded-2xl border border-border p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <div className={`p-2 rounded-lg ${isArmed ? 'bg-green-500/10' : 'bg-muted'}`}>
                {isArmed ? (
                  <ShieldCheck className="w-5 h-5 text-green-500" />
                ) : (
                  <Shield className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Security Status</h3>
                <p className={`text-sm ${isArmed ? 'text-green-500' : 'text-muted-foreground'}`}>
                  {isArmed ? 'System Armed' : 'System Disarmed'}
                </p>
              </div>
            </div>

            {/* Big Toggle Button */}
            <motion.button
              onClick={() => setIsArmed(!isArmed)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`
                w-full py-8 rounded-2xl flex flex-col items-center gap-4 transition-all duration-500
                ${isArmed 
                  ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/30' 
                  : 'bg-gradient-to-br from-muted to-muted/50 text-muted-foreground border border-border'
                }
              `}
            >
              <motion.div
                animate={{ 
                  scale: isArmed ? [1, 1.1, 1] : 1,
                }}
                transition={{ 
                  repeat: isArmed ? Infinity : 0, 
                  duration: 2 
                }}
              >
                {isArmed ? (
                  <ShieldCheck className="w-16 h-16" />
                ) : (
                  <ShieldAlert className="w-16 h-16" />
                )}
              </motion.div>
              <span className="text-xl font-bold">
                {isArmed ? 'TAP TO DISARM' : 'TAP TO ARM'}
              </span>
            </motion.button>

            {/* Zones Status */}
            <div className="mt-6 space-y-3">
              {zones.map((zone) => (
                <div 
                  key={zone.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <zone.icon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{zone.name}</span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    zone.status === 'secure' 
                      ? 'bg-green-500/10 text-green-500' 
                      : zone.status === 'active'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground'
                  }`}>
                    {zone.status.charAt(0).toUpperCase() + zone.status.slice(1)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Smart Lock & Camera */}
          <div className="space-y-6">
            {/* Smart Lock */}
            <div className="bg-card rounded-2xl border border-border p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-lg ${doorLocked ? 'bg-green-500/10' : 'bg-orange-500/10'}`}>
                  {doorLocked ? (
                    <Lock className="w-5 h-5 text-green-500" />
                  ) : (
                    <Unlock className="w-5 h-5 text-orange-500" />
                  )}
                </div>
                <h3 className="font-semibold text-foreground">Smart Door Lock</h3>
              </div>

              <div className="flex items-center gap-4">
                <motion.button
                  onClick={() => setDoorLocked(true)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`flex-1 py-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 ${
                    doorLocked 
                      ? 'bg-green-500 text-white' 
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  <Lock className="w-5 h-5" />
                  Lock
                </motion.button>
                <motion.button
                  onClick={() => setDoorLocked(false)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`flex-1 py-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 ${
                    !doorLocked 
                      ? 'bg-orange-500 text-white' 
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  <Unlock className="w-5 h-5" />
                  Unlock
                </motion.button>
              </div>
            </div>

            {/* Camera Feed */}
            <div className="bg-card rounded-2xl border border-border p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Camera className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground">Front Door Camera</h3>
                </div>
                <motion.button
                  onClick={() => setShowCamera(!showCamera)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className={`p-2 rounded-lg transition-colors ${
                    showCamera ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <Eye className="w-4 h-4" />
                </motion.button>
              </div>

              <AnimatePresence>
                {showCamera ? (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="relative aspect-video bg-black rounded-xl overflow-hidden"
                  >
                    <img
                      src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=600&q=80"
                      alt="Camera feed"
                      className="w-full h-full object-cover opacity-80"
                    />
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-xs text-white/80 font-medium">LIVE</span>
                    </div>
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white/60">
                      <span>Front Door</span>
                      <span>{new Date().toLocaleTimeString()}</span>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="aspect-video bg-muted rounded-xl flex items-center justify-center"
                  >
                    <p className="text-muted-foreground text-sm">Click eye icon to view feed</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Alert Banner */}
            <div className="p-4 bg-primary/10 rounded-xl flex items-start gap-3">
              <Bell className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Instant Alerts</p>
                <p className="text-xs text-muted-foreground">
                  Get notifications on your phone when motion is detected or doors are opened
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
