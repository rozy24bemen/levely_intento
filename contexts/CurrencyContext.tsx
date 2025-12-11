'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/browserClient';

type CurrencyContextType = {
  coins: number;
  loading: boolean;
  addCoins: (amount: number) => Promise<void>;
  spendCoins: (amount: number) => boolean;
  refreshCoins: () => Promise<void>;
  updateMissionProgress: (missionId: string) => void;
};

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [coins, setCoins] = useState(0);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // Fetch coins from database
  const fetchCoins = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('coins')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching coins:', error);
        return;
      }

      if (data) {
        setCoins(data.coins || 0);
      }
    } catch (error) {
      console.error('Error in fetchCoins:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoins();
  }, []);

  // Add coins
  const addCoins = async (amount: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const newCoins = coins + amount;

      const { error } = await supabase
        .from('profiles')
        .update({ coins: newCoins })
        .eq('id', user.id);

      if (error) {
        console.error('Error adding coins:', error);
        return;
      }

      setCoins(newCoins);
    } catch (error) {
      console.error('Error in addCoins:', error);
    }
  };

  // Spend coins (returns false if not enough coins)
  const spendCoins = (amount: number): boolean => {
    if (coins < amount) {
      return false;
    }

    const newCoins = coins - amount;
    
    // Update database
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      
      supabase
        .from('profiles')
        .update({ coins: newCoins })
        .eq('id', user.id)
        .then(({ error }) => {
          if (error) {
            console.error('Error spending coins:', error);
          }
        });
    });

    setCoins(newCoins);
    return true;
  };

  // Refresh coins from database
  const refreshCoins = async () => {
    await fetchCoins();
  };

  // Placeholder for mission progress (can be expanded later)
  const updateMissionProgress = (missionId: string) => {
    console.log('Mission progress:', missionId);
    // TODO: Implement mission system if needed
  };

  return (
    <CurrencyContext.Provider
      value={{
        coins,
        loading,
        addCoins,
        spendCoins,
        refreshCoins,
        updateMissionProgress,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}
