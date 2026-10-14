#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// List of admin pages that need authentication
const adminPages = [
  'pages/lms/students/index.tsx',
  'pages/lms/trainers/index.tsx', 
  'pages/lms/batches/index.tsx',
  'pages/lms/courses/index.tsx',
  'pages/lms/recordings/index.tsx',
  'pages/lms/analytics/index.tsx',
  'pages/lms/certificates/index.tsx',
  'pages/lms/quizzes/index.tsx',
  'pages/lms/live-classes/index.tsx',
  'pages/lms/finance/index.tsx',
  'pages/lms/payments/index.tsx',
  'pages/lms/students/add.tsx'
];

function fixAdminPage(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }

  console.log(`🔧 Fixing: ${filePath}`);
  
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // 1. Add auth imports if not already present
  if (!content.includes('import { authenticatedFetch')) {
    const importLine = `import { authenticatedFetch, authGet, authPost, authPut, authDelete, getCurrentUser, isAdmin, logout } from '@/lib/clientAuth';`;
    
    // Find the last import and add after it
    const lastImportIndex = content.lastIndexOf('import ');
    const nextLineIndex = content.indexOf('\n', lastImportIndex);
    content = content.slice(0, nextLineIndex) + '\n' + importLine + content.slice(nextLineIndex);
  }
  
  // 2. Add authentication check to main component
  const componentMatches = content.match(/const\s+(\w+Management|\w+Page|\w+)\s*=\s*\(\)\s*=>\s*\{/);
  if (componentMatches) {
    const componentName = componentMatches[0];
    const authCheck = `
  // Check authentication first
  const user = getCurrentUser();
  
  React.useEffect(() => {
    if (!user) {
      window.location.href = '/login';
      return;
    }
    if (!isAdmin()) {
      toast.error('Access denied: Admin privileges required');
      logout();
      return;
    }
  }, [user]);

  // Don't render if not authenticated
  if (!user || !isAdmin()) {
    return <div className="p-6 text-center text-white">Checking authentication...</div>;
  }
`;
    
    content = content.replace(componentName, componentName + authCheck);
  }
  
  // 3. Replace basic fetch calls
  const fetchReplacements = [
    {
      from: /const res = await fetch\('(\/api\/[^']+)'\);/g,
      to: "const res = await authGet('$1');"
    },
    {
      from: /fetch\('(\/api\/[^']+)'\)/g,
      to: "authGet('$1')"
    },
    {
      from: /await fetch\('(\/api\/[^']+)',\s*\{\s*method:\s*'POST',\s*headers:\s*\{\s*'Content-Type':\s*'application\/json'\s*\},\s*body:\s*JSON\.stringify\(([^)]+)\)\s*\}\)/g,
      to: "await authPost('$1', $2)"
    },
    {
      from: /await fetch\('(\/api\/[^']+)',\s*\{\s*method:\s*'PUT',\s*headers:\s*\{\s*'Content-Type':\s*'application\/json'\s*\},\s*body:\s*JSON\.stringify\(([^)]+)\)\s*\}\)/g,
      to: "await authPut('$1', $2)"
    }
  ];
  
  for (const replacement of fetchReplacements) {
    content = content.replace(replacement.from, replacement.to);
  }
  
  // 4. Add authentication error handling to catch blocks
  content = content.replace(
    /} catch \(error[^}]*\) \{([^}]*console\.error[^}]*\n[^}]*toast\.error[^}]*\n[^}]*)\}/g,
    `} catch (error: any) {
      console.error('API error:', error);
      if (error.message === 'Authentication required') {
        logout();
        return;
      }
      toast.error('Operation failed: ' + error.message);
    }`
  );
  
  fs.writeFileSync(filePath, content);
  console.log(`✅ Fixed: ${filePath}`);
}

console.log('🚀 Starting authentication fixes for admin pages...\n');

adminPages.forEach(fixAdminPage);

console.log('\n✅ All admin pages updated with authentication!');