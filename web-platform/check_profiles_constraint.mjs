
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("Checking profiles table...");
    const { data, error } = await supabase.from('profiles').select('*').limit(5);
    if (error) {
        console.error("Error:", error.message);
    } else {
        console.log("Profiles data:", data);
        if (data.length > 0) {
            console.log("Columns:", Object.keys(data[0]));
        }
    }

    // Test update to social_assistant
    if (data && data.length > 0) {
        const testUser = data[0];
        console.log(`Testing update for user ${testUser.id} (${testUser.email}) to social_assistant...`);
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ role: 'social_assistant' })
            .eq('id', testUser.id);

        if (updateError) {
            console.error("Update FAILED:", updateError.message);
        } else {
            console.log("Update SUCCESSFUL! (Changing it back now...)");
            await supabase.from('profiles').update({ role: testUser.role }).eq('id', testUser.id);
        }
    }
}

main();
