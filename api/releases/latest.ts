import type { VercelRequest, VercelResponse } from '@vercel/node';

interface GitHubAsset {
  name: string;
  browser_download_url: string;
  size: number;
}

interface GitHubRelease {
  tag_name: string;
  name: string;
  published_at: string;
  html_url: string;
  assets: GitHubAsset[];
}

interface ReleaseResponse {
  version: string;
  releaseUrl: string;
  publishedAt: string;
  windows: {
    exe: string | null;
    msi: string | null;
  };
  mac: {
    dmg_x64: string | null;
    dmg_arm64: string | null;
  };
}

// Simple in-memory cache
let cache: {
  data: ReleaseResponse | null;
  timestamp: number;
} = {
  data: null,
  timestamp: 0,
};

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

const GITHUB_OWNER = 'Sten-CEO';
const GITHUB_REPO = 'provia-glass-crm';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Set CORS headers for cross-origin requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check cache first
  const now = Date.now();
  if (cache.data && now - cache.timestamp < CACHE_TTL) {
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    res.setHeader('X-Cache', 'HIT');
    return res.status(200).json(cache.data);
  }

  try {
    // Build headers for GitHub API
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'Provia-CRM-Download-Page',
    };

    // Use GITHUB_TOKEN if available (to avoid rate limiting)
    const githubToken = process.env.GITHUB_TOKEN;
    if (githubToken) {
      headers['Authorization'] = `token ${githubToken}`;
    }

    // Fetch latest release from GitHub
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`,
      { headers }
    );

    if (response.status === 404) {
      return res.status(404).json({
        error: 'No release found',
        message: 'Aucune release disponible pour le moment.',
        releaseUrl: `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases`,
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GitHub API error:', response.status, errorText);
      return res.status(response.status).json({
        error: 'GitHub API error',
        message: `Erreur lors de la recuperation des releases (${response.status})`,
        releaseUrl: `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases`,
      });
    }

    const release: GitHubRelease = await response.json();

    // Parse assets to find download URLs
    let windowsExe: string | null = null;
    let windowsMsi: string | null = null;
    let macDmgX64: string | null = null;
    let macDmgArm64: string | null = null;

    for (const asset of release.assets) {
      const name = asset.name.toLowerCase();

      // Windows .exe (prefer x64-setup.exe)
      if (name.includes('x64-setup.exe') || (name.endsWith('.exe') && name.includes('setup') && !windowsExe)) {
        windowsExe = asset.browser_download_url;
      }

      // Windows .msi
      if (name.endsWith('.msi')) {
        windowsMsi = asset.browser_download_url;
      }

      // macOS Intel (x64.dmg)
      if (name.endsWith('.dmg') && (name.includes('x64') || name.includes('x86_64'))) {
        macDmgX64 = asset.browser_download_url;
      }

      // macOS Apple Silicon (aarch64.dmg or arm64.dmg)
      if (name.endsWith('.dmg') && (name.includes('aarch64') || name.includes('arm64'))) {
        macDmgArm64 = asset.browser_download_url;
      }
    }

    // If we found a .dmg but couldn't categorize it, use it for both
    if (!macDmgX64 && !macDmgArm64) {
      const anyDmg = release.assets.find((a) => a.name.toLowerCase().endsWith('.dmg'));
      if (anyDmg) {
        macDmgX64 = anyDmg.browser_download_url;
        macDmgArm64 = anyDmg.browser_download_url;
      }
    }

    // Extract version from tag (remove 'v' prefix if present)
    const version = release.tag_name.startsWith('v')
      ? release.tag_name.substring(1)
      : release.tag_name;

    const responseData: ReleaseResponse = {
      version,
      releaseUrl: release.html_url,
      publishedAt: release.published_at,
      windows: {
        exe: windowsExe,
        msi: windowsMsi,
      },
      mac: {
        dmg_x64: macDmgX64,
        dmg_arm64: macDmgArm64,
      },
    };

    // Update cache
    cache = {
      data: responseData,
      timestamp: now,
    };

    // Set caching headers
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    res.setHeader('X-Cache', 'MISS');

    return res.status(200).json(responseData);
  } catch (error) {
    console.error('Error fetching release:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Erreur lors de la recuperation des releases.',
      releaseUrl: `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases`,
    });
  }
}
