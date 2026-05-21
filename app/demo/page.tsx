'use client'

import { useState } from 'react'
import Image from 'next/image'

// ─── Shared constants ────────────────────────────────────────────────────────
const LOGO = '/dabs-logo.png'
const TITLE = 'لوحة تحكم قطاع الثقافة'
const SUBTITLE = 'قطاع الثقافة · Islamic Affairs Division'
const GREEN = '#162b1e'
const GOLD = '#b8822a'

// ─── Option A — Fade + Scale ─────────────────────────────────────────────────
function IntroA({ onDone }: { onDone: () => void }) {
  return (
    <>
      <style>{`
        @keyframes ia-logo { from { opacity:0; transform:scale(.88) } to { opacity:1; transform:scale(1) } }
        @keyframes ia-title { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:translateY(0) } }
        @keyframes ia-out { 0%,70%{opacity:1} 100%{opacity:0} }
        .ia-wrap { animation: ia-out 2.2s ease forwards; }
        .ia-logo { animation: ia-logo .6s cubic-bezier(.22,1,.36,1) .2s both; }
        .ia-title { animation: ia-title .5s cubic-bezier(.22,1,.36,1) .65s both; }
        .ia-sub { animation: ia-title .5s cubic-bezier(.22,1,.36,1) .85s both; }
      `}</style>
      <div className="ia-wrap" onAnimationEnd={onDone}
        style={{ position:'fixed', inset:0, background:GREEN, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'20px', zIndex:9999 }}>
        <div className="ia-logo" style={{ background:'rgba(255,255,255,.95)', borderRadius:'16px', padding:'12px 20px', boxShadow:'0 4px 24px rgba(0,0,0,.35)' }}>
          <Image src={LOGO} alt="شعار" width={160} height={56} style={{ maxHeight:'52px', width:'auto', display:'block' }} />
        </div>
        <div style={{ textAlign:'center' }}>
          <div className="ia-title" style={{ fontFamily:'var(--nf-cairo, Cairo, sans-serif)', fontSize:'22px', fontWeight:700, color:'rgba(255,255,255,.95)', marginBottom:'6px' }}>{TITLE}</div>
          <div className="ia-sub" style={{ fontFamily:'var(--nf-space, "Space Grotesk", sans-serif)', fontSize:'11px', letterSpacing:'.1em', color:GOLD }}>{SUBTITLE}</div>
        </div>
      </div>
    </>
  )
}

