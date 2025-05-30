import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        try {
          // Send user data to our new backend endpoint
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/nextauth`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: user.email!,
              name: user.name || '',
              google_id: user.id || user.email!,
              avatar_url: user.image || ''
            }),
          });

          if (response.ok) {
            const data = await response.json();
            // Store our custom JWT token
            (user as any).accessToken = data.access_token;
            (user as any).backendUser = data.user;
            return true;
          } else {
            console.error('Backend authentication failed:', response.statusText);
            return false; // This will cause the sign-in to fail
          }
        } catch (error) {
          console.error('Backend authentication error:', error);
          return false; // This will cause the sign-in to fail
        }
      }
      return false;
    },
    async jwt({ token, user, account }) {
      // Store the backend JWT token in the NextAuth token
      if ((user as any)?.accessToken) {
        token.accessToken = (user as any).accessToken;
        token.backendUser = (user as any).backendUser;
      }
      return token;
    },
    async session({ session, token }) {
      // Send backend user info to the client
      if (token.accessToken) {
        (session as any).accessToken = token.accessToken;
        if (token.backendUser) {
          session.user = token.backendUser as any;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
  },
}