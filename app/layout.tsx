import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { createClient } from '@/lib/supabase/serverClient'
import Navbar from '@/components/Navbar'
import XPNotificationContainer from '@/components/XPNotifications'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LEVELY - Red Social con Niveles",
  description: "Una comunidad donde tu participación te hace crecer",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  let profile = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('username, level, avatar_url')
      .eq('id', user.id)
      .single()
    profile = data
  }

  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Navbar user={user} profile={profile} />
        {children}
        <XPNotificationContainer />
      </body>
    </html>
  );
}
