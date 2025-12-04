export type Profile = {
  id: string
  username: string
  email: string | null
  bio: string | null
  avatar_url: string | null
  level: number
  xp: number
  created_at: string
  updated_at: string
}

export type Post = {
  id: string
  content: string
  created_at: string
  likes_count: number
  comments_count: number
  media_url: string | null
  media_type: 'image' | 'video' | null
  profiles: Profile | null
}

export type PostWithProfile = {
  id: string
  content: string
  created_at: string
  likes_count: number
  comments_count: number
  media_url: string | null
  media_type: 'image' | 'video' | null
  profiles: Profile
}

export type Comment = {
  id: string
  post_id: string
  author_id: string
  content: string
  created_at: string
  updated_at: string
  profiles: Profile | null
}

export type Short = {
  id: string
  author_id: string
  video_url: string
  thumbnail_url: string | null
  title: string | null
  description: string | null
  likes_count: number
  comments_count: number
  views_count: number
  created_at: string
  profiles: Profile | null
}

export type ShortComment = {
  id: string
  short_id: string
  author_id: string
  content: string
  created_at: string
  updated_at: string
  profiles: Profile | null
}
