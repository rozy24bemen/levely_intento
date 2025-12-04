'use client'

import { X } from 'lucide-react'
import { useEffect } from 'react'

interface ImageModalProps {
  imageUrl: string
  onClose: () => void
}

export default function ImageModal({ imageUrl, onClose }: ImageModalProps) {
  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    
    window.addEventListener('keydown', handleEscape)
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden'
    
    return () => {
      window.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [onClose])

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        aria-label="Cerrar"
      >
        <X className="w-6 h-6 text-white" />
      </button>

      {/* Image container */}
      <div 
        className="relative max-w-7xl max-h-[90vh] w-auto h-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={imageUrl}
          alt="Imagen completa"
          className="max-w-full max-h-[90vh] w-auto h-auto object-contain rounded-lg"
        />
      </div>
    </div>
  )
}
