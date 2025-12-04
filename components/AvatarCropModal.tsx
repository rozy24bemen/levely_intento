'use client'

import { useState, useRef, useCallback } from 'react'
import { X, Check, ZoomIn, ZoomOut } from 'lucide-react'
import Image from 'next/image'

type AvatarCropModalProps = {
  imageUrl: string
  onSave: (croppedBlob: Blob) => void
  onCancel: () => void
}

export default function AvatarCropModal({ imageUrl, onSave, onCancel }: AvatarCropModalProps) {
  const [zoom, setZoom] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleSave = useCallback(async () => {
    if (!canvasRef.current || !imageRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size to 400x400 (avatar size)
    const size = 400
    canvas.width = size
    canvas.height = size

    // Calculate source dimensions
    const img = imageRef.current
    const scale = zoom
    const sourceSize = Math.min(img.naturalWidth, img.naturalHeight) / scale
    
    // Center crop
    const sourceX = (img.naturalWidth - sourceSize) / 2 - (position.x / (300 * zoom))
    const sourceY = (img.naturalHeight - sourceSize) / 2 - (position.y / (300 * zoom))

    // Draw the cropped image
    ctx.drawImage(
      img,
      sourceX,
      sourceY,
      sourceSize,
      sourceSize,
      0,
      0,
      size,
      size
    )

    // Convert to blob
    canvas.toBlob((blob) => {
      if (blob) {
        onSave(blob)
      }
    }, 'image/jpeg', 0.9)
  }, [zoom, position, onSave])

  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Ajustar foto de perfil</h2>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Crop area */}
        <div
          className="relative w-full aspect-square bg-gray-100 rounded-lg overflow-hidden mb-4 cursor-move"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`
            }}
          >
            <Image
              ref={imageRef}
              src={imageUrl}
              alt="Preview"
              width={300}
              height={300}
              className="max-w-full max-h-full object-contain"
              draggable={false}
            />
          </div>
          {/* Circle overlay */}
          <div className="absolute inset-0 pointer-events-none">
            <svg className="w-full h-full">
              <defs>
                <mask id="circleMask">
                  <rect width="100%" height="100%" fill="white" />
                  <circle cx="50%" cy="50%" r="40%" fill="black" />
                </mask>
              </defs>
              <rect width="100%" height="100%" fill="black" opacity="0.5" mask="url(#circleMask)" />
              <circle cx="50%" cy="50%" r="40%" fill="none" stroke="white" strokeWidth="2" />
            </svg>
          </div>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-4 mb-6">
          <ZoomOut className="w-5 h-5 text-gray-600" />
          <input
            type="range"
            min="1"
            max="3"
            step="0.1"
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="flex-1"
          />
          <ZoomIn className="w-5 h-5 text-gray-600" />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition font-medium flex items-center justify-center gap-2"
          >
            <Check className="w-5 h-5" />
            Guardar
          </button>
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  )
}
