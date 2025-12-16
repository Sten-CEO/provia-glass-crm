#!/bin/bash
# Script pour générer toutes les icônes pour macOS et Windows
# Usage: ./generate-icons.sh source-logo.png

set -e

SOURCE="$1"
ICONS_DIR="src-tauri/icons"

if [ -z "$SOURCE" ]; then
    echo "Usage: $0 <source-logo.png>"
    exit 1
fi

if [ ! -f "$SOURCE" ]; then
    echo "Fichier source non trouvé: $SOURCE"
    exit 1
fi

echo "🎨 Génération des icônes depuis: $SOURCE"

cd "$(dirname "$0")/.."

# Créer le dossier iconset pour macOS
mkdir -p "$ICONS_DIR/icon.iconset"

# ============================================
# macOS - Générer toutes les tailles pour .icns
# ============================================
echo "📱 Génération des icônes macOS..."

convert "$SOURCE" -resize 16x16     "$ICONS_DIR/icon.iconset/icon_16x16.png"
convert "$SOURCE" -resize 32x32     "$ICONS_DIR/icon.iconset/icon_16x16@2x.png"
convert "$SOURCE" -resize 32x32     "$ICONS_DIR/icon.iconset/icon_32x32.png"
convert "$SOURCE" -resize 64x64     "$ICONS_DIR/icon.iconset/icon_32x32@2x.png"
convert "$SOURCE" -resize 128x128   "$ICONS_DIR/icon.iconset/icon_128x128.png"
convert "$SOURCE" -resize 256x256   "$ICONS_DIR/icon.iconset/icon_128x128@2x.png"
convert "$SOURCE" -resize 256x256   "$ICONS_DIR/icon.iconset/icon_256x256.png"
convert "$SOURCE" -resize 512x512   "$ICONS_DIR/icon.iconset/icon_256x256@2x.png"
convert "$SOURCE" -resize 512x512   "$ICONS_DIR/icon.iconset/icon_512x512.png"
convert "$SOURCE" -resize 1024x1024 "$ICONS_DIR/icon.iconset/icon_512x512@2x.png"

# Copier les tailles standard
convert "$SOURCE" -resize 32x32     "$ICONS_DIR/32x32.png"
convert "$SOURCE" -resize 64x64     "$ICONS_DIR/64x64.png"
convert "$SOURCE" -resize 128x128   "$ICONS_DIR/128x128.png"
convert "$SOURCE" -resize 256x256   "$ICONS_DIR/128x128@2x.png"
convert "$SOURCE" -resize 512x512   "$ICONS_DIR/icon.png"

# Générer le .icns (si iconutil est disponible - macOS seulement)
if command -v iconutil &> /dev/null; then
    echo "🍎 Génération du fichier .icns..."
    iconutil -c icns "$ICONS_DIR/icon.iconset" -o "$ICONS_DIR/icon.icns"
else
    echo "⚠️  iconutil non disponible (nécessite macOS). Le .icns devra être généré sur Mac."
fi

# ============================================
# Windows - Générer le .ico multi-résolutions
# ============================================
echo "🪟 Génération de l'icône Windows (.ico)..."

convert "$SOURCE" -resize 16x16   "$ICONS_DIR/icon-16.png"
convert "$SOURCE" -resize 32x32   "$ICONS_DIR/icon-32.png"
convert "$SOURCE" -resize 48x48   "$ICONS_DIR/icon-48.png"
convert "$SOURCE" -resize 64x64   "$ICONS_DIR/icon-64.png"
convert "$SOURCE" -resize 128x128 "$ICONS_DIR/icon-128.png"
convert "$SOURCE" -resize 256x256 "$ICONS_DIR/icon-256.png"

# Créer le .ico avec toutes les résolutions
convert "$ICONS_DIR/icon-16.png" "$ICONS_DIR/icon-32.png" "$ICONS_DIR/icon-48.png" \
        "$ICONS_DIR/icon-64.png" "$ICONS_DIR/icon-128.png" "$ICONS_DIR/icon-256.png" \
        "$ICONS_DIR/icon.ico"

# Nettoyer les fichiers temporaires
rm -f "$ICONS_DIR/icon-16.png" "$ICONS_DIR/icon-32.png" "$ICONS_DIR/icon-48.png" \
      "$ICONS_DIR/icon-64.png" "$ICONS_DIR/icon-128.png" "$ICONS_DIR/icon-256.png"

# ============================================
# Windows Store logos
# ============================================
echo "🏪 Génération des logos Windows Store..."

convert "$SOURCE" -resize 30x30   "$ICONS_DIR/Square30x30Logo.png"
convert "$SOURCE" -resize 44x44   "$ICONS_DIR/Square44x44Logo.png"
convert "$SOURCE" -resize 71x71   "$ICONS_DIR/Square71x71Logo.png"
convert "$SOURCE" -resize 89x89   "$ICONS_DIR/Square89x89Logo.png"
convert "$SOURCE" -resize 107x107 "$ICONS_DIR/Square107x107Logo.png"
convert "$SOURCE" -resize 142x142 "$ICONS_DIR/Square142x142Logo.png"
convert "$SOURCE" -resize 150x150 "$ICONS_DIR/Square150x150Logo.png"
convert "$SOURCE" -resize 284x284 "$ICONS_DIR/Square284x284Logo.png"
convert "$SOURCE" -resize 310x310 "$ICONS_DIR/Square310x310Logo.png"
convert "$SOURCE" -resize 50x50   "$ICONS_DIR/StoreLogo.png"

echo "✅ Toutes les icônes ont été générées!"
echo ""
echo "Fichiers créés:"
ls -la "$ICONS_DIR"/*.png "$ICONS_DIR"/*.ico "$ICONS_DIR"/*.icns 2>/dev/null || true
