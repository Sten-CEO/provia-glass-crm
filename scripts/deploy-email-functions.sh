#!/bin/bash

# Script de déploiement des fonctions email sur Supabase
# Ce script s'assure que les dernières modifications sont déployées

set -e  # Exit on error

echo "🔄 Déploiement des fonctions email..."
echo ""

# Vérifier que Supabase CLI est installé
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI n'est pas installé"
    echo "📦 Installez-le via: https://supabase.com/docs/guides/cli"
    exit 1
fi

# Afficher le statut Git
echo "📊 Statut Git:"
git status --short
echo ""

# Vérifier qu'on est sur la bonne branche
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "🌿 Branche actuelle: $CURRENT_BRANCH"
echo ""

# Déployer les fonctions email
echo "📤 Déploiement de send-quote-email..."
supabase functions deploy send-quote-email --no-verify-jwt

echo ""
echo "📤 Déploiement de send-invoice-email..."
supabase functions deploy send-invoice-email --no-verify-jwt

echo ""
echo "📤 Déploiement de test-smtp..."
supabase functions deploy test-smtp --no-verify-jwt

echo ""
echo "✅ Déploiement terminé!"
echo ""
echo "🧪 Pour tester, envoyez un devis depuis le CRM et vérifiez:"
echo "   1. L'email s'affiche en HTML avec le header bleu"
echo "   2. Le bouton 'Consulter mon devis' est cliquable"
echo "   3. Le PDF est en pièce jointe"
echo ""
