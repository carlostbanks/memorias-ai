import NextAuth from "next-auth"
import { JWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    accessToken?: string
    user: {
      id: string
      email: string
      name: string
      image?: string
    }
  }

  interface User {
    accessToken?: string
    backendUser?: {
      id: string
      email: string
      name: string
      google_id: string
      avatar_url?: string
      created_at: string
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string
    backendUser?: {
      id: string
      email: string
      name: string
      google_id: string
      avatar_url?: string
      created_at: string
    }
  }
}