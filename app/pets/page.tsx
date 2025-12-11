'use client';

import { useState } from 'react';
import { usePets, Pet } from '@/contexts/PetContext';
import { Gift, Star, Zap, TrendingUp, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Ordenadas por rareza (común, raro, épico, legendario)
const AVAILABLE_PETS: Omit<Pet, 'id' | 'level' | 'experience' | 'maxExperience'>[] = [
  // Comunes
  { name: 'Gato', type: 'Felino', rarity: 'common', emoji: '🐱', color: '#f59e0b' },
  { name: 'Perro', type: 'Canino', rarity: 'common', emoji: '🐶', color: '#8b5cf6' },
  { name: 'Conejo', type: 'Roedor', rarity: 'common', emoji: '🐰', color: '#ec4899' },
  // Raras
  { name: 'Panda', type: 'Oso', rarity: 'rare', emoji: '🐼', color: '#06b6d4' },
  { name: 'León', type: 'Felino', rarity: 'rare', emoji: '🦁', color: '#f97316' },
  // Épicas
  { name: 'Tigre', type: 'Felino', rarity: 'epic', emoji: '🐯', color: '#eab308' },
  { name: 'Unicornio', type: 'Mítico', rarity: 'epic', emoji: '🦄', color: '#a855f7' },
  // Legendarias
  { name: 'Dragón', type: 'Legendario', rarity: 'legendary', emoji: '🐉', color: '#ef4444' },
  { name: 'Fénix', type: 'Legendario', rarity: 'legendary', emoji: '🔥', color: '#dc2626' },
];

const RARITY_COLORS = {
  common: 'bg-gray-100 border-gray-300 text-gray-700',
  rare: 'bg-blue-100 border-blue-300 text-blue-700',
  epic: 'bg-purple-100 border-purple-300 text-purple-700',
  legendary: 'bg-gradient-to-br from-yellow-100 to-orange-100 border-yellow-400 text-orange-700',
};

const RARITY_CHANCES = {
  common: 0.6,
  rare: 0.25,
  epic: 0.12,
  legendary: 0.03,
};

export default function PetsPage() {
  const { pets, activePet, setActivePet, addPet, addExperience, getXPBonus } = usePets();
  const [openingBox, setOpeningBox] = useState(false);
  const [newPet, setNewPet] = useState<Pet | null>(null);
  const [clickCount, setClickCount] = useState(0);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; color: string; size: number }>>([]);
  const [shake, setShake] = useState(0);
  const clicksNeeded = 5;

  // Crear lista de todas las mascotas con estado bloqueado/desbloqueado
  const allPetsWithStatus = AVAILABLE_PETS.map(availablePet => {
    const ownedPet = pets.find(p => p.name === availablePet.name);
    return {
      ...availablePet,
      isUnlocked: !!ownedPet,
      ownedData: ownedPet,
    };
  });

  const handleBoxClick = () => {
    // Ignorar clics si la caja ya se está abriendo o si ya llegamos a los 5 clics
    if (!openingBox || clickCount >= clicksNeeded) {
      return;
    }
    
    const newClickCount = clickCount + 1;
    setClickCount(newClickCount);
    setShake(shake + 1);
    
    // Generar partículas coloridas en cada clic
    const colors = ['#ef4444', '#f59e0b', '#eab308', '#22c55e', '#06b6d4', '#8b5cf6', '#ec4899'];
    const newParticles = Array.from({ length: 20 }, (_, i) => ({
      id: Date.now() + i,
      x: Math.random() * 400 - 200,
      y: Math.random() * 400 - 200,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 8 + 4,
    }));
    setParticles([...particles, ...newParticles]);
    
    // Limpiar partículas antiguas
    setTimeout(() => {
      setParticles([]);
    }, 1000);
    
    // Si alcanzamos exactamente 5 clics, abrir la caja
    if (newClickCount === clicksNeeded) {
      openBox();
    }
  };

  const openBox = () => {
    // Generar explosión masiva de partículas
    const colors = ['#ef4444', '#f59e0b', '#eab308', '#22c55e', '#06b6d4', '#8b5cf6', '#ec4899', '#ffffff'];
    const finalParticles = Array.from({ length: 100 }, (_, i) => ({
      id: Date.now() + i,
      x: Math.random() * 800 - 400,
      y: Math.random() * 800 - 400,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 12 + 6,
    }));
    setParticles(finalParticles);
    
    setTimeout(() => {
      const random = Math.random();
      let cumulativeChance = 0;
      let selectedRarity: Pet['rarity'] = 'common';
      
      for (const [rarity, chance] of Object.entries(RARITY_CHANCES)) {
        cumulativeChance += chance;
        if (random <= cumulativeChance) {
          selectedRarity = rarity as Pet['rarity'];
          break;
        }
      }
      
      const availablePets = AVAILABLE_PETS.filter(p => p.rarity === selectedRarity);
      const randomPet = availablePets[Math.floor(Math.random() * availablePets.length)];
      
      const pet: Omit<Pet, 'id'> = {
        ...randomPet,
        level: 1,
        experience: 0,
        maxExperience: 100,
        isActive: pets.length === 0, // First pet is active by default
      };
      
      addPet(pet);
      setNewPet({ ...pet, id: Date.now().toString() }); // Temporary ID for display
      setOpeningBox(false);
      setClickCount(0);
      setParticles([]);
      setShake(0);
    }, 2000);
  };

  const handleSelectPet = (pet: Pet) => {
    setActivePet(pet);
  };

  const handleTrainPet = (pet: Pet) => {
    addExperience(pet.id, 50);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="flex items-center gap-3 text-3xl font-bold text-gray-900">
          <Sparkles className="w-8 h-8 text-indigo-600" />
          Mis Mascotas
        </h1>
        <p className="text-gray-600 mt-2">Abre cajas, desbloquea mascotas y súbelas de nivel</p>
        {activePet && (
          <div className="mt-2 text-sm text-indigo-600 font-medium">
            🎁 Bonificación actual: +{getXPBonus()}% XP
          </div>
        )}
      </div>

      {/* Open Box Section */}
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-8 mb-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold text-white mb-2">
              <Gift className="w-6 h-6" />
              Caja Misteriosa
            </h2>
            <p className="text-indigo-100 mb-4">¡Haz clic 5 veces para abrir la caja!</p>
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                <span>Común 60%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                <span>Raro 25%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-400 rounded-full"></div>
                <span>Épico 12%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                <span>Legendario 3%</span>
              </div>
            </div>
          </div>
          
          <button
            onClick={() => {
              if (!openingBox) {
                setOpeningBox(true);
                setClickCount(0);
              }
            }}
            disabled={openingBox}
            className="bg-white text-indigo-600 px-8 py-4 rounded-xl hover:bg-indigo-50 flex items-center gap-2 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Gift className="w-5 h-5" />
            Abrir Caja
          </button>
        </div>
      </div>

      {/* Opening Animation */}
      <AnimatePresence>
        {openingBox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gradient-to-br from-purple-900/90 via-indigo-900/90 to-pink-900/90 flex flex-col items-center justify-center z-50 cursor-pointer"
            onClick={handleBoxClick}
          >
            {/* Progress Indicator */}
            <div className="absolute top-20 flex flex-col items-center gap-4">
              <div className="text-white text-2xl font-bold">
                Clics: {clickCount} / {clicksNeeded}
              </div>
              <div className="flex gap-2">
                {Array.from({ length: clicksNeeded }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-4 h-4 rounded-full transition-all ${
                      i < clickCount ? 'bg-yellow-400 scale-125' : 'bg-white/30'
                    }`}
                  />
                ))}
              </div>
              <div className="text-white/70 text-sm">¡Sigue haciendo clic!</div>
            </div>

            {/* Box Animation */}
            <motion.div
              key={shake}
              animate={{
                rotate: clickCount >= clicksNeeded ? [0, 180, 360, 540, 720] : [0, -15, 15, -15, 15, 0],
                scale: clickCount >= clicksNeeded ? [1, 1.5, 2, 2.5, 0] : [1, 1.15, 1],
                y: clickCount >= clicksNeeded ? [0, -50, -100, -150, 0] : [0, -20, 0],
              }}
              transition={{ 
                duration: clickCount >= clicksNeeded ? 2 : 0.6,
                ease: "easeInOut"
              }}
              className="text-9xl relative"
            >
              🎁
              {/* Glow effect */}
              <motion.div
                animate={{
                  opacity: [0.5, 1, 0.5],
                  scale: [1, 1.2, 1],
                }}
                transition={{ duration: 1, repeat: Infinity }}
                className="absolute inset-0 blur-3xl"
                style={{
                  background: `radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%)`,
                }}
              />
            </motion.div>

            {/* Circular rings */}
            {clickCount > 0 && (
              <>
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 2, opacity: 0 }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="absolute w-40 h-40 border-4 border-white/30 rounded-full"
                />
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 2, opacity: 0 }}
                  transition={{ duration: 1, delay: 0.3, repeat: Infinity }}
                  className="absolute w-40 h-40 border-4 border-yellow-400/30 rounded-full"
                />
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Particles Animation */}
      <AnimatePresence>
        {particles.map(particle => (
          <motion.div
            key={particle.id}
            initial={{ 
              x: 0, 
              y: 0, 
              opacity: 1, 
              scale: 1,
            }}
            animate={{ 
              x: particle.x, 
              y: particle.y, 
              opacity: 0,
              scale: 0,
              rotate: Math.random() * 360,
            }}
            exit={{ opacity: 0 }}
            transition={{ 
              duration: 1.5, 
              ease: "easeOut"
            }}
            className="fixed pointer-events-none z-[60] rounded-full"
            style={{ 
              left: '50%', 
              top: '50%',
              width: particle.size,
              height: particle.size,
              backgroundColor: particle.color,
              boxShadow: `0 0 ${particle.size * 2}px ${particle.color}`,
            }}
          />
        ))}
      </AnimatePresence>

      {/* New Pet Modal */}
      <AnimatePresence>
        {newPet && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm"
            onClick={() => setNewPet(null)}
          >
            {/* Confetti effect */}
            {Array.from({ length: 50 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  x: 0, 
                  y: 0, 
                  opacity: 1,
                  rotate: 0,
                }}
                animate={{ 
                  x: (Math.random() - 0.5) * 1000,
                  y: Math.random() * 1000,
                  opacity: 0,
                  rotate: Math.random() * 720,
                }}
                transition={{ 
                  duration: 3,
                  delay: i * 0.02,
                  ease: "easeOut"
                }}
                className="absolute left-1/2 top-1/4 w-3 h-3 rounded-sm"
                style={{
                  backgroundColor: ['#ef4444', '#f59e0b', '#eab308', '#22c55e', '#06b6d4', '#8b5cf6', '#ec4899'][i % 7],
                }}
              />
            ))}

            <motion.div
              initial={{ scale: 0, rotate: -180, y: 100 }}
              animate={{ scale: 1, rotate: 0, y: 0 }}
              exit={{ scale: 0, rotate: 180, y: -100 }}
              transition={{ type: "spring", duration: 0.8 }}
              className="bg-white rounded-2xl p-8 max-w-md mx-4 relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Background glow */}
              <div 
                className="absolute inset-0 opacity-20 blur-3xl"
                style={{
                  background: `radial-gradient(circle, ${newPet.color} 0%, transparent 70%)`,
                }}
              />

              <div className="text-center relative z-10">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: "spring" }}
                >
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">¡Nueva Mascota Desbloqueada!</h3>
                </motion.div>

                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-9xl mb-4 relative"
                  style={{
                    filter: `drop-shadow(0 0 30px ${newPet.color})`,
                  }}
                >
                  {newPet.emoji}
                  
                  {/* Sparkles around pet */}
                  {Array.from({ length: 8 }).map((_, i) => (
                    <motion.span
                      key={i}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ 
                        scale: [0, 1, 0],
                        opacity: [0, 1, 0],
                        rotate: i * 45,
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: i * 0.2,
                      }}
                      className="absolute text-2xl"
                      style={{
                        left: `${50 + Math.cos(i * Math.PI / 4) * 60}%`,
                        top: `${50 + Math.sin(i * Math.PI / 4) * 60}%`,
                      }}
                    >
                      ✨
                    </motion.span>
                  ))}
                </motion.div>

                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <h4 className="text-xl font-bold text-gray-900 mb-2">{newPet.name}</h4>
                  <p className="text-gray-600 mb-3">{newPet.type}</p>
                  <div className={`inline-block px-4 py-1 rounded-full border-2 text-sm mb-4 ${RARITY_COLORS[newPet.rarity]}`}>
                    {newPet.rarity === 'common' && '⭐ Común'}
                    {newPet.rarity === 'rare' && '⭐⭐ Raro'}
                    {newPet.rarity === 'epic' && '⭐⭐⭐ Épico'}
                    {newPet.rarity === 'legendary' && '⭐⭐⭐⭐ Legendario'}
                  </div>
                  <button
                    onClick={() => setNewPet(null)}
                    className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition-all hover:scale-105 font-medium"
                  >
                    ¡Genial!
                  </button>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Pet */}
      {activePet && (
        <div className="bg-white rounded-2xl p-6 mb-8 border-2 border-indigo-500">
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-bold text-gray-900">Mascota Activa</h3>
          </div>
          <div className="flex items-center gap-6">
            <div 
              className="text-7xl"
              style={{
                filter: `drop-shadow(0 0 15px ${activePet.color})`
              }}
            >
              {activePet.emoji}
            </div>
            <div className="flex-1">
              <h4 className="text-xl font-bold text-gray-900">{activePet.name}</h4>
              <p className="text-gray-600 mb-3">{activePet.type}</p>
              <div className="mb-2">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-600 font-medium">Nivel {activePet.level}</span>
                  <span className="text-gray-600">{activePet.experience}/{activePet.maxExperience} XP</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-indigo-600 h-2 rounded-full transition-all"
                    style={{ width: `${(activePet.experience / activePet.maxExperience) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pets Grid */}
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-gray-600" />
          Colección de Mascotas ({pets.length}/{AVAILABLE_PETS.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allPetsWithStatus.map((petInfo, index) => {
            const pet = petInfo.ownedData;
            const isLocked = !petInfo.isUnlocked;
            
            return (
              <motion.div
                key={petInfo.name}
                whileHover={!isLocked ? { scale: 1.02 } : {}}
                className={`bg-white rounded-xl p-6 border-2 transition-all ${
                  isLocked 
                    ? 'border-gray-300 opacity-60' 
                    : pet && activePet?.id === pet.id 
                      ? 'border-indigo-500 shadow-lg cursor-pointer' 
                      : 'border-gray-200 hover:border-indigo-300 cursor-pointer'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="text-5xl relative">
                    {isLocked ? (
                      <>
                        <span className="blur-sm">{petInfo.emoji}</span>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-3xl">🔒</div>
                        </div>
                      </>
                    ) : (
                      petInfo.emoji
                    )}
                  </div>
                  <div className={`px-3 py-1 rounded-full border text-xs ${RARITY_COLORS[petInfo.rarity]}`}>
                    {petInfo.rarity === 'common' && 'Común'}
                    {petInfo.rarity === 'rare' && 'Raro'}
                    {petInfo.rarity === 'epic' && 'Épico'}
                    {petInfo.rarity === 'legendary' && 'Legendario'}
                  </div>
                </div>
                
                <h4 className={`text-lg font-bold mb-1 ${isLocked ? 'text-gray-400' : 'text-gray-900'}`}>
                  {isLocked ? '???' : petInfo.name}
                </h4>
                <p className={`text-sm mb-3 ${isLocked ? 'text-gray-400' : 'text-gray-600'}`}>
                  {isLocked ? 'Bloqueado' : petInfo.type}
                </p>
                
                {!isLocked && pet ? (
                  <>
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-600 font-medium">Nivel {pet.level}</span>
                        <span className="text-gray-600">{pet.experience}/{pet.maxExperience} XP</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full transition-all"
                          style={{ 
                            width: `${(pet.experience / pet.maxExperience) * 100}%`,
                            backgroundColor: petInfo.color
                          }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSelectPet(pet)}
                        className={`flex-1 py-2 rounded-lg text-sm transition-colors font-medium ${
                          activePet?.id === pet.id
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {activePet?.id === pet.id ? '✓ Activa' : 'Seleccionar'}
                      </button>
                      <button
                        onClick={() => handleTrainPet(pet)}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm flex items-center gap-1 font-medium"
                      >
                        <Zap className="w-4 h-4" />
                        Entrenar
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="py-8 text-center">
                    <div className="text-4xl mb-2">🎁</div>
                    <p className="text-gray-400 text-sm">Abre cajas para desbloquear</p>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
