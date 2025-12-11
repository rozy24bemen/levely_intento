'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export type Pet = {
  id: string;
  name: string;
  type: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  emoji: string;
  color: string;
  level: number;
  experience: number;
  maxExperience: number;
  isActive?: boolean;
  createdAt?: string;
};

type PetContextType = {
  pets: Pet[];
  activePet: Pet | null;
  loading: boolean;
  setActivePet: (pet: Pet) => Promise<void>;
  addPet: (pet: Omit<Pet, 'id' | 'createdAt'>) => Promise<void>;
  addExperience: (petId: string, amount: number) => Promise<void>;
  refreshPets: () => Promise<void>;
  getXPBonus: () => number;
};

const PetContext = createContext<PetContextType | undefined>(undefined);

export function usePets() {
  const context = useContext(PetContext);
  if (!context) {
    throw new Error('usePets must be used within a PetProvider');
  }
  return context;
}

export function PetProvider({ children }: { children: ReactNode }) {
  const [pets, setPets] = useState<Pet[]>([]);
  const [activePet, setActivePetState] = useState<Pet | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClientComponentClient();

  // Fetch pets from database
  const fetchPets = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('pets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching pets:', error);
        return;
      }

      if (data) {
        const formattedPets: Pet[] = data.map(pet => ({
          id: pet.id,
          name: pet.name,
          type: pet.type,
          rarity: pet.rarity,
          emoji: pet.emoji,
          color: pet.color,
          level: pet.level,
          experience: pet.experience,
          maxExperience: pet.max_experience,
          isActive: pet.is_active,
          createdAt: pet.created_at,
        }));

        setPets(formattedPets);
        
        // Set active pet
        const active = formattedPets.find(p => p.isActive);
        setActivePetState(active || null);
      }
    } catch (error) {
      console.error('Error in fetchPets:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPets();
  }, []);

  // Add new pet
  const addPet = async (pet: Omit<Pet, 'id' | 'createdAt'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('pets')
        .insert({
          user_id: user.id,
          name: pet.name,
          type: pet.type,
          rarity: pet.rarity,
          emoji: pet.emoji,
          color: pet.color,
          level: pet.level,
          experience: pet.experience,
          max_experience: pet.maxExperience,
          is_active: pet.isActive || false,
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding pet:', error);
        return;
      }

      if (data) {
        const newPet: Pet = {
          id: data.id,
          name: data.name,
          type: data.type,
          rarity: data.rarity,
          emoji: data.emoji,
          color: data.color,
          level: data.level,
          experience: data.experience,
          maxExperience: data.max_experience,
          isActive: data.is_active,
          createdAt: data.created_at,
        };

        setPets(prev => [newPet, ...prev]);
        
        // If this is the first pet or isActive is true, set as active
        if (pets.length === 0 || pet.isActive) {
          setActivePetState(newPet);
        }
      }
    } catch (error) {
      console.error('Error in addPet:', error);
    }
  };

  // Set active pet
  const setActivePet = async (pet: Pet) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Update database - trigger will handle deactivating other pets
      const { error } = await supabase
        .from('pets')
        .update({ is_active: true })
        .eq('id', pet.id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error setting active pet:', error);
        return;
      }

      // Update local state
      setPets(prev => 
        prev.map(p => ({
          ...p,
          isActive: p.id === pet.id
        }))
      );
      
      setActivePetState({ ...pet, isActive: true });
    } catch (error) {
      console.error('Error in setActivePet:', error);
    }
  };

  // Add experience to pet
  const addExperience = async (petId: string, amount: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get current pet data
      const { data: currentPet, error: fetchError } = await supabase
        .from('pets')
        .select('*')
        .eq('id', petId)
        .eq('user_id', user.id)
        .single();

      if (fetchError || !currentPet) {
        console.error('Error fetching pet:', fetchError);
        return;
      }

      // Update experience (trigger will handle level up)
      const { data, error } = await supabase
        .from('pets')
        .update({ 
          experience: currentPet.experience + amount 
        })
        .eq('id', petId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error adding experience:', error);
        return;
      }

      if (data) {
        const updatedPet: Pet = {
          id: data.id,
          name: data.name,
          type: data.type,
          rarity: data.rarity,
          emoji: data.emoji,
          color: data.color,
          level: data.level,
          experience: data.experience,
          maxExperience: data.max_experience,
          isActive: data.is_active,
          createdAt: data.created_at,
        };

        // Update local state
        setPets(prev => 
          prev.map(p => p.id === petId ? updatedPet : p)
        );

        // Update active pet if it's the one being updated
        if (activePet?.id === petId) {
          setActivePetState(updatedPet);
        }
      }
    } catch (error) {
      console.error('Error in addExperience:', error);
    }
  };

  // Calculate XP bonus based on active pet
  const getXPBonus = (): number => {
    if (!activePet) return 0;
    
    // Base bonus by rarity
    const rarityBonus = {
      common: 5,
      rare: 10,
      epic: 15,
      legendary: 25,
    };

    // Level bonus: +1% per level
    const levelBonus = activePet.level;

    return rarityBonus[activePet.rarity] + levelBonus;
  };

  // Refresh pets from database
  const refreshPets = async () => {
    await fetchPets();
  };

  return (
    <PetContext.Provider
      value={{
        pets,
        activePet,
        loading,
        setActivePet,
        addPet,
        addExperience,
        refreshPets,
        getXPBonus,
      }}
    >
      {children}
    </PetContext.Provider>
  );
}
