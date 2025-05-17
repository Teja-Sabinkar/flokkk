import './globals.css';
import './fonts.css';
import { Analytics } from '@vercel/analytics/react';

export const metadata = {
  title: 'Turtle2.0',
  description: 'A Next.js application',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}