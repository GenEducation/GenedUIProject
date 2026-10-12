"use client";

// Meta Pixel for the parent campaign. It loads on the campaign page only (never
// in the app, which holds children's learning data), in every environment. No
// personal data is sent: events carry their name and non-identifying details only.

import Script from "next/script";
import { META_PIXEL_ID } from "@/constants/campaign";

type Fbq = (command: "track" | "trackCustom", event: string, params?: Record<string, unknown>) => void;

declare global {
  interface Window {
    fbq?: Fbq;
  }
}

/** Send a standard Meta event; a no-op when the pixel is off or blocked. */
export function trackMeta(event: string, params?: Record<string, unknown>) {
  window.fbq?.("track", event, params);
}

/** Send a custom Meta event; a no-op when the pixel is off or blocked. */
export function trackMetaCustom(event: string, params?: Record<string, unknown>) {
  window.fbq?.("trackCustom", event, params);
}

/** Meta's base code: loads fbevents.js, initialises the pixel and records the page view. */
export function MetaPixel() {
  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">
        {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${META_PIXEL_ID}');
fbq('track', 'PageView');`}
      </Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element -- Meta's no-JS tracking pixel, not content */}
        <img height="1" width="1" style={{ display: "none" }} alt="" src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`} />
      </noscript>
    </>
  );
}
