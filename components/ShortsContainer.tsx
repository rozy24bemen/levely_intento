'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import ShortCard from './ShortCard'
import type { Short } from '@/lib/types'

interface ShortsContainerProps {
  initialShorts: Short[]
  currentUserId?: string
}

export default function ShortsContainer({ initialShorts, currentUserId }: ShortsContainerProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  // Setup Intersection Observer for auto-scroll detection
  useEffect(() => {
    const options = {
      root: containerRef.current,
      threshold: 0.5, // 50% visible
    }

    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const index = Number(entry.target.getAttribute('data-index'))
          setActiveIndex(index)
        }
      })
    }, options)

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [])

  // Attach observer to shorts
  useEffect(() => {
    const shorts = containerRef.current?.querySelectorAll('[data-short]')
    shorts?.forEach((short) => {
      if (observerRef.current) {
        observerRef.current.observe(short)
      }
    })

    return () => {
      shorts?.forEach((short) => {
        if (observerRef.current) {
          observerRef.current.unobserve(short)
        }
      })
    }
  }, [initialShorts])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' && activeIndex < initialShorts.length - 1) {
        const nextShort = containerRef.current?.querySelector(`[data-index="${activeIndex + 1}"]`)
        nextShort?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      } else if (e.key === 'ArrowUp' && activeIndex > 0) {
        const prevShort = containerRef.current?.querySelector(`[data-index="${activeIndex - 1}"]`)
        prevShort?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeIndex, initialShorts.length])

  if (initialShorts.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-600">
        <div className="text-center text-white">
          <div className="text-6xl mb-4">⚡</div>
          <h2 className="text-2xl font-bold mb-2">No hay Shorts aún</h2>
          <p className="text-white/80">¡Sé el primero en subir un Short!</p>
        </div>
      </div>
    )
  }

  return (
    <div 
      ref={containerRef}
      className="h-[100dvh] overflow-y-scroll snap-y snap-mandatory scroll-smooth scrollbar-hide"
    >
      {initialShorts.map((short, index) => (
        <div
          key={short.id}
          data-short
          data-index={index}
        >
          <ShortCard
            short={short}
            currentUserId={currentUserId}
            isActive={index === activeIndex}
          />
        </div>
      ))}
    </div>
  )
}
