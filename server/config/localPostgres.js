const { Pool } = require('pg');
require('dotenv').config();

function getLocalConnectionString() {
    const raw = process.env.DATABASE_URL;
    const s = (typeof raw === 'string') ? raw.trim() : '';
    if (s) return s;
    // Fallback is passwordless and local-only. If your local Postgres requires a password,
    // set DATABASE_URL in server/.env (ignored by git) or your shell environment.
    return 'postgresql://postgres@localhost:5432/vendoscity';
}

let warnedMissingPassword = false;

function poolConfigFromConnectionString(connectionString) {
    const s = String(connectionString || '').trim();
    if (!s) return { connectionString: s };

    // Prefer an explicit config object over `connectionString` so we can guarantee:
    // - password is always a string (pg's SCRAM implementation requires it)
    // - we can optionally source the password from env when not embedded in the URL
    try {
        const u = new URL(s);
        const user = decodeURIComponent(u.username || '');
        const passFromUrl = decodeURIComponent(u.password || '');
        const host = u.hostname || 'localhost';
        const port = u.port ? parseInt(u.port, 10) : 5432;
        const database = String(u.pathname || '').replace(/^\//, '') || 'vendoscity';

        const envPwRaw = process.env.DATABASE_PASSWORD || process.env.PGPASSWORD || '';
        const envPw = (typeof envPwRaw === 'string') ? envPwRaw : String(envPwRaw || '');

        // Important: node-postgres internally treats empty string as "no password" because of `||` fallback logic,
        // which becomes `null` and triggers "client password must be a string" during SCRAM auth.
        // If the URL/env doesn't provide a password, use a non-empty placeholder so the error becomes
        // a clear auth failure ("password authentication failed") instead of a confusing type error.
        const password = (passFromUrl || envPw || (user ? ' ' : ''));

        if (user && !passFromUrl && !envPw && !warnedMissingPassword) {
            warnedMissingPassword = true;
            console.warn('⚠️ Local Postgres: mot de passe manquant. Ajoutez-le dans DATABASE_URL (postgresql://USER:PASSWORD@localhost:5432/vendoscity) ou dans server/.env avec DATABASE_PASSWORD=... (ou PGPASSWORD).');
        }

        return {
            host,
            port,
            database,
            user: user || undefined,
            password
        };
    } catch (_) {
        // If parsing fails, fall back to passing the string directly.
        return { connectionString: s };
    }
}

// Configuration de la connexion PostgreSQL locale
const connectionString = getLocalConnectionString();
const pool = new Pool({
    ...poolConfigFromConnectionString(connectionString),
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 5000, 
    query_timeout: 10000 
});

/**
 * MOCK SUPABASE CLIENT - Version PostgreSQL Locale
 * Cette classe imite la syntaxe de base de l'API Supabase
 * pour permettre au code existant de fonctionner sans changement majeur.
 */
class LocalPostgresClient {
    constructor() {
        this.tableName = null;
        this.filters = [];
        this.operation = null;
        this.dataToUpdate = null;
        this.dataToInsert = null;
        this.isSingle = false;
        this.limitVal = null;
        this.offsetVal = null;
        this.shouldCount = false;
        this.columns = '*';
        this.orderCol = null;
        this.orderDir = null;
    }

    from(table) {
        this.tableName = table;
        this.filters = [];
        this.operation = null;
        this.dataToUpdate = null;
        this.dataToInsert = null;
        this.isSingle = false;
        this.limitVal = null;
        this.offsetVal = null;
        this.shouldCount = false;
        this.columns = '*';
        this.orderCol = null;
        this.orderDir = null;
        return this;
    }

    select(columns = '*', options = {}) {
        this.operation = this.operation || 'SELECT';
        // Simplification pour Local Postgres :
        // Si la requête contient des jointures complexes (parenthèses, points d'exclamation),
        // on simplifie en SELECT * pour éviter de casser le SQL local.
        if (typeof columns === 'string' && (columns.includes('(') || columns.includes('!'))) {
            this.columns = '*';
        } else {
            this.columns = columns;
        }
        if (options.count === 'exact') this.shouldCount = true;
        return this;
    }

    eq(column, value) {
        this.filters.push({ type: 'eq', column, value });
        return this;
    }

    like(column, value) {
        this.filters.push({ type: 'like', column, value });
        return this;
    }

    ilike(column, value) {
        this.filters.push({ type: 'ilike', column, value });
        return this;
    }

    or(filtersStr) {
        // Format attendu: "col1.eq.val1,col2.eq.val2"
        this.filters.push({ type: 'or', value: filtersStr });
        return this;
    }

    single() {
        this.isSingle = true;
        return this;
    }

    order(column, options = {}) {
        this.orderCol = column;
        this.orderDir = options.ascending ? 'ASC' : 'DESC';
        return this;
    }

    range(from, to) {
        this.limitVal = to - from + 1;
        this.offsetVal = from;
        return this;
    }

    limit(value) {
        this.limitVal = value;
        this.offsetVal = this.offsetVal || 0;
        return this;
    }

    insert(records) {
        this.operation = 'INSERT';
        this.dataToInsert = Array.isArray(records) ? records : [records];
        return this;
    }

    update(data) {
        this.operation = 'UPDATE';
        this.dataToUpdate = data;
        return this;
    }

    upsert(data) {
        this.operation = 'UPSERT';
        this.dataToInsert = Array.isArray(data) ? data : [data];
        return this;
    }

    delete() {
        this.operation = 'DELETE';
        return this;
    }

    // Exécution de la requête simulée (Promise-based)
    async then(onSuccess, onError) {
        try {
            let sql = '';
            const values = [];
            const schema = 'public';

            if (this.operation === 'SELECT') {
                sql = `SELECT ${this.columns} FROM ${schema}.${this.tableName}`;
                let whereClause = '';
                if (this.filters.length > 0) {
                    whereClause = ' WHERE ' + this.filters.map((f) => {
                        if (f.type === 'eq') {
                            values.push(f.value);
                            return `"${f.column}" = $${values.length}`;
                        } else if (f.type === 'like') {
                            values.push(f.value);
                            return `"${f.column}" LIKE $${values.length}`;
                        } else if (f.type === 'ilike') {
                            values.push(f.value);
                            return `"${f.column}" ILIKE $${values.length}`;
                        } else if (f.type === 'or') {
                            // "col1.eq.val1,col2.eq.val2" -> ("col1" = $x OR "col2" = $y)
                            const parts = f.value.split(',');
                            const orConditions = parts.map(p => {
                                const [col, op, val] = p.split('.');
                                if (op === 'eq') {
                                    values.push(val);
                                    return `"${col}" = $${values.length}`;
                                }
                                return '1=1';
                            });
                            return '(' + orConditions.join(' OR ') + ')';
                        }
                        return '1=1';
                    }).join(' AND ');
                    sql += whereClause;
                }

                if (this.orderCol) {
                    sql += ` ORDER BY "${this.orderCol}" ${this.orderDir}`;
                }

                // Gestion du COUNT
                let count = null;
                if (this.shouldCount) {
                    const countSql = `SELECT COUNT(*) FROM ${schema}.${this.tableName}${whereClause}`;
                    const countRes = await pool.query(countSql, values);
                    count = parseInt(countRes.rows[0].count);
                }

                // Gestion de la PAGINATION
                if (this.limitVal !== null) {
                    sql += ` LIMIT ${this.limitVal} OFFSET ${this.offsetVal}`;
                }

                const { rows } = await pool.query(sql, values);
                const data = this.isSingle ? rows[0] : rows;
                return onSuccess({ data, error: null, count });
            } else if (this.operation === 'INSERT') {
                const results = [];
                for (const row of this.dataToInsert) {
                    const keys = Object.keys(row);
                    const rowValues = Object.values(row);
                    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
                    const insertSql = `INSERT INTO ${schema}.${this.tableName} (${keys.map(k => `"${k}"`).join(', ')}) VALUES (${placeholders}) RETURNING *`;
                    const { rows } = await pool.query(insertSql, rowValues);
                    results.push(rows[0]);
                }
                const data = this.isSingle ? results[0] : results;
                return onSuccess({ data, error: null });
            } else if (this.operation === 'UPDATE') {
                const keys = Object.keys(this.dataToUpdate);
                const updateValues = Object.values(this.dataToUpdate);
                let sql = `UPDATE ${schema}.${this.tableName} SET ` + keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
                
                if (this.filters.length > 0) {
                    sql += ' WHERE ' + this.filters.map((f, i) => {
                        updateValues.push(f.value);
                        return `"${f.column}" = $${keys.length + i + 1}`;
                    }).join(' AND ');
                }
                sql += ' RETURNING *';
                const { rows } = await pool.query(sql, updateValues);
                const data = this.isSingle ? rows[0] : rows;
                return onSuccess({ data, error: null });
            } else if (this.operation === 'DELETE') {
                sql = `DELETE FROM ${schema}.${this.tableName}`;
                if (this.filters.length > 0) {
                    sql += ' WHERE ' + this.filters.map((f, i) => {
                        values.push(f.value);
                        return `"${f.column}" = $${i + 1}`;
                    }).join(' AND ');
                }
            }

            const { rows } = await pool.query(sql, values);
            const data = this.isSingle ? rows[0] : rows;
            return onSuccess({ data, error: null, count: null });
        } catch (err) {
            // Some tables are optional depending on the local schema (ex: product_images).
            // Avoid spamming the console for known "table does not exist" cases.
            const isOptionalMissingTable = (err?.code === '42P01') && (this.tableName === 'product_images');
            if (!isOptionalMissingTable) {
                console.error(`❌ Local Postgres Error (${this.operation} on ${this.tableName}):`, err);
            }
            // On "résout" toujours pour éviter les unhandled rejections et suivre l'API Supabase
            // Si c'est un await, onSuccess est le handler de succès.
            if (onSuccess) {
                return onSuccess({ data: null, error: err, count: null });
            }
            return { data: null, error: err, count: null };
        }
    }
}

// Export a concurrency-safe supabase-like facade:
// each `.from()` returns a new query builder instance (no shared mutable state).
module.exports = {
    from: (table) => new LocalPostgresClient().from(table),

    // Simulation de l'Auth (utilise toujours le JSON mock pour simplifier)
    auth: require('./mockAuth'),

    // Simulation du Storage (renvoie une URL bidon en local)
    storage: {
        from: () => ({
            upload: async (path, buffer) => {
                console.log('📦 Mock Upload sur local Postgres (Simulation)');
                return { data: { path }, error: null };
            },
            getPublicUrl: (path) => ({
                data: { publicUrl: '/assets/images/default-product.png' }
            })
        })
    }
};
