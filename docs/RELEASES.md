# Guide de publication des releases Provia BASE

Ce document explique comment publier une nouvelle version de l'application desktop Provia BASE.

## Architecture

- **Web App** : Deployee automatiquement sur Vercel a chaque push sur `main`
- **Desktop App** : Construite via GitHub Actions et publiee sur GitHub Releases
- **Page /download** : Recupere automatiquement la derniere release depuis GitHub API

## Publier une nouvelle version

### 1. Preparer la release

Assurez-vous que :
- Tous les changements sont commites et pushes sur `main`
- L'application fonctionne correctement en local
- Les tests passent (si applicable)

### 2. Creer un tag de version

```bash
# Format: vX.Y.Z (ex: v1.0.0, v1.2.3)
git tag v1.0.0

# Pusher le tag
git push origin v1.0.0
```

### 3. Le workflow automatique

Une fois le tag pushe, GitHub Actions va automatiquement :

1. Creer une nouvelle Release sur GitHub
2. Builder l'application pour Windows (`.exe`)
3. Builder l'application pour macOS Intel (`.dmg`)
4. Builder l'application pour macOS Apple Silicon (`.dmg`)
5. Attacher les fichiers a la Release

### 4. Verification

1. Allez sur https://github.com/Sten-CEO/provia-glass-crm/releases
2. Verifiez que la nouvelle release apparait avec tous les fichiers
3. Testez la page `/download` - elle devrait afficher la nouvelle version

## Declenchement manuel

Vous pouvez aussi declencher le build manuellement depuis GitHub :

1. Allez sur **Actions** > **Build and Release Tauri Desktop App**
2. Cliquez sur **Run workflow**
3. (Optionnel) Specifiez un tag de version
4. Cliquez sur **Run workflow**

## Fichiers generes

| Plateforme | Fichier | Description |
|------------|---------|-------------|
| Windows | `Provia-BASE_x.x.x_x64-setup.exe` | Installateur Windows 64-bit |
| macOS Intel | `Provia-BASE_x.x.x_x64.dmg` | Image disque pour Mac Intel |
| macOS ARM | `Provia-BASE_x.x.x_aarch64.dmg` | Image disque pour Mac M1/M2/M3 |

## Convention de versioning

Utilisez le [Semantic Versioning](https://semver.org/) :

- **MAJOR** (v2.0.0) : Changements incompatibles avec les versions precedentes
- **MINOR** (v1.1.0) : Nouvelles fonctionnalites retrocompatibles
- **PATCH** (v1.0.1) : Corrections de bugs retrocompatibles

## Troubleshooting

### Le build echoue

1. Verifiez les logs dans l'onglet **Actions** sur GitHub
2. Assurez-vous que `src-tauri/tauri.conf.json` est valide
3. Verifiez que les icones existent dans `src-tauri/icons/`

### La page /download n'affiche pas la release

1. Verifiez que la release n'est pas en mode "Draft"
2. Attendez quelques secondes (cache API GitHub)
3. Verifiez les assets attaches a la release

### Erreur de signature (macOS)

Les builds ne sont pas signes par defaut. Pour distribuer sur macOS sans avertissement Gatekeeper :
- Les utilisateurs doivent faire clic-droit > Ouvrir la premiere fois
- Ou configurer un certificat Apple Developer dans le workflow

## Structure des fichiers

```
.github/
  workflows/
    tauri-release.yml    # Workflow de build et release

src-tauri/
  Cargo.toml             # Configuration Rust
  tauri.conf.json        # Configuration Tauri
  src/
    main.rs              # Point d'entree Rust
  icons/                 # Icones de l'application
```

## Liens utiles

- [Releases GitHub](https://github.com/Sten-CEO/provia-glass-crm/releases)
- [Actions GitHub](https://github.com/Sten-CEO/provia-glass-crm/actions)
- [Documentation Tauri](https://tauri.app/v2/guides/)
