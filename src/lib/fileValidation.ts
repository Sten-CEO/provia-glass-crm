// File validation utilities for secure uploads

// Maximum file sizes in bytes
export const MAX_FILE_SIZES = {
  image: 20 * 1024 * 1024,      // 20 MB for images
  document: 50 * 1024 * 1024,   // 50 MB for documents (PDF, DOC)
  default: 50 * 1024 * 1024,    // 50 MB default
};

// Allowed MIME types with their magic bytes signatures
export const ALLOWED_FILE_TYPES = {
  // Images
  'image/jpeg': { extensions: ['.jpg', '.jpeg'], maxSize: MAX_FILE_SIZES.image },
  'image/png': { extensions: ['.png'], maxSize: MAX_FILE_SIZES.image },
  'image/gif': { extensions: ['.gif'], maxSize: MAX_FILE_SIZES.image },
  'image/webp': { extensions: ['.webp'], maxSize: MAX_FILE_SIZES.image },
  // Documents
  'application/pdf': { extensions: ['.pdf'], maxSize: MAX_FILE_SIZES.document },
  'application/msword': { extensions: ['.doc'], maxSize: MAX_FILE_SIZES.document },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { extensions: ['.docx'], maxSize: MAX_FILE_SIZES.document },
};

export type AllowedMimeType = keyof typeof ALLOWED_FILE_TYPES;

interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates a file for upload
 * @param file - The file to validate
 * @param allowedTypes - Array of allowed MIME types (e.g., ['image/jpeg', 'image/png'])
 * @param maxSizeOverride - Optional custom max size in bytes
 */
export function validateFile(
  file: File,
  allowedTypes: AllowedMimeType[] = Object.keys(ALLOWED_FILE_TYPES) as AllowedMimeType[],
  maxSizeOverride?: number
): ValidationResult {
  // Check if file type is allowed
  const fileType = file.type as AllowedMimeType;
  if (!allowedTypes.includes(fileType)) {
    const allowedExtensions = allowedTypes
      .flatMap(type => ALLOWED_FILE_TYPES[type]?.extensions || [])
      .join(', ');
    return {
      valid: false,
      error: `Type de fichier non autorisé. Types acceptés: ${allowedExtensions}`,
    };
  }

  // Get max size for this file type
  const typeConfig = ALLOWED_FILE_TYPES[fileType];
  const maxSize = maxSizeOverride || typeConfig?.maxSize || MAX_FILE_SIZES.default;

  // Check file size
  if (file.size > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(0);
    return {
      valid: false,
      error: `Fichier trop volumineux. Taille maximum: ${maxSizeMB} MB`,
    };
  }

  // Check file extension matches MIME type
  const fileName = file.name.toLowerCase();
  const expectedExtensions = typeConfig?.extensions || [];
  const hasValidExtension = expectedExtensions.some(ext => fileName.endsWith(ext));

  if (!hasValidExtension) {
    return {
      valid: false,
      error: `L'extension du fichier ne correspond pas à son type. Veuillez utiliser un fichier valide.`,
    };
  }

  return { valid: true };
}

/**
 * Validates multiple files
 */
export function validateFiles(
  files: FileList | File[],
  allowedTypes: AllowedMimeType[] = Object.keys(ALLOWED_FILE_TYPES) as AllowedMimeType[],
  maxSizeOverride?: number
): ValidationResult {
  const fileArray = Array.from(files);

  for (const file of fileArray) {
    const result = validateFile(file, allowedTypes, maxSizeOverride);
    if (!result.valid) {
      return { valid: false, error: `${file.name}: ${result.error}` };
    }
  }

  return { valid: true };
}

/**
 * Generate a safe filename using UUID
 */
export function generateSafeFilename(originalName: string): string {
  const ext = originalName.split('.').pop()?.toLowerCase() || '';
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}.${ext}`;
}

// Image-only types for photo uploads
export const IMAGE_TYPES: AllowedMimeType[] = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

// Document types for contract uploads
export const DOCUMENT_TYPES: AllowedMimeType[] = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

// All types
export const ALL_TYPES: AllowedMimeType[] = [...IMAGE_TYPES, ...DOCUMENT_TYPES];
