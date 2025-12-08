#!/bin/bash

# Script pour forcer le redéploiement avec mise à jour des fichiers _shared
# Ce script utilise le Supabase CLI du Mac

echo "🔄 Redéploiement forcé des fonctions email..."
echo ""
echo "⚠️  IMPORTANT: Ce script doit être exécuté depuis ton Mac :"
echo "    cd /Users/macbook/Documents/Provia-BASE/provia-glass-crm"
echo "    git pull"
echo "    ./force-deploy.sh"
echo ""
echo "Les commandes à exécuter :"
echo ""
echo "# 1. Vérifier le code local contient bien altBoundary"
echo "grep -n 'altBoundary' supabase/functions/_shared/smtp-mailer.ts"
echo ""
echo "# 2. Déployer TOUTES les fonctions qui utilisent SMTP (pas juste une)"
echo "supabase functions deploy send-quote-email --no-verify-jwt"
echo "supabase functions deploy send-invoice-email --no-verify-jwt"
echo "supabase functions deploy test-smtp --no-verify-jwt"
echo ""
echo "# 3. Vérifier dans le Dashboard que le code a bien été mis à jour"
echo "# Aller sur: https://supabase.com/dashboard/project/rryjcqcxhpccgzkhgdqr/functions/send-quote-email/code"
echo "# Chercher 'altBoundary' dans smtp-mailer.ts ligne 186"
echo ""
echo "# 4. Envoyer un nouveau devis pour tester"
echo ""
