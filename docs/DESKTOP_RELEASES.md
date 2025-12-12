# Publication des releases desktop Provia BASE

Ce document explique comment publier une nouvelle version de l'application desktop Provia BASE.

## Processus de release

### 1. Prerequis

- Les workflows GitHub Actions Tauri sont configures (`.github/workflows/tauri*.yml`)
- Les secrets de signature de code sont configures dans GitHub (si necessaire)

### 2. Creer une nouvelle release

#### Option A : Via tag Git

```bash
# Incrementer la version dans src-tauri/tauri.conf.json si necessaire
# Puis creer et pousser un tag

git tag v1.1.0
git push origin v1.1.0
```

#### Option B : Via GitHub UI

1. Aller sur https://github.com/Sten-CEO/provia-glass-crm/releases
2. Cliquer sur "Draft a new release"
3. Creer un nouveau tag (ex: `v1.1.0`)
4. Remplir le titre et la description
5. Publier la release

### 3. Build automatique

Une fois le tag pousse ou la release creee, GitHub Actions va automatiquement :

1. Builder l'application pour Windows et macOS
2. Signer les executables (si configure)
3. Uploader les assets sur la release GitHub :
   - `Provia.BASE_X.Y.Z_x64-setup.exe` - Installeur Windows
   - `Provia.BASE_X.Y.Z_x64_en-US.msi` - MSI Windows (entreprise)
   - `Provia.BASE_X.Y.Z_x64.dmg` - DMG macOS Intel
   - `Provia.BASE_X.Y.Z_aarch64.dmg` - DMG macOS Apple Silicon

### 4. Mise a jour automatique de /download

La page `/download` se met a jour automatiquement :

1. L'endpoint `/api/releases/latest` recupere la derniere release GitHub
2. Il parse les assets et retourne les URLs de telechargement
3. La page affiche les boutons de telechargement avec detection automatique de l'OS

**Cache** : Les donnees sont mises en cache 5 minutes cote serveur pour eviter le rate limiting GitHub.

## Configuration

### Variables d'environnement (optionnelles)

Sur Vercel, vous pouvez configurer :

- `GITHUB_TOKEN` : Token GitHub pour eviter le rate limiting de l'API (60 req/h sans token vs 5000 req/h avec token)

### Structure des fichiers

```
api/
  releases/
    latest.ts        # Endpoint Vercel serverless

src/pages/
  Download.tsx       # Page de telechargement publique
```

## Detection automatique

La page `/download` detecte automatiquement :

### OS
- **Windows** : Propose `.exe` (principal) et `.msi` (secondaire)
- **macOS** : Detecte Apple Silicon vs Intel via WebGL renderer
- **Linux/Autre** : Affiche toutes les options disponibles

### Architecture Mac
1. Verifie le user-agent pour "ARM"
2. Utilise WebGL pour detecter le GPU renderer ("Apple M1/M2/M3" vs "Intel")
3. Si incertain, affiche les deux options avec lien d'aide Apple

## Troubleshooting

### "Aucune version disponible"

1. Verifier qu'une release existe sur GitHub avec des assets
2. Verifier que les assets ont les bons noms (contiennent `x64-setup.exe`, `.msi`, `x64.dmg`, `aarch64.dmg`)
3. Verifier les logs Vercel pour erreurs API

### Rate limiting GitHub

Si vous voyez des erreurs 403 :

1. Configurer `GITHUB_TOKEN` dans les variables d'environnement Vercel
2. Creer un Personal Access Token (PAT) sur GitHub avec permissions `public_repo`

### Cache

L'API met les reponses en cache 5 minutes (`Cache-Control: s-maxage=300, stale-while-revalidate=600`).

Pour forcer un rafraichissement apres une nouvelle release, attendez 5 minutes ou deployez une nouvelle version sur Vercel.
