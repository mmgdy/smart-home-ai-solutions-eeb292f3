import { useState } from 'react';
import { motion } from 'framer-motion';
import { Thermometer, Snowflake, Sun, Wind, Droplets, Zap } from 'lucide-react';

export const TryClimateControl = () => {
  const [temperature, setTemperature] = useState(24);
  const [mode, setMode] = useState<'cool' | 'heat' | 'auto'>('cool');
  const [fanSpeed, setFanSpeed] = useState(2); // 1-3

  const modes = [
    { id: 'cool', icon: Snowflake, label: 'Cool', color: 'text-blue-500' },
    { id: 'heat', icon: Sun, label: 'Heat', color: 'text-orange-500' },
    { id: 'auto', icon: Zap, label: 'Auto', color: 'text-primary' },
  ];

  const getTemperatureColor = () => {
    if (temperature <= 18) return 'from-blue-500 to-cyan-500';
    if (temperature <= 22) return 'from-cyan-500 to-green-500';
    if (temperature <= 26) return 'from-green-500 to-yellow-500';
    return 'from-yellow-500 to-orange-500';
  };

  return (
    <section className="py-16 md:py-24 relative overflow-hidden">
      <div className="container relative z-10">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Try Climate Control
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Maintain perfect comfort with intelligent climate control. 
            Schedule temperatures, set zones, and save energy automatically.
          </p>
        </div>

        <div className="max-w-md mx-auto">
          <div className="bg-card rounded-3xl border border-border p-8 shadow-2xl">
            {/* Temperature Display */}
            <div className="text-center mb-8">
              <motion.div
                key={temperature}
                initial={{ scale: 1.1 }}
                animate={{ scale: 1 }}
                className={`inline-flex items-baseline gap-2 text-7xl font-bold bg-gradient-to-r ${getTemperatureColor()} bg-clip-text text-transparent`}
              >
                {temperature}
                <span className="text-3xl text-muted-foreground">°C</span>
              </motion.div>
              <p className="text-muted-foreground mt-2">Living Room</p>
            </div>

            {/* Temperature Control */}
            <div className="relative h-4 bg-muted rounded-full mb-8 overflow-hidden">
              <motion.div
                className={`absolute left-0 top-0 bottom-0 rounded-full bg-gradient-to-r ${getTemperatureColor()}`}
                animate={{ width: `${((temperature - 16) / 16) * 100}%` }}
              />
              <input
                type="range"
                min="16"
                max="32"
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
                className="absolute inset-0 w-full opacity-0 cursor-pointer"
              />
            </div>

            {/* Quick Temps */}
            <div className="flex justify-between mb-8">
              {[18, 21, 24, 27].map((temp) => (
                <motion.button
                  key={temp}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setTemperature(temp)}
                  className={`w-14 h-14 rounded-xl font-medium transition-colors ${
                    temperature === temp
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {temp}°
                </motion.button>
              ))}
            </div>

            {/* Mode Selection */}
            <div className="grid grid-cols-3 gap-3 mb-8">
              {modes.map(({ id, icon: Icon, label, color }) => (
                <motion.button
                  key={id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setMode(id as typeof mode)}
                  className={`p-4 rounded-xl flex flex-col items-center gap-2 transition-colors ${
                    mode === id
                      ? 'bg-primary/10 border-2 border-primary'
                      : 'bg-muted border-2 border-transparent hover:bg-muted/80'
                  }`}
                >
                  <Icon className={`w-6 h-6 ${mode === id ? color : 'text-muted-foreground'}`} />
                  <span className={`text-sm font-medium ${mode === id ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {label}
                  </span>
                </motion.button>
              ))}
            </div>

            {/* Fan Speed */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
              <div className="flex items-center gap-3">
                <Wind className="w-5 h-5 text-primary" />
                <span className="font-medium">Fan Speed</span>
              </div>
              <div className="flex gap-2">
                {[1, 2, 3].map((speed) => (
                  <motion.button
                    key={speed}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setFanSpeed(speed)}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                      fanSpeed >= speed
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <Wind className="w-4 h-4" style={{ opacity: 0.3 + (speed * 0.23) }} />
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Energy Saving Tip */}
            <div className="mt-6 p-4 bg-green-500/10 rounded-xl flex items-start gap-3">
              <Droplets className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-600">Energy Saving Mode</p>
                <p className="text-xs text-green-600/80">
                  Setting to 24°C saves up to 15% on electricity bills
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
