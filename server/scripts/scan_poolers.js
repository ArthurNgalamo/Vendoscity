const { Client } = require('pg');

const projectId = 'rzzxicbmpzieyaiutcbo';
const regions = [
    'eu-west-3',    // Paris (very common for European/African latencies)
    'eu-west-1',    // Ireland (default AWS region)
    'eu-west-2',    // London
    'eu-central-1', // Frankfurt
    'us-east-1',    // N. Virginia
    'us-east-2',    // Ohio
    'us-west-1',    // N. California
    'us-west-2',    // Oregon
    'ap-southeast-1',// Singapore
    'ap-southeast-2',// Sydney
    'ap-northeast-1',// Tokyo
    'ca-central-1', // Canada
    'sa-east-1'     // São Paulo
];
const passwords = ['VmnXbhZY3OIQo', 'VmnXbhZY3OIQ0'];

async function scanPoolers() {
    console.log('Scanning Supabase pooler regions to locate your project...');
    const username = `postgres.${projectId}`;
    
    for (const region of regions) {
        const host = `aws-0-${region}.pooler.supabase.com`;
        console.log(`Checking region: ${region} (${host})...`);
        
        for (const pw of passwords) {
            const client = new Client({
                host,
                port: 5432,
                database: 'postgres',
                user: username,
                password: pw,
                ssl: { rejectUnauthorized: false },
                connectionTimeoutMillis: 3000
            });
            
            try {
                await client.connect();
                console.log(`\n🎉 MATCH FOUND! Connected successfully to region: ${region}`);
                console.log(`Host: ${host}`);
                console.log(`Password: "${pw}"`);
                
                // Run the SQL migrations
                console.log('\nRunning database table checks...');
                const res = await client.query(`
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = 'messages'
                    );
                `);
                
                if (!res.rows[0].exists) {
                    console.log('Creating "messages" table on Supabase...');
                    await client.query(`
                        CREATE TABLE public.messages (
                            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                            sender_id UUID REFERENCES auth.users(id) NOT NULL,
                            receiver_id UUID REFERENCES auth.users(id) NOT NULL,
                            subject TEXT,
                            content TEXT NOT NULL,
                            read_status BOOLEAN DEFAULT false,
                            created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
                        );
                    `);
                    console.log('Table "messages" created successfully.');
                    
                    console.log('Enabling Row Level Security (RLS) on messages table...');
                    await client.query(`
                        ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
                    `);
                    
                    console.log('Creating RLS policies for messages table...');
                    await client.query(`
                        CREATE POLICY "Users can read their own messages" 
                        ON public.messages FOR SELECT 
                        USING (auth.uid() = receiver_id OR auth.uid() = sender_id);
                    `);
                    await client.query(`
                        CREATE POLICY "Users can insert their own messages" 
                        ON public.messages FOR INSERT 
                        WITH CHECK (auth.uid() = sender_id);
                    `);
                    console.log('RLS policies created successfully.');
                } else {
                    console.log('Table "messages" already exists.');
                }
                
                console.log('\n✅ Remote Supabase database is now fully updated!');
                await client.end();
                process.exit(0);
            } catch (err) {
                // If it fails with "tenant not found", this is the wrong region pooler.
                // If it fails with "password authentication failed", it's the correct region but wrong password.
                if (err.message.includes('tenant') || err.message.includes('not found')) {
                    // Wrong region, continue scanning
                } else if (err.message.includes('password') || err.message.includes('authentification')) {
                    console.log(`👉 Region matched (${region}), but password "${pw}" is incorrect.`);
                } else {
                    console.log(`Error on ${region}: ${err.message}`);
                }
            }
        }
    }
    
    console.error('\n❌ Could not locate your project on any Supabase region pooler.');
    process.exit(1);
}

scanPoolers();
