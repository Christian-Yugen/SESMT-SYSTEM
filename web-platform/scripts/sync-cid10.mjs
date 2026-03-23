import * as XLSX from 'xlsx';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const filePath = 'c:\\Users\\Usuário\\Desktop\\SESMT\\dados\\CID10Descricao.xlsx';

async function syncCID10() {
    console.log('--- Starting CID-10 Sync ---');
    try {
        if (!fs.existsSync(filePath)) {
            console.error('File not found:', filePath);
            return;
        }

        const fileBuffer = fs.readFileSync(filePath);
        const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // rows will be an array of objects like { CID: 'A00.0', 'DESCRIÇÃO ABREVIADA': '...' }
        const rows = XLSX.utils.sheet_to_json(worksheet);

        console.log(`Read ${rows.length} rows from Excel.`);

        const BATCH_SIZE = 500;
        for (let i = 0; i < rows.length; i += BATCH_SIZE) {
            const batch = rows.slice(i, i + BATCH_SIZE)
                .filter(row => row['CID'] && row['DESCRIÇÃO ABREVIADA'])
                .map(row => ({
                    codigo: String(row['CID']).trim().toUpperCase(),
                    descricao: String(row['DESCRIÇÃO ABREVIADA']).trim()
                }));

            if (batch.length === 0) continue;

            const { error } = await supabase
                .from('cid10')
                .upsert(batch, { onConflict: 'codigo' });

            if (error) {
                console.error(`Error inserting batch starting at ${i}:`, error.message);
                // Continue to next batch instead of crashing
            } else {
                console.log(`Successfully processed batch: ${i} to ${i + batch.length}`);
            }
        }

        console.log('--- CID-10 Sync Completed Successfully ---');
    } catch (err) {
        console.error('Fatal error during sync:', err);
    }
}

syncCID10();
