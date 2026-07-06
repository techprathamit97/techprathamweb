const nextConfig = {
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
       {
        source: '/courses/servicenow-developer-certification', // replace with your dead URL path
        destination: '/courses/servicenow-developer-certification-training',        // home page
        permanent: true,         // 301 redirect
      },
       {
        source: '/courses/workday-payroll', // replace with your dead URL path
        destination: '/courses/workday-payroll-training',        // home page
        permanent: true,         // 301 redirect
      },
        {
        source: '/blog/:slug((?!sanity-blogs)[^/]+)',

        destination: '/blog/general-blogs/:slug',

        permanent: true,

      },
       {
        source: '/courses/microsoft-dynamics-365-finance-and-operations-apps-solution-architect-expert', // replace with your dead URL path
        destination: '/courses/ms-dynamics-365-fo-solution-architect-expert',        // home page
        permanent: true,         // 301 redirect
      },
        {
        source: '/courses/big-data-online-testing-training', // replace with your dead URL path
        destination: '/courses/big-data-testing-training',        // home page
        permanent: true,         // 301 redirect
      },
      {
        source: '/courses/microsoft-dynamics-365-business-central-training', // replace with your dead URL path
        destination: '/courses/ms-dynamics-365-business-central-developer-training',        // home page
        permanent: true,         // 301 redirect
      },
        {
        source: '/courses/microsoft-dynamics-365-commerce-functional-consultant-associate-mb-340', // replace with your dead URL path
        destination: '/courses/ms-dynamics-365-commerce-functional-consultant',        // home page
        permanent: true,         // 301 redirect
      },
      {
        source: '/contents/workday-hcm/Welcome-To-Techpratham', // replace with your dead URL path
        destination: '/e-book/workday',        // home page
        permanent: true,         // 301 redirect
      },
      {
        source: '/blogs/how-to-master-workday-integration-how-it-works-the-best-modules-and-tools-for-smooth', // replace with your dead URL path
        destination: '/blogs/how-to-master-workday-integration-how-it-works',        // home page
        permanent: true,         // 301 redirect
      },
       {
        source: '/courses/microsoft-dynamics-365-training', // replace with your dead URL path
        destination: '/courses/microsoft-dynamics-365-training-in-india',        // home page
        permanent: true,         // 301 redirect
      },
      {
        source: '/courses/enrollment/microsoft-dynamics-365-training-in-noida', // replace with your dead URL path
        destination: '/courses/microsoft-dynamics-training-in-noida',        // home page
        permanent: true,         // 301 redirect
      },
       {
        source: '/courses/servicenow-online-training-in-hyderabad', // replace with your dead URL path
        destination: '/courses/servicenow-training-in-hyderabad',        // home page
        permanent: true,         // 301 redirect
      },
       {
        source: '/courses/workday-finance-training', // replace with your dead URL path
        destination: '/courses/workday-finance-training-certification-online',        // home page
        permanent: true,         // 301 redirect
      },
      {
        source: '/courses/software-testing-training', // replace with your dead URL path
        destination: '/courses/software-testing-training-in-india',        // home page
        permanent: true,         // 301 redirect
      },
      {
        source: '/courses/microsoft-power-platform-certification-training', // replace with your dead URL path
        destination: '/courses/az-900-microsoft-azure-fundamentals-training',        // home page
        permanent: true,         // 301 redirect
      },  
      {
        source: '/courses/workday-finance-training-in-bangalore', // replace with your dead URL path
        destination: '/courses/workday-finance-training-certification-online',        // home page
        permanent: true,         // 301 redirect
      },
      {
        source: '/courses/workday-finance-training-certification', // replace with your dead URL path
        destination: '/courses/workday-finance-training-certification-online',        // home page
        permanent: true,         // 301 redirect
      },
        {
        source: '/courses/enrollment/workday-finance', // replace with your dead URL path
        destination: '/courses/workday-finance-training-certification-online',        // home page
        permanent: true,         // 301 redirect
      },  {
        source: '/courses/enrollment/workday-finance-training', // replace with your dead URL path
        destination: '/courses/workday-finance-training-certification-online',        // home page
        permanent: true,         // 301 redirect
      },
      {
        source: '/blogs/how-to-become-a-workday-consultant-in-india-skills-salary-&-career-scope', // replace with your dead URL path
        destination: '/blogs/how-to-become-a-workday-consultant-in-india-skills-salary-and-career-scope',        // home page
        permanent: true,         // 301 redirect
      },
      {
        source: '/courses/workday-finance-training-in-hyderabad',
        destination: '/courses/workday-training-in-hyderabad',  
        permanent: true,         // 301 redirect
      },
     {
        source: '/courses/workday-finance-training-in-noida',
        destination: '/courses/workday-training-in-noida',  
        permanent: true,         // 301 redirect
      },
      {
        source: '/courses/workday-finance-training-in-pune',
        destination: '/courses/workday-finance-training-in-pune',  
        permanent: true,         // 301 redirect
      },
      {
        source: '/courses/workday-finance-training-in-mumbai',
        destination: '/courses/best-workday-training-in-mumbai',  
        permanent: true,         // 301 redirect
      },
       {
        source: '/courses/workday-finance-training-in-kolkata',
        destination: '/courses/workday-training-in-kolkata',  
        permanent: true,         // 301 redirect
      },
       {
        source: '/courses/workday-finance-training-in-chandigarh',
        destination: '/courses/workday-training-in-chandigarh',  
        permanent: true,         // 301 redirect
      },
      {
        source: '/courses/workday-finance',
        destination: '/courses/workday-training-in-chandigarh',  
        permanent: true,         // 301 redirect
      },
       {
        source: '/courses/servicenow-training-in-india-admin-developer',
        destination: '/courses/servicenow-training-in-india',  
        permanent: true,         // 301 redirect
      },
      {
        source: '/blogs/how-it-works-the-best-modules-and-tools-for-smooth-connectivity',
        destination: '/blogs/how-to-master-workday-integration-how-it-works-the-best-modules-and-tools-for-smooth',  
        permanent: true,         // 301 redirect
      },
      
    ];
  },
};

const defaultLocale = 'en';

export { nextConfig as default, defaultLocale };