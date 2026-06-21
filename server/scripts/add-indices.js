const { Pool } = require('pg');
require('dotenv').config();

async function run() {
    console.log('Connecting to database:', process.env.DATABASE_URL);
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('Creating database indexes on public.messages table...');
        
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_messages_sender_id 
            ON public.messages(sender_id);
        `);
        console.log('Index on sender_id created/verified.');

        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_messages_receiver_id 
            ON public.messages(receiver_id);
        `);
        console.log('Index on receiver_id created/verified.');

        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_messages_created_at 
            ON public.messages(created_at DESC);
        `);
        console.log('Index on created_at DESC created/verified.');

        console.log('All indexes verified successfully!');

    } catch (err) {
        console.error('Database migration/indexing failed:', err);
    } finally {
        await pool.end();
    }
}

run();
