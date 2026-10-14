#!/usr/bin/env node

/**
 * Systematic RBAC implementation script
 * This script applies role-based access control to all API routes
 */

const fs = require('fs');
const path = require('path');

// API Route Security Mapping
const API_SECURITY_MAP = {
  // Admin-only APIs
  '/api/lms': 'admin',
  '/api/admin-join-class': 'admin', 
  '/api/create-admin-user': 'admin',
  '/api/reset-admin-password': 'admin',
  '/api/cleanup-multiple-live-classes': 'admin',
  '/api/cleanup-stale-classes': 'admin',
  '/api/attendance': 'admin',
  '/api/batch-live-status': 'admin',
  '/api/class-notifications': 'admin',
  '/api/course': 'admin',
  '/api/debug': 'admin',
  '/api/invoice': 'admin',
  '/api/module-class': 'admin-trainer',
  '/api/notifications': 'admin',
  '/api/payments': 'admin',
  '/api/send-email': 'admin',
  '/api/test-email-notifications': 'admin',
  '/api/test-notifications': 'admin',
  '/api/test-participants': 'admin',
  '/api/bbb': 'admin-trainer-student',

  // Trainer APIs
  '/api/trainer': 'admin-trainer',

  // Student APIs  
  '/api/student': 'admin-student',

  // Upload APIs - Special handling
  '/api/upload/assignments': 'admin-student', // Students CAN upload, trainers CANNOT

  // Auth APIs - Public
  '/api/auth': 'public',
};

// Generate import statement
function generateImports(hasAuth = true) {
  if (hasAuth) {
    return `import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';`;
  }
  return `import { NextRequest, NextResponse } from 'next/server';`;
}

// Convert role string to array
function parseRoles(roleString) {
  if (roleString === 'public') return [];
  if (roleString === 'admin') return ['admin'];
  if (roleString === 'admin-trainer') return ['admin', 'trainer'];
  if (roleString === 'admin-student') return ['admin', 'student'];
  if (roleString === 'admin-trainer-student') return ['admin', 'trainer', 'student'];
  return ['admin']; // default fallback
}

// Generate withAuth wrapper
function generateAuthWrapper(roles, isPublic = false) {
  if (isPublic) {
    return 'export const GET = handleGet;\nexport const POST = handlePost;\nexport const PUT = handlePut;\nexport const DELETE = handleDelete;';
  }
  
  const rolesArray = JSON.stringify(roles);
  return `export const GET = withAuth(handleGet, { roles: ${rolesArray} });
export const POST = withAuth(handlePost, { roles: ${rolesArray} });
export const PUT = withAuth(handlePut, { roles: ${rolesArray} });
export const DELETE = withAuth(handleDelete, { roles: ${rolesArray} });`;
}

// Process route file
function processRouteFile(filePath) {
  console.log(`Processing: ${filePath}`);
  
  // Determine security level from path
  const relativePath = filePath.replace(process.cwd(), '').replace(/\\/g, '/');
  const apiPath = relativePath.replace('/app/api', '/api').replace('/route.ts', '');
  
  let securityLevel = 'admin'; // default
  for (const [pattern, level] of Object.entries(API_SECURITY_MAP)) {
    if (apiPath.startsWith(pattern)) {
      securityLevel = level;
      break;
    }
  }

  const roles = parseRoles(securityLevel);
  const isPublic = securityLevel === 'public';

  console.log(`  API: ${apiPath} -> Roles: [${roles.join(', ')}]${isPublic ? ' (Public)' : ''}`);
  
  // Read current file
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Check if already secured
  if (content.includes('withAuth') || content.includes('@/lib/auth')) {
    console.log('  ✓ Already secured');
    return;
  }

  // Add auth import if needed
  if (!isPublic && !content.includes('withAuth')) {
    // Add import after existing imports
    const importIndex = content.lastIndexOf('import');
    if (importIndex !== -1) {
      const nextLine = content.indexOf('\n', importIndex);
      content = content.slice(0, nextLine) + 
        `\nimport { withAuth } from '@/lib/auth';` + 
        content.slice(nextLine);
    }
  }

  // Wrap handlers with auth
  const handlers = ['GET', 'POST', 'PUT', 'DELETE'];
  handlers.forEach(method => {
    const exportRegex = new RegExp(`export async function ${method}\\s*\\(`, 'g');
    if (exportRegex.test(content)) {
      // Convert function export to const with auth wrapper
      content = content.replace(
        new RegExp(`export async function (${method})\\s*\\(([^)]+)\\)`, 'g'),
        `async function handle${method}($2, authContext: any)`
      );
      
      // Add export with auth wrapper at the end
      if (!isPublic) {
        content += `\n\nexport const ${method} = withAuth(handle${method}, { roles: ${JSON.stringify(roles)} });`;
      } else {
        content += `\n\nexport const ${method} = handle${method};`;
      }
    }
  });

  // Write back
  fs.writeFileSync(filePath, content);
  console.log('  ✓ Security applied');
}

// Find all route files recursively
function findRouteFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      files.push(...findRouteFiles(fullPath));
    } else if (item.name === 'route.ts') {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Main execution
function main() {
  const apiDir = path.join(process.cwd(), 'app', 'api');
  
  if (!fs.existsSync(apiDir)) {
    console.error('API directory not found:', apiDir);
    process.exit(1);
  }

  const routeFiles = findRouteFiles(apiDir);
  
  console.log(`Found ${routeFiles.length} route files to secure\n`);
  
  routeFiles.forEach(file => {
    try {
      processRouteFile(file);
    } catch (error) {
      console.error(`Error processing ${file}:`, error.message);
    }
  });
  
  console.log('\n✅ RBAC implementation complete!');
  console.log('\nSecurity Summary:');
  console.log('- Admin: Full access to all LMS and system management APIs');
  console.log('- Trainer: Access to training APIs, CANNOT upload assignments');  
  console.log('- Student: Access to student APIs, CAN upload assignments');
  console.log('- Public: Authentication endpoints only');
  console.log('\nNote: Manual review and testing recommended for complex routes');
}

if (require.main === module) {
  main();
}

module.exports = {
  processRouteFile,
  API_SECURITY_MAP,
  parseRoles
};