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
  media_url: string | null
  profiles: Profile | null
}

export type PostWithProfile = {
  id: string
  content: string
  created_at: string
  likes_count: number
  media_url: string | null
  profiles: Profile
}
