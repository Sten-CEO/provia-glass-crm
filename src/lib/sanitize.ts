/**
 * HTML Sanitization Utility
 *
 * Uses DOMPurify to prevent XSS attacks when rendering user-generated HTML content.
 * Always use this before rendering HTML with dangerouslySetInnerHTML.
 */

import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks
 * Allows safe HTML tags and removes potentially dangerous content
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    // Allow common formatting tags
    ALLOWED_TAGS: [
      'p', 'br', 'b', 'i', 'u', 'strong', 'em', 'span', 'div',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'a', 'img',
      'blockquote', 'pre', 'code',
      'hr', 'sub', 'sup',
    ],
    // Allow safe attributes
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title', 'class', 'id', 'style',
      'width', 'height', 'colspan', 'rowspan',
      'target', 'rel',
    ],
    // Force links to open in new tab and add security
    ADD_ATTR: ['target', 'rel'],
    // Prevent javascript: URLs
    ALLOW_DATA_ATTR: false,
  });
}

/**
 * Sanitize HTML for document templates (more permissive)
 * Used for quote/invoice templates that need more styling freedom
 */
export function sanitizeTemplateHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    // Allow all safe HTML tags including style
    ALLOWED_TAGS: [
      'html', 'head', 'body', 'style', 'meta', 'title',
      'p', 'br', 'b', 'i', 'u', 'strong', 'em', 'span', 'div',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li',
      'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'colgroup', 'col',
      'a', 'img',
      'blockquote', 'pre', 'code',
      'hr', 'sub', 'sup',
      'header', 'footer', 'main', 'section', 'article', 'aside', 'nav',
    ],
    // Allow style attributes for templates
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title', 'class', 'id', 'style',
      'width', 'height', 'colspan', 'rowspan', 'border',
      'target', 'rel', 'charset', 'name', 'content',
    ],
    // Allow inline styles (needed for PDF templates)
    ALLOW_DATA_ATTR: false,
    // Keep style tags for PDF rendering
    KEEP_CONTENT: true,
  });
}

/**
 * Sanitize plain text (escape all HTML)
 * Use this when displaying user input that should never contain HTML
 */
export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
