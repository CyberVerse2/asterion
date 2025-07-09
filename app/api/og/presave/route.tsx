import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0f0f23',
          backgroundImage: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '40px'
        }}
      >
        {/* Background gradient overlay */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              'linear-gradient(135deg, rgba(102, 126, 234, 0.8) 0%, rgba(118, 75, 162, 0.8) 100%)'
          }}
        />

        {/* Main content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            zIndex: 1,
            position: 'relative'
          }}
        >
          {/* Logo/Title */}
          <div
            style={{
              fontSize: '72px',
              fontWeight: 'bold',
              color: '#ffffff',
              marginBottom: '20px',
              textShadow: '0 4px 8px rgba(0, 0, 0, 0.3)'
            }}
          >
            📚 Asterion
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontSize: '32px',
              color: '#ffffff',
              marginBottom: '40px',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
              maxWidth: '600px'
            }}
          >
            Read your favourite novels on Farcaster while tipping authors
          </div>

          {/* CTA Button */}
          <div
            style={{
              backgroundColor: '#ffffff',
              color: '#667eea',
              padding: '16px 32px',
              borderRadius: '50px',
              fontSize: '24px',
              fontWeight: 'bold',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
              border: '2px solid rgba(255, 255, 255, 0.2)'
            }}
          >
            🚀 Pre-save Asterion
          </div>

          {/* Decorative elements */}
          <div
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              fontSize: '48px',
              opacity: 0.3
            }}
          >
            ⭐
          </div>
          <div
            style={{
              position: 'absolute',
              bottom: '20px',
              left: '20px',
              fontSize: '48px',
              opacity: 0.3
            }}
          >
            💎
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630
    }
  );
}
