const fs = require('fs');
const path = require('path');

// Read the batches file
const filePath = 'pages/lms/batches/index.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

// Replace patterns
const replacements = [
  // GET requests
  {
    from: /const res = await fetch\('\/api\/([^']+)'\);/g,
    to: "const res = await authGet('/api/$1');"
  },
  
  // POST requests
  {
    from: /await fetch\(([^,]+),\s*\{\s*method: 'POST',\s*headers: \{ 'Content-Type': 'application\/json' \},\s*body: JSON\.stringify\(([^)]+)\)\s*\}\);/g,
    to: "await authPost($1, $2);"
  },
  
  // PUT requests
  {
    from: /const res = await fetch\(([^,]+),\s*\{\s*method: 'PUT',\s*headers: \{ 'Content-Type': 'application\/json' \},\s*body: JSON\.stringify\(([^)]+)\)\s*\}\);/g,
    to: "const res = await authPut($1, $2);"
  },
  
  // PATCH requests
  {
    from: /await fetch\(([^,]+),\s*\{\s*method: 'PATCH',\s*headers: \{ 'Content-Type': 'application\/json' \},\s*body: JSON\.stringify\(([^)]+)\)\s*\}\);/g,
    to: "await authenticatedFetch($1, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify($2) });"
  },
  
  // DELETE requests
  {
    from: /const res = await fetch\(([^,]+),\s*\{\s*method: 'DELETE'\s*\}\);/g,
    to: "const res = await authDelete($1);"
  },
  
  // POST with complex body
  {
    from: /const res = await fetch\(([^,]+),\s*\{\s*method: 'POST',\s*headers: \{ 'Content-Type': 'application\/json' \},\s*body: JSON\.stringify\(([^)]+)\)\s*\}\);/g,
    to: "const res = await authPost($1, $2);"
  }
];

// Apply replacements
for (const replacement of replacements) {
  content = content.replace(replacement.from, replacement.to);
}

// Handle error cases with logout
const errorHandling = `
    } catch (error: any) {
      console.error('API error:', error);
      if (error.message === 'Authentication required') {
        logout();
        return;
      }
      toast.error('Operation failed: ' + error.message);
    }`;

// Add authentication error handling to try-catch blocks
content = content.replace(
  /} catch \(error[^}]*\) \{[^}]*console\.error[^}]*\n[^}]*toast\.error[^}]*\n[^}]*\}/g,
  errorHandling
);

fs.writeFileSync(filePath, content);
console.log('Updated batches page with authentication');