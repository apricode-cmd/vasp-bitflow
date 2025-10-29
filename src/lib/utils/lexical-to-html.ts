/**
 * Convert Lexical editor JSON state to HTML
 * Supports basic text formatting, headings, lists, etc.
 */

interface TextNode {
  type: 'text';
  text: string;
  format?: number;
  style?: string;
}

interface ElementNode {
  type: string;
  children: (TextNode | ElementNode)[];
  direction?: string;
  format?: string | number;
  indent?: number;
  tag?: string;
  listType?: string;
  value?: number;
  start?: number;
}

interface LexicalState {
  root: ElementNode;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatText(text: string, format?: number): string {
  if (!format) return escapeHtml(text);

  let result = escapeHtml(text);

  // Format flags (bitwise)
  const IS_BOLD = 1;
  const IS_ITALIC = 2;
  const IS_STRIKETHROUGH = 4;
  const IS_UNDERLINE = 8;
  const IS_CODE = 16;
  const IS_SUBSCRIPT = 32;
  const IS_SUPERSCRIPT = 64;

  if (format & IS_BOLD) result = `<strong>${result}</strong>`;
  if (format & IS_ITALIC) result = `<em>${result}</em>`;
  if (format & IS_STRIKETHROUGH) result = `<s>${result}</s>`;
  if (format & IS_UNDERLINE) result = `<u>${result}</u>`;
  if (format & IS_CODE) result = `<code>${result}</code>`;
  if (format & IS_SUBSCRIPT) result = `<sub>${result}</sub>`;
  if (format & IS_SUPERSCRIPT) result = `<sup>${result}</sup>`;

  return result;
}

function processNode(node: TextNode | ElementNode, depth = 0): string {
  // Text node
  if (node.type === 'text') {
    return formatText((node as TextNode).text, (node as TextNode).format);
  }

  // Element node
  const element = node as ElementNode;
  const children = element.children?.map(child => processNode(child, depth + 1)).join('') || '';

  switch (element.type) {
    case 'root':
      return children;

    case 'paragraph':
      // Пустой параграф
      if (!children.trim()) return '<p>&nbsp;</p>';
      return `<p>${children}</p>`;

    case 'heading':
      const tag = element.tag || 'h2';
      if (!children.trim()) return '';
      return `<${tag}>${children}</${tag}>`;

    case 'quote':
      return `<blockquote>${children || '&nbsp;'}</blockquote>`;

    case 'list':
      const listTag = element.listType === 'number' || element.listType === 'ordered' ? 'ol' : 'ul';
      const startAttr = element.start && element.start > 1 ? ` start="${element.start}"` : '';
      return `<${listTag}${startAttr}>${children}</${listTag}>`;

    case 'listitem':
      return `<li${element.value ? ` value="${element.value}"` : ''}>${children || '&nbsp;'}</li>`;

    case 'link':
      const url = (element as any).url || '#';
      const target = (element as any).target ? ` target="${(element as any).target}"` : '';
      const rel = (element as any).rel ? ` rel="${(element as any).rel}"` : '';
      return `<a href="${escapeHtml(url)}"${target}${rel}>${children}</a>`;

    case 'code':
      return `<pre><code>${children}</code></pre>`;

    case 'linebreak':
      return '<br />';

    case 'horizontalrule':
    case 'horizontal-rule':
      return '<hr />';

    case 'table':
      return `<table>${children}</table>`;

    case 'tablerow':
      return `<tr>${children}</tr>`;

    case 'tablecell':
      const cellTag = (element as any).headerState ? 'th' : 'td';
      const colspan = (element as any).colSpan > 1 ? ` colspan="${(element as any).colSpan}"` : '';
      const rowspan = (element as any).rowSpan > 1 ? ` rowspan="${(element as any).rowSpan}"` : '';
      return `<${cellTag}${colspan}${rowspan}>${children || '&nbsp;'}</${cellTag}>`;

    default:
      // Неизвестный тип узла - возвращаем детей
      console.warn(`Unknown Lexical node type: ${element.type}`);
      return children;
  }
}

export function lexicalToHtml(state: any): string {
  try {
    if (!state || typeof state !== 'object') {
      console.warn('lexicalToHtml: Invalid state format');
      return '<p>Invalid content format</p>';
    }

    const lexicalState = state as LexicalState;
    
    if (!lexicalState.root) {
      console.warn('lexicalToHtml: No root node found');
      return '<p>Empty content</p>';
    }

    // Debug: log структуру
    if (process.env.NODE_ENV === 'development') {
      console.log('Lexical state:', JSON.stringify(lexicalState, null, 2));
    }

    const html = processNode(lexicalState.root);
    
    if (!html || html.trim().length === 0) {
      return '<p>Empty content</p>';
    }

    return html;
  } catch (error) {
    console.error('Error converting Lexical to HTML:', error);
    return '<p>Error rendering content</p>';
  }
}

export function lexicalToPlainText(state: any): string {
  try {
    if (!state || typeof state !== 'object') {
      return '';
    }

    const lexicalState = state as LexicalState;
    
    if (!lexicalState.root) {
      return '';
    }

    function extractText(node: TextNode | ElementNode): string {
      if (node.type === 'text') {
        return (node as TextNode).text;
      }

      const element = node as ElementNode;
      
      // Добавляем переносы строк для блочных элементов
      const blockElements = ['paragraph', 'heading', 'listitem'];
      const text = element.children?.map(child => extractText(child)).join('') || '';
      
      if (blockElements.includes(element.type)) {
        return text + '\n';
      }
      
      return text;
    }

    return extractText(lexicalState.root).trim();
  } catch (error) {
    console.error('Error converting Lexical to plain text:', error);
    return '';
  }
}