// ─── Option B — Curtain Reveal ───────────────────────────────────────────────
function IntroB({ onDone }: { onDone: () => void }) {
  return (
    <>
      <style>{`
        @keyframes ib-curtain-l { 0%{transform:translateX(0)} 60%,80%{transform:translateX(0)} 100%{transform:translateX(-100%)} }
        @keyframes ib-curtain-r { 0%{transform:translateX(0)} 60%,80%{transform:translateX(0)} 100%{transform:translateX(100%)} }
        @keyframes ib-content { from{opacity:0;transform:scale(.92)} 20%{opacity:1;transform:scale(1)} 65%{opacity:1} 100%{opacity:0} }
        .ib-cl { animation: ib-curtain-l 2.4s cubic-bezier(.76,0,.24,1) forwards; }
        .ib-cr { animation: ib-curtain-r 2.4s cubic-bezier(.76,0,.24,1) forwards; }
        .ib-ct { animation: ib-content 2.4s ease forwards; }
      `}</style>
      <div onAnimationEnd={onDone}
        style={{ position:'fixed', inset:0, zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
        {/* Left curtain */}
        <div className="ib-cl" style={{ position:'absolute', top:0, left:0, width:'50%', height:'100%', background:GREEN, borderRight:`2px solid ${GOLD}`, transformOrigin:'left' }} />
        {/* Right curtain */}
        <div className="ib-cr" style={{ position:'absolute', top:0, right:0, width:'50%', height:'100%', background:GREEN, borderLeft:`2px solid ${GOLD}`, transformOrigin:'right' }} />
        {/* Content */}
        <div className="ib-ct" style={{ position:'relative', zIndex:1, textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap:'16px' }}>
          <div style={{ background:'rgba(255,255,255,.95)', borderRadius:'16px', padding:'12px 24px', boxShadow:'0 4px 28px rgba(0,0,0,.4)' }}>
            <Image src={LOGO} alt="شعار" width={160} height={56} style={{ maxHeight:'52px', width:'auto', display:'block' }} />
          </div>
          <div style={{ fontFamily:'var(--nf-cairo, Cairo, sans-serif)', fontSize:'22px', fontWeight:700, color:'rgba(255,255,255,.95)' }}>{TITLE}</div>
          <div style={{ fontFamily:'var(--nf-space, "Space Grotesk", sans-serif)', fontSize:'11px', letterSpacing:'.1em', color:GOLD }}>{SUBTITLE}</div>
        </div>
      </div>
    </>
  )
}

// ─── Option C — Logo Build + Shimmer ────────────────────────────────────────
function IntroC({ onDone }: { onDone: () => void }) {
  return (
    <>
      <style>{`
        @keyframes ic-logo  { from{opacity:0;transform:scale(.8)} to{opacity:1;transform:scale(1)} }
        @keyframes ic-shimmer { from{left:-120%} to{left:160%} }
        @keyframes ic-type  { from{opacity:0;clip-path:inset(0 100% 0 0)} to{opacity:1;clip-path:inset(0 0% 0 0)} }
        @keyframes ic-sub   { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes ic-out   { 0%,72%{opacity:1} 100%{opacity:0} }
        .ic-wrap  { animation: ic-out 2.6s ease forwards; }
        .ic-logo  { animation: ic-logo .5s cubic-bezier(.22,1,.36,1) .1s both; position:relative;overflow:hidden; }
        .ic-shimmer { animation: ic-shimmer .7s ease .55s both; position:absolute;top:0;width:60px;height:100%;background:linear-gradient(105deg,transparent 0%,rgba(255,255,255,.65) 50%,transparent 100%);transform:skewX(-15deg); }
        .ic-type  { animation: ic-type .9s cubic-bezier(.22,1,.36,1) .7s both; direction:rtl; }
        .ic-sub   { animation: ic-sub .5s ease 1.3s both; }
      `}</style>
      <div className="ic-wrap" onAnimationEnd={onDone}
        style={{ position:'fixed', inset:0, background:GREEN, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'22px', zIndex:9999 }}>
        <div className="ic-logo" style={{ background:'rgba(255,255,255,.95)', borderRadius:'16px', padding:'12px 24px', boxShadow:'0 4px 28px rgba(0,0,0,.38)' }}>
          <Image src={LOGO} alt="شعار" width={160} height={56} style={{ maxHeight:'52px', width:'auto', display:'block' }} />
          <div className="ic-shimmer" />
        </div>
        <div style={{ textAlign:'center' }}>
          <div className="ic-type" style={{ fontFamily:'var(--nf-cairo, Cairo, sans-serif)', fontSize:'22px', fontWeight:700, color:'rgba(255,255,255,.95)', marginBottom:'8px' }}>{TITLE}</div>
          <div className="ic-sub" style={{ fontFamily:'var(--nf-space, "Space Grotesk", sans-serif)', fontSize:'11px', letterSpacing:'.1em', color:GOLD }}>{SUBTITLE}</div>
        </div>
      </div>
    </>
  )
}

// ─── Option D — Vertical Slice ───────────────────────────────────────────────
function IntroD({ onDone }: { onDone: () => void }) {
  return (
    <>
      <style>{`
        @keyframes id-line  { from{scaleY:0;opacity:1} 30%{scaleY:1;opacity:1} 60%{scaleY:1;opacity:1} 100%{scaleY:1;opacity:0} }
        @keyframes id-bg    { 0%{clip-path:inset(0 50% 0 50%)} 45%{clip-path:inset(0 0% 0 0%)} 70%{clip-path:inset(0 0% 0 0%)} 100%{clip-path:inset(0 50% 0 50%)} }
        @keyframes id-pop   { 0%,35%{opacity:0;transform:scale(.85)} 55%{opacity:1;transform:scale(1.04)} 65%{transform:scale(1)} 72%{opacity:1} 100%{opacity:0} }
        .id-line { animation: id-line 2.4s cubic-bezier(.22,1,.36,1) forwards; transform-origin:center; }
        .id-bg   { animation: id-bg 2.4s cubic-bezier(.22,1,.36,1) forwards; }
        .id-pop  { animation: id-pop 2.4s cubic-bezier(.22,1,.36,1) forwards; }
      `}</style>
      <div onAnimationEnd={onDone}
        style={{ position:'fixed', inset:0, zIndex:9999, overflow:'hidden' }}>
        {/* Background fill */}
        <div className="id-bg" style={{ position:'absolute', inset:0, background:GREEN }} />
        {/* Gold center line */}
        <div className="id-line" style={{ position:'absolute', top:0, left:'50%', width:'3px', height:'100%', background:GOLD, marginLeft:'-1.5px' }} />
        {/* Content */}
        <div className="id-pop" style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'20px' }}>
          <div style={{ background:'rgba(255,255,255,.95)', borderRadius:'16px', padding:'12px 24px', boxShadow:`0 0 0 2px ${GOLD}, 0 6px 32px rgba(0,0,0,.4)` }}>
            <Image src={LOGO} alt="شعار" width={160} height={56} style={{ maxHeight:'52px', width:'auto', display:'block' }} />
          </div>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontFamily:'var(--nf-cairo, Cairo, sans-serif)', fontSize:'22px', fontWeight:700, color:'rgba(255,255,255,.95)', marginBottom:'8px' }}>{TITLE}</div>
            <div style={{ fontFamily:'var(--nf-space, "Space Grotesk", sans-serif)', fontSize:'11px', letterSpacing:'.1em', color:GOLD }}>{SUBTITLE}</div>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Demo page ───────────────────────────────────────────────────────────────
