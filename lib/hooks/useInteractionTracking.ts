'use client'

import { useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/browserClient'

interface UseInteractionTrackingProps {
  userId?: string
  postId?: string
  shortId?: string
  enabled?: boolean
}

export function useInteractionTracking({
  userId,
  postId,
  shortId,
  enabled = true
}: UseInteractionTrackingProps) {
  const supabase = createClient()
  const hasTrackedView = useRef(false)
  const viewTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const startTime = useRef<number | undefined>(undefined)

  // Track view after 2 seconds of viewing
  useEffect(() => {
    if (!enabled || !userId || (!postId && !shortId) || hasTrackedView.current) {
      return
    }

    startTime.current = Date.now()

    viewTimer.current = setTimeout(async () => {
      try {
        await supabase.rpc('track_user_interaction', {
          p_user_id: userId,
          p_post_id: postId || null,
          p_short_id: shortId || null,
          p_interaction_type: 'view',
          p_metadata: {
            timestamp: new Date().toISOString(),
            device: navigator.userAgent
          }
        })
        hasTrackedView.current = true
      } catch (error) {
        console.error('Error tracking view:', error)
      }
    }, 2000) // Track after 2 seconds

    return () => {
      if (viewTimer.current) {
        clearTimeout(viewTimer.current)
      }
    }
  }, [enabled, userId, postId, shortId, supabase])

  // Track watch time on unmount (for videos)
  useEffect(() => {
    return () => {
      if (startTime.current && hasTrackedView.current && (postId || shortId)) {
        const watchTime = Math.floor((Date.now() - startTime.current) / 1000)
        
        // Only track if watched for at least 2 seconds
        if (watchTime >= 2) {
          supabase.rpc('track_user_interaction', {
            p_user_id: userId,
            p_post_id: postId || null,
            p_short_id: shortId || null,
            p_interaction_type: 'watch_time',
            p_metadata: {
              watch_time_seconds: watchTime,
              timestamp: new Date().toISOString()
            }
          }).catch((error: any) => {
            console.error('Error tracking watch time:', error)
          })
        }
      }
    }
  }, [userId, postId, shortId, supabase])

  // Manual tracking functions
  const trackLike = useCallback(async () => {
    if (!userId || (!postId && !shortId)) return

    try {
      await supabase.rpc('track_user_interaction', {
        p_user_id: userId,
        p_post_id: postId || null,
        p_short_id: shortId || null,
        p_interaction_type: 'like',
        p_metadata: { timestamp: new Date().toISOString() }
      })
    } catch (error) {
      console.error('Error tracking like:', error)
    }
  }, [userId, postId, shortId, supabase])

  const trackComment = useCallback(async () => {
    if (!userId || (!postId && !shortId)) return

    try {
      await supabase.rpc('track_user_interaction', {
        p_user_id: userId,
        p_post_id: postId || null,
        p_short_id: shortId || null,
        p_interaction_type: 'comment',
        p_metadata: { timestamp: new Date().toISOString() }
      })
    } catch (error) {
      console.error('Error tracking comment:', error)
    }
  }, [userId, postId, shortId, supabase])

  const trackShare = useCallback(async () => {
    if (!userId || (!postId && !shortId)) return

    try {
      await supabase.rpc('track_user_interaction', {
        p_user_id: userId,
        p_post_id: postId || null,
        p_short_id: shortId || null,
        p_interaction_type: 'share',
        p_metadata: { timestamp: new Date().toISOString() }
      })
    } catch (error) {
      console.error('Error tracking share:', error)
    }
  }, [userId, postId, shortId, supabase])

  const trackSkip = useCallback(async () => {
    if (!userId || (!postId && !shortId)) return

    try {
      await supabase.rpc('track_user_interaction', {
        p_user_id: userId,
        p_post_id: postId || null,
        p_short_id: shortId || null,
        p_interaction_type: 'skip',
        p_metadata: { timestamp: new Date().toISOString() }
      })
    } catch (error) {
      console.error('Error tracking skip:', error)
    }
  }, [userId, postId, shortId, supabase])

  return {
    trackLike,
    trackComment,
    trackShare,
    trackSkip
  }
}
