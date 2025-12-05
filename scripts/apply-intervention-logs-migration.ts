import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Charger les variables d'environnement
const envPath = path.join(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars: Record<string, string> = {};

envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes');
  console.error('VITE_SUPABASE_URL:', supabaseUrl);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'Définie' : 'Non définie');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('📦 Application de la migration pour l\'historique des interventions...\n');

  const migrationPath = path.join(__dirname, '../supabase/migrations/20251205000000_auto_log_intervention_events.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

  // Diviser le SQL en plusieurs parties si nécessaire
  const sqlStatements = migrationSQL
    .split(/;(?=\s*(?:CREATE|DROP|ALTER|--)\s)/g)
    .filter(stmt => stmt.trim().length > 0);

  console.log(`📝 ${sqlStatements.length} instructions SQL à exécuter\n`);

  for (let i = 0; i < sqlStatements.length; i++) {
    const statement = sqlStatements[i].trim();
    if (!statement || statement.startsWith('--')) continue;

    try {
      console.log(`⏳ Exécution de l'instruction ${i + 1}/${sqlStatements.length}...`);
      const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });

      if (error) {
        // Si la fonction exec_sql n'existe pas, essayer directement via l'API
        console.log('⚠️  exec_sql non disponible, tentative d\'exécution directe...');

        // Note: Supabase ne permet pas d'exécuter du SQL arbitraire via le client
        // Il faut utiliser la méthode de migration appropriée
        console.error('❌ Erreur:', error.message);
        console.log('\n⚠️  Cette migration doit être appliquée via Supabase CLI ou le dashboard.\n');
        console.log('Solutions possibles:');
        console.log('1. Utiliser `npx supabase db push` (nécessite Supabase CLI configuré)');
        console.log('2. Copier le contenu de supabase/migrations/20251205000000_auto_log_intervention_events.sql');
        console.log('   et l\'exécuter dans le SQL Editor du dashboard Supabase\n');
        process.exit(1);
      }

      console.log('✅ OK\n');
    } catch (err: any) {
      console.error('❌ Erreur lors de l\'exécution:', err.message);
      process.exit(1);
    }
  }

  console.log('🎉 Migration appliquée avec succès!\n');
  console.log('Les triggers suivants ont été créés:');
  console.log('- trigger_log_timesheet_event (sur timesheets_events)');
  console.log('- trigger_log_job_status_change (sur jobs)');
  console.log('- trigger_log_job_important_changes (sur jobs)\n');
}

applyMigration().catch(console.error);
