const https = require('https');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
if (!key) {
  console.error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
if (!email || !password) {
  console.error('ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required');
  process.exit(1);
}

const payload = JSON.stringify({
  email,
  password,
  email_confirm: true,
  app_metadata: { role: 'admin' },
  user_metadata: { name: process.env.ADMIN_NAME || 'AzkaSmart Admin' }
});

const req = https.request('https://djsibxhkfvwtjzvnjmhp.supabase.co/auth/v1/admin/users', {
  method: 'POST',
  headers: {
    'apikey': key,
    'Authorization': 'Bearer ' + key,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
  }
}, (res) => {
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Body:', body);
  });
});
req.on('error', e => console.log('Error:', e.message));
req.write(payload);
req.end();
