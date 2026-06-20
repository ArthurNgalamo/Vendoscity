const dns = require('dns');

console.log('Resolving DNS records for db.rzzxicbmpzieyaiutcbo.supabase.co...');

dns.resolveAny('db.rzzxicbmpzieyaiutcbo.supabase.co', (err, addresses) => {
    if (err) {
        console.error('DNS resolveAny failed:', err);
    } else {
        console.log('DNS records found:', JSON.stringify(addresses, null, 2));
    }
});

dns.resolveCname('db.rzzxicbmpzieyaiutcbo.supabase.co', (err, addresses) => {
    if (err) {
        console.log('CNAME lookup failed (which is normal if it is an A/AAAA record directly):', err.message);
    } else {
        console.log('CNAME targets:', addresses);
    }
});
