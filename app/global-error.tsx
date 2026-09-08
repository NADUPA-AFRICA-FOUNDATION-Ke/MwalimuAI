'use client'

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#0E201B', color: '#F3FAF7', fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
        <main style={{ minHeight: '100svh', display: 'grid', placeItems: 'center', padding: '24px', textAlign: 'center' }}>
          <div style={{ maxWidth: '520px' }}>
            <p style={{ color: '#F8BD57', fontWeight: 800, letterSpacing: '.16em', textTransform: 'uppercase', fontSize: '12px' }}>Mwalimu AI · 500</p>
            <h1 style={{ fontSize: 'clamp(32px, 6vw, 56px)', lineHeight: 1.05, margin: '16px 0' }}>A page needs a fresh start.</h1>
            <p style={{ color: '#C0D1CA', lineHeight: 1.6, margin: '0 auto 28px' }}>The app could not finish loading. Try once more, or return when your connection is ready.</p>
            <button type="button" onClick={() => reset()} style={{ cursor: 'pointer', border: 0, borderRadius: '12px', padding: '12px 18px', background: '#F5A623', color: '#2D1B00', fontWeight: 700, fontSize: '14px' }}>Try again</button>
          </div>
        </main>
      </body>
    </html>
  )
}
