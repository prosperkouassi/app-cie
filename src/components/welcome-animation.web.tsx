import { useEffect, useRef, useState } from 'react';
import type { AnimationItem } from 'lottie-web';
import { welcomeAnimations } from './welcome-animation-data';
import { WelcomeFallback } from './welcome-fallback';

export function WelcomeAnimation({ page, reduced }: { page: number; reduced: boolean }) {
  const container = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    let animation: AnimationItem | undefined;
    // The light SVG player is bundled with the app; no CDN, WASM or network assets.
    // A local require keeps the renderer in the bundle as well: no lazy network
    // chunk is needed if the presentation is first opened while offline.
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- Browser-only evaluation after hydration, without an offline-breaking lazy chunk.
    Promise.resolve().then(() => require('lottie-web/build/player/lottie_light') as typeof import('lottie-web').default).then((lottie) => {
      if (!active || !container.current) return;
      animation = lottie.loadAnimation({ container: container.current, renderer: 'svg', loop: false, autoplay: false,
        animationData: JSON.parse(JSON.stringify(welcomeAnimations[page])), rendererSettings: { preserveAspectRatio: 'xMidYMid meet' } });
      animation.addEventListener('DOMLoaded', () => { if (active) { animation?.goToAndStop(0, true); if (!reduced) animation?.play(); } });
      animation.addEventListener('data_failed', () => { if (active) setFailed(true); });
    }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; animation?.destroy(); };
  }, [page, reduced]);
  return failed ? <WelcomeFallback page={page} /> : <div ref={container} aria-hidden="true" data-welcome-animation={page} data-reduced-motion={reduced} style={{ width: '100%', height: 210, pointerEvents: 'none' }} />;
}
