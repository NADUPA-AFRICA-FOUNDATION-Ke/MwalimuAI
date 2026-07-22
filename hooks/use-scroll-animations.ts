'use client'

import { useEffect, useRef, useState } from 'react'

// Sections render fully visible in the server HTML — content must never sit
// at opacity 0 waiting for JS on a slow connection. After hydration, sections
// still below the viewport get hidden and revealed with the scroll animation;
// anything already on screen (or reduced-motion users) just stays visible.
// `visible` drives the hidden/visible classes; `revealed` fires only when the
// scroll-in actually happens, for effects that should wait (e.g. count-ups).
export function useFadeIn<T extends HTMLElement = HTMLElement>(threshold = 0.08) {
  const ref = useRef<T>(null)
  const [state, setState] = useState<'ssr' | 'hidden' | 'visible'>('ssr')
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setState('visible')
      return
    }
    if (el.getBoundingClientRect().top < window.innerHeight) {
      setState('visible')
      return
    }
    setState('hidden')
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setState('visible'); obs.disconnect() } },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, visible: state !== 'hidden', revealed: state === 'visible' }
}

export function useCountUp(to: number, dur = 1400, go = false) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!go) return
    const s = performance.now()
    const f = (now: number) => {
      const p = Math.min((now - s) / dur, 1)
      setN(Math.round((1 - (1 - p) ** 3) * to))
      if (p < 1) requestAnimationFrame(f)
    }
    requestAnimationFrame(f)
  }, [go, to, dur])
  return n
}