const OPTIONS = ['A', 'B', 'C', 'D'] as const
const LABELS: Record<string, string> = {
  A: 'A — Fade + Scale',
  B: 'B — Curtain Reveal',
  C: 'C — Logo Shimmer',
  D: 'D — Vertical Slice',
}

export default function DemoPage() {
  const [playing, setPlaying] = useState<string | null>(null)

  return (
    <div style={{ minHeight:'100vh', background:'#f5f4f1', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'32px', padding:'40px', fontFamily:'var(--nf-cairo, Cairo, sans-serif)' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:'13px', color:'#888', letterSpacing:'.1em', textTransform:'uppercase', marginBottom:'8px', fontFamily:'var(--nf-space, "Space Grotesk", sans-serif)' }}>Intro Animation Demo</div>
        <h1 style={{ fontSize:'24px', fontWeight:700, color:'#1a1a1a', margin:0 }}>اختر تأثير الافتتاحية</h1>
        <p style={{ color:'#666', fontSize:'13px', marginTop:'8px' }}>Click any option to preview — each runs for ~2 seconds</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:'16px', width:'100%', maxWidth:'480px' }}>
        {OPTIONS.map(opt => (
          <button key={opt} onClick={() => setPlaying(opt)} disabled={playing !== null}
            style={{ padding:'20px 16px', background:'white', border:`2px solid ${playing === opt ? GOLD : '#e5e3df'}`, borderRadius:'14px', cursor: playing ? 'default' : 'pointer', textAlign:'center', transition:'all .15s', boxShadow:'0 1px 4px rgba(0,0,0,.06)', opacity: playing && playing !== opt ? .5 : 1 }}>
            <div style={{ fontSize:'28px', marginBottom:'8px' }}>
              {opt === 'A' && '✦'}
              {opt === 'B' && '⟵⟶'}
              {opt === 'C' && '✸'}
              {opt === 'D' && '⬛'}
            </div>
            <div style={{ fontSize:'12px', fontWeight:600, color:'#1a1a1a', fontFamily:'var(--nf-space, "Space Grotesk", sans-serif)' }}>{LABELS[opt]}</div>
          </button>
        ))}
      </div>

      <p style={{ color:'#aaa', fontSize:'12px', fontFamily:'var(--nf-space, "Space Grotesk", sans-serif)' }}>
        The chosen animation will play once on each page load or refresh
      </p>

      {/* Active preview */}
      {playing === 'A' && <IntroA onDone={() => setPlaying(null)} />}
      {playing === 'B' && <IntroB onDone={() => setPlaying(null)} />}
      {playing === 'C' && <IntroC onDone={() => setPlaying(null)} />}
      {playing === 'D' && <IntroD onDone={() => setPlaying(null)} />}
    </div>
  )
}
