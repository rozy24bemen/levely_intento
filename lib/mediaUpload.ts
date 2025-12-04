import { createClient } from './supabase/browserClient'

// Image constraints
const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']

// Video constraints
const MAX_VIDEO_SIZE = 50 * 1024 * 1024 // 50MB
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']

export type MediaType = 'image' | 'video'

export type UploadResult = {
  url: string
  path: string
  type: MediaType
}

export type UploadError = {
  message: string
  code?: string
}

/**
 * Upload an image to Supabase Storage
 * @param file - The image file to upload
 * @param userId - The ID of the user uploading the image
 * @returns Promise with the public URL or error
 */
export async function uploadImage(
  file: File,
  userId: string
): Promise<{ data: UploadResult | null; error: UploadError | null }> {
  // Validate file size
  if (file.size > MAX_IMAGE_SIZE) {
    return {
      data: null,
      error: {
        message: 'La imagen es demasiado grande. Máximo 5MB.',
        code: 'FILE_TOO_LARGE',
      },
    }
  }

  // Validate file type
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      data: null,
      error: {
        message: 'Tipo de archivo no permitido. Solo se aceptan imágenes (JPG, PNG, WebP, GIF).',
        code: 'INVALID_FILE_TYPE',
      },
    }
  }

  try {
    const supabase = createClient()

    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `${userId}/${fileName}`

    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from('post-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (error) {
      return {
        data: null,
        error: {
          message: 'Error al subir la imagen. Inténtalo de nuevo.',
          code: error.message,
        },
      }
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('post-images')
      .getPublicUrl(data.path)

    return {
      data: {
        url: publicUrl,
        path: data.path,
        type: 'image',
      },
      error: null,
    }
  } catch (err) {
    return {
      data: null,
      error: {
        message: 'Error inesperado al subir la imagen.',
        code: 'UNKNOWN_ERROR',
      },
    }
  }
}

/**
 * Upload a video to Supabase Storage
 * @param file - The video file to upload
 * @param userId - The ID of the user uploading the video
 * @returns Promise with the public URL or error
 */
export async function uploadVideo(
  file: File,
  userId: string
): Promise<{ data: UploadResult | null; error: UploadError | null }> {
  // Validate file size
  if (file.size > MAX_VIDEO_SIZE) {
    return {
      data: null,
      error: {
        message: 'El video es demasiado grande. Máximo 50MB.',
        code: 'FILE_TOO_LARGE',
      },
    }
  }

  // Validate file type
  if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
    return {
      data: null,
      error: {
        message: 'Tipo de archivo no permitido. Solo se aceptan videos (MP4, WebM, MOV).',
        code: 'INVALID_FILE_TYPE',
      },
    }
  }

  try {
    const supabase = createClient()

    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `${userId}/${fileName}`

    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from('post-videos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (error) {
      return {
        data: null,
        error: {
          message: 'Error al subir el video. Inténtalo de nuevo.',
          code: error.message,
        },
      }
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('post-videos')
      .getPublicUrl(data.path)

    return {
      data: {
        url: publicUrl,
        path: data.path,
        type: 'video',
      },
      error: null,
    }
  } catch (err) {
    return {
      data: null,
      error: {
        message: 'Error inesperado al subir el video.',
        code: 'UNKNOWN_ERROR',
      },
    }
  }
}

/**
 * Delete a media file from Supabase Storage
 * @param path - The path of the file to delete
 * @param type - The type of media (image or video)
 * @returns Promise with success status
 */
export async function deleteMedia(
  path: string,
  type: MediaType
): Promise<{ error: UploadError | null }> {
  try {
    const supabase = createClient()
    const bucket = type === 'image' ? 'post-images' : 'post-videos'

    const { error } = await supabase.storage
      .from(bucket)
      .remove([path])

    if (error) {
      return {
        error: {
          message: `Error al eliminar ${type === 'image' ? 'la imagen' : 'el video'}.`,
          code: error.message,
        },
      }
    }

    return { error: null }
  } catch (err) {
    return {
      error: {
        message: 'Error inesperado al eliminar el archivo.',
        code: 'UNKNOWN_ERROR',
      },
    }
  }
}

/**
 * Validate image dimensions
 * @param file - The image file to validate
 * @param maxWidth - Maximum width in pixels
 * @param maxHeight - Maximum height in pixels
 * @returns Promise with validation result
 */
export async function validateImageDimensions(
  file: File,
  maxWidth: number = 4000,
  maxHeight: number = 4000
): Promise<{ valid: boolean; error?: string }> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)
      
      if (img.width > maxWidth || img.height > maxHeight) {
        resolve({
          valid: false,
          error: `La imagen es demasiado grande. Máximo ${maxWidth}x${maxHeight} píxeles.`,
        })
      } else {
        resolve({ valid: true })
      }
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve({
        valid: false,
        error: 'No se pudo leer la imagen.',
      })
    }

    img.src = url
  })
}

/**
 * Validate video duration
 * @param file - The video file to validate
 * @param maxDuration - Maximum duration in seconds (default 180 = 3 minutes)
 * @returns Promise with validation result
 */
export async function validateVideoDuration(
  file: File,
  maxDuration: number = 180
): Promise<{ valid: boolean; error?: string; duration?: number }> {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    const url = URL.createObjectURL(file)
    video.preload = 'metadata'

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url)
      const duration = Math.floor(video.duration)
      
      if (duration > maxDuration) {
        resolve({
          valid: false,
          error: `El video es demasiado largo. Máximo ${Math.floor(maxDuration / 60)} minutos.`,
          duration,
        })
      } else {
        resolve({ 
          valid: true,
          duration,
        })
      }
    }

    video.onerror = () => {
      URL.revokeObjectURL(url)
      resolve({
        valid: false,
        error: 'No se pudo leer el video.',
      })
    }

    video.src = url
  })
}

// Legacy function name for backward compatibility
export async function deleteImage(path: string): Promise<{ error: UploadError | null }> {
  return deleteMedia(path, 'image')
}
