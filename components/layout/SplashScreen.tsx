'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

const SESSION_KEY = 'ers_splash_shown'
const GREEN = '#162b1e'
const GOLD = '#b8822a'

export function SplashScreen() {
  const [visible, setVisible] = useState(false)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    if (!sessionStorage.getItem(SESSION_KEY)) {
      setVisible(true)
    }
  }, [])

  // Called when the curtain-out animation finishes
  function handleDone() {
    sessionStorage.setItem(SESSION_KEY, '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <>
      <style>{`
        @keyframes sp-curtain-l {
          0%   { transform: translateX(0); }
          55%  { transform: translateX(0); }
          100% { transform: translateX(-100%); }
        }
        @keyframes sp-curtain-r {
          0%   { transform: translateX(0); }
          55%  { transform: translateX(0); }
          100% { transform: translateX(100%); }
        }
        @keyframes sp-content {
          0%   { opacity: 0; transform: scale(.9); }
          18%  { opacity: 1; transform: scale(1); }
          58%  { opacity: 1; transform: scale(1); }
          100% { opacity: 0; }
        }
        @keyframes sp-gold-line {
          0%   { scaleX: 0; opacity: 1; }
          18%  { scaleX: 1; opacity: 1; }
          58%  { scaleX: 1; opacity: 1; }
          100% { scaleX: 0; opacity: 0; }
        }
        .sp-curtain-l {
          animation: sp-curtain-l 1.4s cubic-bezier(.76, 0, .24, 1) forwards;
        }
        .sp-curtain-r {
          animation: sp-curtain-r 1.4s cubic-bezier(.76, 0, .24, 1) forwards;
        }
        .sp-content {
          animation: sp-content 1.4s ease forwards;
        }
        .sp-gold-line {
          animation: sp-gold-line 1.4s ease forwards;
          transform-origin: center;
        }
      `}</style>

      {/* Root layer */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          overflow: 'hidden',
        }}
      >
        {/* Left curtain panel */}
        <div
          className="sp-curtain-l"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '50%',
            height: '100%',
            background: GREEN,
            borderRight: `2px solid ${GOLD}`,
          }}
        />

        {/* Right curtain panel */}
        <div
          className="sp-curtain-r"
          onAnimationEnd={handleDone}
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '50%',
            height: '100%',
            background: GREEN,
            borderLeft: `2px solid ${GOLD}`,
          }}
        />

        {/* Gold center seam line */}
        <div
          className="sp-gold-line"
          style={{
            position: 'absolute',
            top: '20%',
            left: '50%',
            width: '1px',
            height: '60%',
            background: `linear-gradient(to bottom, transparent, ${GOLD}, transparent)`,
            marginLeft: '-0.5px',
          }}
        />

        {/* Logo + title — always centered */}
        <div
          className="sp-content"
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '18px',
            textAlign: 'center',
          }}
        >
          {/* Logo card */}
          <div
            style={{
              background: 'rgba(255,255,255,.97)',
              borderRadius: '16px',
              padding: '14px 28px',
              boxShadow: '0 6px 40px rgba(0,0,0,.45)',
            }}
          >
            <Image
              src="/dabs-logo.png"
              alt="شعار المنظمة"
              width={180}
              height={60}
              priority
              style={{ maxHeight: '54px', width: 'auto', display: 'block' }}
            />
          </div>

          {/* App title */}
          <div>
            <div
              style={{
                fontFamily: 'var(--nf-cairo, Cairo, sans-serif)',
                fontSize: '20px',
                fontWeight: 700,
                color: 'rgba(255,255,255,.95)',
                marginBottom: '8px',
                letterSpacing: '-.01em',
              }}
            >
              لوحة تحكم قطاع الثقافة
            </div>
            {/* Gold divider */}
            <div
              style={{
                width: '40px',
                height: '2px',
                background: GOLD,
                margin: '0 auto 8px',
                borderRadius: '2px',
              }}
            />
            <div
              style={{
                fontFamily: 'var(--nf-space, "Space Grotesk", sans-serif)',
                fontSize: '10.5px',
                letterSpacing: '.12em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,.45)',
              }}
            >
              Islamic Affairs Division
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
