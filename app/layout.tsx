import './globals.css'

export const metadata = { title: 'Stock Tracker AI', description: 'AI stock trading research and paper-trading dashboard' }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>
}
