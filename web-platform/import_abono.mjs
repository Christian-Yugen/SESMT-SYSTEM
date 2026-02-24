
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Environment variables NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function importData() {
    console.log('Reading abono_data.json...');
    const rawData = fs.readFileSync(path.resolve(__dirname, 'abono_data.json'), 'utf8');
    const data = JSON.parse(rawData);

    console.log(`Poushing ${data.length} records to abono_salarial...`);

    // Insert in chunks of 50 to avoid limits
    const chunkSize = 50;
    for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
        const { error } = await supabase
            .from('abono_salarial')
            .insert(chunk);

        if (error) {
            console.error(`Error inserting chunk ${i / chunkSize}:`, error.message);
            console.error('Full error:', error);
            // If the table doesn't exist, stop
            if (error.code === 'PGRST116' || error.message.includes('relation "public.abono_salarial" does not exist')) {
                console.error('\n❌ ERROR: Table abono_salarial does not exist. Please run create_abono_table.sql in Supabase SQL Editor first.');
                return;
            }
        } else {
            console.log(`✓ Inserted chunk ${Math.floor(i / chunkSize) + 1}/${Math.ceil(data.length / chunkSize)}`);
        }
    }
    console.log('Import finished.');
}

importData();
