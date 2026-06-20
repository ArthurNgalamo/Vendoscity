const { Pool } = require('pg');
require('dotenv').config();

async function run() {
    console.log('DATABASE_URL:', process.env.DATABASE_URL);
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('Testing connection...');
        const res = await pool.query('SELECT NOW()');
        console.log('Connection successful! Database time:', res.rows[0].now);

        console.log('Checking if table public.analytics_events exists...');
        const tableCheck = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'analytics_events'
            );
        `);
        console.log('Table analytics_events exists:', tableCheck.rows[0].exists);

        if (tableCheck.rows[0].exists) {
            console.log('Querying first 5 rows from analytics_events...');
            const rows = await pool.query('SELECT * FROM public.analytics_events LIMIT 5');
            console.log('Rows:', rows.rows);
        }
    } catch (err) {
        console.error('Database query failed:', err);
    } finally {
        await pool.end();
    }
}

run();
