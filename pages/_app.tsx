


import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import '../app/globals.css';
import Script from "next/script";
// Temporarily disable global auth fetch to debug
// import { enableGlobalAuthFetch } from '@/lib/legacyApiMigration';

function MyApp({ Component, pageProps }: AppProps) {
  
  useEffect(() => {
    // Temporarily disable global authenticated fetch for debugging
    // enableGlobalAuthFetch();
    console.log('App loaded - global auth fetch disabled for debugging');
  }, []);
  
  return (
    <>
   
     

      <Component {...pageProps} />

   
    </>
  );
}

export default MyApp;
