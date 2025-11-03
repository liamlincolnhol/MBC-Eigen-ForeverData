import type { AppProps } from 'next/app';
import Head from 'next/head';
import ContextProvider from '@/context';
import '../styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  // For pages router, we can't use headers() like in app router
  // Cookies will be handled by wagmi's cookieStorage automatically
  const cookies = null;

  return (
    <>
      <Head>
        <title>ForeverData - Permanent File Storage</title>
        <meta name="description" content="Store your files permanently on EigenDA with guaranteed access forever" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <ContextProvider cookies={cookies}>
        {/* Background gradient */}
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
          <Component {...pageProps} />
        </div>
      </ContextProvider>
    </>
  );
}