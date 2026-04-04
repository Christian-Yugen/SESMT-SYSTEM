import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

async function diagnostic() {
  console.log("--- SESMT-SYSTEM: DIAGNOSTICO PSICOSSOCIAL ---")
  
  const tables = [
    "abs_dim_psychosocial_factor",
    "abs_fact_psychosocial_assessment",
    "abs_fact_psychosocial_signal",
    "abs_dim_vinculo_servidor"
  ]

  for (const table of tables) {
    const { count, error } = await supabase
      .schema('abs_intel')
      .from(table)
      .select('*', { count: 'exact', head: true })
    
    if (error) {
      console.error(`ERRO [${table}]:`, error.message)
    } else {
      console.log(`SUCESSO [${table}]: ${count} registros`)
    }
  }

  // Verificar sample de vinculos
  const { data: sampleVinculos } = await supabase
    .schema('abs_intel')
    .from('abs_dim_vinculo_servidor')
    .select('*')
    .limit(2)
  
  console.log("Sample Vinculos:", sampleVinculos)
}

diagnostic()
