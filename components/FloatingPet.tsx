'use client';

import { usePets } from '@/contexts/PetContext';
import { motion } from 'motion/react';
import { useState } from 'react';

export default function FloatingPet() {
  const { activePet, getXPBonus } = usePets();
  const [showBonus, setShowBonus] = useState(false);

  if (!activePet) return null;

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed bottom-4 right-4 z-40"
      onHoverStart={() => setShowBonus(true)}
      onHoverEnd={() => setShowBonus(false)}
    >
      <motion.div
        animate={{
          y: [0, -10, 0],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="relative cursor-pointer"
      >
        {/* Pet */}
        <div
          className="text-6xl"
          style={{
            filter: `drop-shadow(0 0 20px ${activePet.color})`,
          }}
        >
          {activePet.emoji}
        </div>

        {/* Sparkle effects */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
          }}
          className="absolute inset-0 blur-xl"
          style={{
            background: `radial-gradient(circle, ${activePet.color}40 0%, transparent 70%)`,
          }}
        />

        {/* Level Badge */}
        <div
          className="absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg"
          style={{
            backgroundColor: activePet.color,
          }}
        >
          {activePet.level}
        </div>

        {/* XP Bonus Tooltip */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 10 }}
          animate={showBonus ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.8, y: 10 }}
          transition={{ duration: 0.2 }}
          className="absolute bottom-full right-0 mb-2 bg-white rounded-lg shadow-lg p-3 min-w-[180px] border-2"
          style={{
            borderColor: activePet.color,
          }}
        >
          <div className="text-sm font-bold text-gray-900 mb-1">
            {activePet.name}
          </div>
          <div className="text-xs text-gray-600 mb-2">
            Nivel {activePet.level}
          </div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-500">XP</span>
            <span className="text-gray-700 font-medium">
              {activePet.experience}/{activePet.maxExperience}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
            <div
              className="h-1.5 rounded-full transition-all"
              style={{
                width: `${(activePet.experience / activePet.maxExperience) * 100}%`,
                backgroundColor: activePet.color,
              }}
            />
          </div>
          <div
            className="text-sm font-bold text-center py-1 px-2 rounded"
            style={{
              backgroundColor: `${activePet.color}20`,
              color: activePet.color,
            }}
          >
            +{getXPBonus()}% XP Bonus
          </div>
          
          {/* Arrow */}
          <div
            className="absolute top-full right-4 w-0 h-0 border-8 border-transparent"
            style={{
              borderTopColor: activePet.color,
            }}
          />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
