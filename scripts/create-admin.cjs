import http from 'http';
const key = '7c53d4ce8d5539a1170d74cf75154480ea4bd409418bccd1170866907f2d15f6';
const payload = JSON.stringify({
  email: 'baytzaki@gmail.com',
  password: 'Baytzaki@Admin2026!',
  email_confirm: true,
  app_metadata: { role: 'admin' },
  user_metadata: { name: 'Baytzaki Admin' }
});
const req = http.request('https://djsibxhkfvwtjzvnjmhp.supabase.co/auth/v1/admin/users', {
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
