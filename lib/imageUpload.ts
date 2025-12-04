import { createClient } from './supabase/browserClient'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']

export type UploadResult = {
  url: string
  path: string
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
  if (file.size > MAX_FILE_SIZE) {
    return {
      data: null,
      error: {
        message: 'El archivo es demasiado grande. Máximo 5MB.',
        code: 'FILE_TOO_LARGE',
      },
    }
  }

  // Validate file type
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
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
 * Delete an image from Supabase Storage
 * @param path - The path of the image to delete
 * @returns Promise with success status
 */
export async function deleteImage(path: string): Promise<{ error: UploadError | null }> {
  try {
    const supabase = createClient()

    const { error } = await supabase.storage
      .from('post-images')
      .remove([path])

    if (error) {
      return {
        error: {
          message: 'Error al eliminar la imagen.',
          code: error.message,
        },
      }
    }

    return { error: null }
  } catch (err) {
    return {
      error: {
        message: 'Error inesperado al eliminar la imagen.',
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
