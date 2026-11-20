const nextConfig = {
  // Keep Node-only packages (firebase-admin and its transitive deps) out of the
  // webpack bundle. Otherwise Next traces them via instrumentation.ts and fails
  // to resolve Node built-ins like 'http', 'https' and 'worker_threads'.
  serverExternalPackages: ['firebase-admin', 'google-auth-library'],
  // serverExternalPackages is not honoured for the instrumentation bundle, so
  // also mark firebase-admin (and the transitive google-auth-library chain it
  // pulls in) as runtime externals for every server-side compilation. This lets
  // Node's native require load them at runtime instead of webpack bundling them.
  webpack: (config, { isServer }) => {
    if (isServer) {
      const externalize = ({ request }, cb) => {
        if (
          /^firebase-admin(\/|$)/.test(request) ||
          /^google-auth-library(\/|$)/.test(request)
        ) {
          return cb(null, 'commonjs ' + request);
        }
        cb();
      };
      if (Array.isArray(config.externals)) {
        config.externals.push(externalize);
      } else {
        config.externals = [config.externals, externalize].filter(Boolean);
      }
    }
    return config;
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'swiperjs.com',
      },
       {
      protocol: 'https',
      hostname: 'techpratham-image-storage.s3.ap-south-1.amazonaws.com',
      pathname: '/**',
    },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'flagcdn.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io',
        pathname: '/**',
      },
    ],
  },
  env: {
    S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID,
    S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY,
    MONGODB_URL: process.env.MONGODB_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    RESEND_CODE: process.env.RESEND_CODE,
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    ROUTE_ID: process.env.ROUTE_ID,
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    NEXT_PUBLIC_CLOUDINARY_IMAGE_URL: process.env.NEXT_PUBLIC_CLOUDINARY_IMAGE_URL,
    NEXT_PUBLIC_SANITY_PROJECT_ID: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
    NEXT_PUBLIC_SANITY_DATASET: process.env.NEXT_PUBLIC_SANITY_DATASET,
    REGION: process.env.REGION, 
    BUCKET_NAME: process.env.BUCKET_NAME,
    NEXT_PUBLIC_BASE_URL:process.env.NEXT_PUBLIC_BASE_URL,
    WEB3FORMS_ACCESS_KEY:process.env.WEB3FORMS_ACCESS_KEY
  },

  async redirects() {
    return [
       
      
    ];
  },
};

const defaultLocale = 'en';

export { nextConfig as default, defaultLocale };