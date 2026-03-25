
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Environment variables must be set');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runSQL() {
    console.log('Reading c:/Users/Usuário/Desktop/SESMT/web-platform/create_afastamentos_table.sql...');
    const sql = fs.readFileSync(path.resolve(__dirname, 'create_afastamentos_table.sql'), 'utf8');
    
    // Split into individual statements
    const statements = sql
        .split(';')
        .filter(s => s.trim().length > 0)
        .map(s => s.trim() + ';');

    console.log(`Executing ${statements.length} SQL statements...`);
    
    for (const statement of statements) {
        // Try with admin_sql RPC
        const { error } = await supabase.rpc('admin_sql', { query: statement });
        if (error) {
            console.error('SQL Execution Error:', error.message, '| Statement start:', statement.substring(0, 50));
            // If it's a "function not found" error, we might be stuck without a direct SQL runner.
            // But usually this project has it.
        } else {
            console.log('✓ Success:', statement.substring(0, 50).replace(/\n/g, ' '), '...');
        }
    }
    console.log('Database deployment finished.');
}

runSQL();
