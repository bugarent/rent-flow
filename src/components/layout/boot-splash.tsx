/**
 * First document load only. The node stays in the tree so hydration matches;
 * an inline script hides it as soon as the page HTML is ready, and client
 * navigations never show it again because `html.rac-ready` remains set.
 */
export function BootSplash() {
  return (
    <>
      <style>{`
        #boot-splash{position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;background:#fff;animation:rac-boot-hide .01s linear 1.1s forwards}
        html.rac-ready #boot-splash{display:none}
        @keyframes rac-boot-hide{to{visibility:hidden;opacity:0;pointer-events:none}}
      `}</style>
      <div id="boot-splash" aria-hidden>
        <div className="relative flex h-40 w-40 items-center justify-center">
          <span className="rac-arc" />
          {/* The car-and-plane mark is not used. This is the RAC mark, only while the document opens. */}
          <img
            src="/brand/rac-logo.png"
            alt=""
            width={120}
            height={120}
            className="h-[120px] w-[120px] object-contain"
          />
        </div>
      </div>
    </>
  );
}
