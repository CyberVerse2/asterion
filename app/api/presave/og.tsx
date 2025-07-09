import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  // Placeholder covers (replace with real covers if you want to fetch from DB)
  const covers = [
    'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=facearea&w=256&h=384&q=80',
    'https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?auto=format&fit=facearea&w=256&h=384&q=80',
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=facearea&w=256&h=384&q=80',
    'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=facearea&w=256&h=384&q=80',
    'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=facearea&w=256&h=384&q=80'
  ];
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '800px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #18122B 0%, #393053 100%)',
          color: '#fff',
          fontFamily: 'Inter, sans-serif',
          position: 'relative'
        }}
      >
        {/* Logo */}
        <img
          src={'/placeholder.png'}
          width={120}
          height={120}
          style={{ borderRadius: '24px', marginBottom: 32 }}
        />
        {/* Title */}
        <div
          style={{
            fontSize: 64,
            fontWeight: 900,
            letterSpacing: -2,
            marginBottom: 16,
            textAlign: 'center',
            lineHeight: 1.1
          }}
        >
          Pre-save Asterion
        </div>
        {/* Tagline */}
        <div
          style={{
            fontSize: 36,
            fontWeight: 600,
            color: '#FFD700',
            marginBottom: 32,
            textAlign: 'center'
          }}
        >
          Join the viral waitlist for web novels on Farcaster
        </div>
        {/* Row of covers */}
        <div style={{ display: 'flex', gap: 24, marginBottom: 40 }}>
          {covers.map((src, i) => (
            <img
              key={i}
              src={src}
              width={120}
              height={180}
              style={{ borderRadius: 12, boxShadow: '0 4px 24px #0008' }}
            />
          ))}
        </div>
        {/* CTA */}
        <div
          style={{
            fontSize: 40,
            fontWeight: 800,
            background: 'linear-gradient(90deg, #A084E8 0%, #FFD700 100%)',
            color: 'transparent',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            marginBottom: 0
          }}
        >
          🚀 Pre-save now & get notified at launch!
        </div>
        {/* Footer */}
        <div
          style={{
            position: 'absolute',
            bottom: 32,
            fontSize: 28,
            color: '#B6BBC4',
            fontWeight: 500
          }}
        >
          asterion.xyz
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 800,
      headers: {
        'Content-Type': 'image/png'
      }
    }
  );
}
