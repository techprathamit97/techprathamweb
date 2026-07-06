


import type { AppProps } from 'next/app';
import '../app/globals.css';
import Script from "next/script";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
    {/* Microsoft Clarity */}
    <Script
      id="microsoft-clarity"
      strategy="afterInteractive"
    >
      {`
        (function(c,l,a,r,i,t,y){
          c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
          t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
          y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
        })(window, document, "clarity", "script", "u2rxsd55s3");
      `}
    </Script>
      {/* GTM HEAD SCRIPT */}
      <Script id="gtm-head" strategy="beforeInteractive">
        {`
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','GTM-KXS7C3FM');
        `}
      </Script>

      <Component {...pageProps} />

      {/* GTM BODY NOSCRIPT */}
      <noscript>
        <iframe
          src="https://www.googletagmanager.com/ns.html?id=GTM-KXS7C3FM"
          height="0"
          width="0"
          style={{ display: "none", visibility: "hidden" }}
        ></iframe>
      </noscript>
    </>
  );
}

export default MyApp;
