const GA_MEASUREMENT_ID = "G-CCS8K6LHLT";

const GTAG_INIT = `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}');`;

/**
 * Google Analytics (gtag.js) for the root layout's <head>. The loader is async so it
 * never blocks rendering; nothing visible is rendered.
 */
export function GoogleAnalytics() {
  return (
    <>
      <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} />
      <script id="google-analytics" dangerouslySetInnerHTML={{ __html: GTAG_INIT }} />
    </>
  );
}
