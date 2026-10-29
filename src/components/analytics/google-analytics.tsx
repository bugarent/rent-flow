const GA_MEASUREMENT_ID = "G-CCS8K6LHLT";

/**
 * The pageview is queued at once; gtag.js (~180 KB, ~350 ms of main thread on mobile) loads on
 * the first interaction or a few seconds after `load`, so it stays out of first paint and TBT.
 */
const GTAG_INIT = `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}');
(function(){
  var done = false;
  var events = ['pointerdown','keydown','scroll','touchstart'];
  function load(){
    if (done) return; done = true;
    events.forEach(function(e){ window.removeEventListener(e, load, true); });
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}';
    document.head.appendChild(s);
  }
  events.forEach(function(e){ window.addEventListener(e, load, { capture: true, passive: true, once: true }); });
  function later(){ setTimeout(load, 4000); }
  if (document.readyState === 'complete') later(); else window.addEventListener('load', later, { once: true });
})();`;

/** Google Analytics for the root layout's <head>. Nothing visible is rendered. */
export function GoogleAnalytics() {
  return <script id="google-analytics" dangerouslySetInnerHTML={{ __html: GTAG_INIT }} />;
}
