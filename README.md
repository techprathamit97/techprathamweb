# TechPathamr - Course Management Platform

A comprehensive Next.js-based educational platform for course management, user enrollment, and learning management.

## 🚀 Features

- **Course Management**: Create, update, and manage courses
- **User Authentication**: Secure login and registration system
- **Student Dashboard**: Track progress, enrolled courses, and certificates
- **Admin Dashboard**: Manage courses, users, and platform analytics
- **Blog System**: Content management for articles and announcements
- **Payment Integration**: Handle course payments and refunds
- **Certificate Generation**: Automated certificate creation upon course completion
- **Responsive Design**: Mobile-first design with Tailwind CSS

## 📋 Prerequisites

Before running this project, make sure you have:

- Node.js 18.x or higher
- npm or yarn package manager
- Database (MongoDB/PostgreSQL - check your configuration)
- Environment variables configured

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone [repository-url]
   cd techpatham
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Environment Setup**
   Copy the environment file and configure your variables:
   ```bash
   cp .env.example .env.local
   ```

4. **Configure Environment Variables**
   Edit `.env.local` with your configuration:
   ```env
   # Database
   DATABASE_URL=your_database_connection_string
   ROUTE_ID=route_id_for_route_security
   
   # Authentication
   NEXTAUTH_SECRET=your_nextauth_secret
   NEXTAUTH_URL=http://localhost:3000
   
   # Email Configuration
    RESEND_CODE=your_resend_code
    ADMIN_EMAIL=your_company_mail

   # Sanity
   NEXT_PUBLIC_SANITY_PROJECT_ID=8znb3ocj
   NEXT_PUBLIC_SANITY_DATASET=blogs
   
   # File Storage
   CLOUDINARY_CLOUD_NAME=your_cloudinary_name
   CLOUDINARY_API_KEY=your_cloudinary_key
   CLOUDINARY_API_SECRET=your_cloudinary_secret

   # Google Login Credentials
   GOOGLE_CLIENT_ID=google_client_id_for_google_login
   GOOGLE_CLIENT_SECRET=google_client_secret
   ```

## 🏃‍♂️ Running the Application

### Development Mode
```bash
npm run dev
# or
yarn dev
```
Access the application at `http://localhost:3000`

### Production Build
```bash
npm run build
npm start
# or
yarn build
yarn start
```

## 📁 Project Structure

```
techpatham/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── article/       # Article management
│   │   ├── auth/          # Authentication endpoints
│   │   ├── category/      # Category management
│   │   ├── course/        # Course management
│   │   ├── get-course/    # Course retrieval
│   │   ├── register/      # User registration
│   │   └── users/         # User management
│   └── globals.css        # Global styles
├── components/            # Reusable UI components
│   ├── assets/           # Static assets components
│   ├── common/           # Common components
│   └── ui/               # UI library components
├── context/              # React Context providers
├── lib/                  # Utility functions
├── models/               # Database models
├── pages/                # Next.js pages (if using Pages Router)
│   ├── admin/            # Admin panel pages
│   ├── auth/             # Authentication pages
│   ├── blog/             # Blog pages
│   ├── courses/          # Course pages
│   └── user/             # User dashboard pages
├── public/               # Static files
├── src/                  # Source files
└── utils/                # Utility functions
```

## 🔐 Authentication & Authorization

The platform includes:
- User registration and login
- Role-based access control (Admin, User)
- Protected routes for admin and user dashboards
- Session management with NextAuth.js

## 🎓 Course Management

### Admin Features
- Create and update courses
- Manage course categories
- Track enrollment statistics
- Handle course requests and approvals

### Student Features
- Browse available courses
- Enroll in courses
- Track learning progress
- Download certificates upon completion
- Provide course feedback

## 📊 Admin Dashboard

Access admin features at `/admin/dashboard`:
- Course management
- User management
- Analytics and reporting
- Content management

## 👤 User Dashboard

Students can access their dashboard at `/user/dashboard`:
- Enrolled courses
- Learning progress
- Certificates
- Account settings
- Course feedback

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### Courses
- `GET /api/course` - Get all courses
- `POST /api/course` - Create new course
- `PUT /api/course/[id]` - Update course
- `DELETE /api/course/[id]` - Delete course

### Users
- `GET /api/users` - Get all users
- `PUT /api/users/[id]` - Update user profile

### Articles/Blog
- `GET /api/article` - Get all articles
- `POST /api/article` - Create new article

## 🚀 Deployment

### Vercel Deployment (Recommended)
1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Manual Deployment
1. Build the application:
   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm start
   ```

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 🔍 Environment Configuration

### Required Environment Variables
- `DATABASE_URL` - Database connection string
- `NEXTAUTH_SECRET` - NextAuth.js secret key
- `NEXTAUTH_URL` - Application URL

### Optional Environment Variables
- Email service configuration
- Payment gateway keys
- File upload service credentials
- Analytics tracking codes

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run e2e tests
npm run test:e2e
```

## 📈 Performance Optimization

- Image optimization with Next.js Image component
- Code splitting and lazy loading
- Static generation for public pages
- Database query optimization
- Caching strategies implemented

## 🔒 Security Features

- Input validation and sanitization
- CSRF protection
- Rate limiting on API endpoints
- Secure authentication with NextAuth.js
- Environment variable protection

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Issues**
   - Verify DATABASE_URL in environment variables
   - Check database server status
   - Ensure network connectivity

2. **Authentication Problems**
   - Verify NEXTAUTH_SECRET is set
   - Check NEXTAUTH_URL matches your domain
   - Clear browser cookies and try again

3. **Build Failures**
   - Clear `.next` directory and rebuild
   - Check for TypeScript errors
   - Verify all dependencies are installed

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

## 🚀 Going Live Checklist

### Pre-Production
- [ ] Environment variables configured for production
- [ ] Database backup and migration strategy
- [ ] SSL certificate installed
- [ ] Domain configured
- [ ] Email service tested
- [ ] Payment gateway tested (if applicable)

### Security
- [ ] Security headers configured
- [ ] Rate limiting implemented
- [ ] Input validation tested
- [ ] Authentication flows tested
- [ ] Admin access secured

### Performance
- [ ] Performance optimization completed
- [ ] Caching configured
- [ ] CDN setup (if applicable)
- [ ] Database indexes optimized
- [ ] Image optimization verified

### Monitoring
- [ ] Error tracking setup (Sentry, etc.)
- [ ] Analytics configured
- [ ] Uptime monitoring
- [ ] Performance monitoring
- [ ] Log aggregation setup

## 📞 Handover Information

### Admin Credentials
- Default admin email: [TO BE PROVIDED]
- Default admin password: [TO BE PROVIDED]
- **⚠️ IMPORTANT**: Change default credentials immediately after deployment

### Key Configuration Files
- `.env.local` - Environment variables
- `next.config.js` - Next.js configuration
- `tailwind.config.ts` - Tailwind CSS configuration
- `components.json` - UI components configuration

### Database Information
- Database type: NoSql
- Backup schedule: [TO BE CONFIGURED]
- Migration files location: [TO BE SPECIFIED]

### Third-party Services
- Authentication: NextAuth.js
- Styling: Tailwind CSS
- Email service: Resend
- File storage: Cloudinary & Sanity
- Payment processing: Manual

---

**Last Updated**: 06 November 2025
**Version**: 1.0.0  
**Maintainer**: [Your Name/Team]
