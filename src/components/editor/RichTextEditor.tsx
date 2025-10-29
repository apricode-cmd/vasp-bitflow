/**
 * Rich Text Editor for Legal Documents
 * Based on Lexical editor with essential formatting tools
 */

'use client';

import { useState, useEffect } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import LexicalErrorBoundary from '@lexical/react/LexicalErrorBoundary';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListNode, ListItemNode } from '@lexical/list';
import { CodeNode } from '@lexical/code';
import { LinkNode } from '@lexical/link';
import { EditorState } from 'lexical';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  initialValue?: any; // Lexical EditorState JSON
  onChange?: (editorState: any, html: string, plainText: string) => void;
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
}

const theme = {
  paragraph: 'mb-2',
  heading: {
    h1: 'text-3xl font-bold mb-4 mt-6',
    h2: 'text-2xl font-bold mb-3 mt-5',
    h3: 'text-xl font-semibold mb-2 mt-4',
  },
  list: {
    ul: 'list-disc list-inside ml-4 mb-2',
    ol: 'list-decimal list-inside ml-4 mb-2',
  },
  quote: 'border-l-4 border-primary pl-4 italic my-4',
  code: 'bg-muted px-2 py-1 rounded font-mono text-sm',
};

export function RichTextEditor({
  initialValue,
  onChange,
  placeholder = 'Enter document content...',
  className,
  readOnly = false,
}: RichTextEditorProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const initialConfig = {
    namespace: 'LegalDocumentEditor',
    theme,
    onError: (error: Error) => {
      console.error('Lexical Editor Error:', error);
    },
    editorState: initialValue ? JSON.stringify(initialValue) : undefined,
    nodes: [
      HeadingNode,
      QuoteNode,
      ListNode,
      ListItemNode,
      CodeNode,
      LinkNode,
    ],
    editable: !readOnly,
  };

  const handleChange = (editorState: EditorState) => {
    if (!onChange) return;

    editorState.read(() => {
      // Get JSON representation
      const json = editorState.toJSON();

      // Get plain text
      const plainText = editorState.read(() => {
        const root = editorState._nodeMap.get('root');
        return root ? root.getTextContent() : '';
      });

      // Generate HTML (simple conversion)
      const html = generateHTML(json);

      onChange(json, html, plainText);
    });
  };

  // Simple HTML generation from Lexical JSON
  const generateHTML = (editorState: any): string => {
    // This is a simplified version
    // In production, use @lexical/html or a proper serializer
    try {
      const root = editorState.root;
      if (!root || !root.children) return '';

      return root.children
        .map((node: any) => {
          if (node.type === 'paragraph') {
            const text = node.children?.map((c: any) => c.text || '').join('') || '';
            return `<p>${text}</p>`;
          }
          if (node.type === 'heading') {
            const tag = `h${node.tag}`;
            const text = node.children?.map((c: any) => c.text || '').join('') || '';
            return `<${tag}>${text}</${tag}>`;
          }
          if (node.type === 'list') {
            const tag = node.listType === 'bullet' ? 'ul' : 'ol';
            const items = node.children
              ?.map((item: any) => {
                const text = item.children?.map((c: any) => c.text || '').join('') || '';
                return `<li>${text}</li>`;
              })
              .join('') || '';
            return `<${tag}>${items}</${tag}>`;
          }
          return '';
        })
        .join('\n');
    } catch (error) {
      console.error('HTML generation error:', error);
      return '';
    }
  };

  if (!mounted) {
    return (
      <div className={cn('border rounded-md p-4 bg-muted/30', className)}>
        <p className="text-muted-foreground">Loading editor...</p>
      </div>
    );
  }

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div
        className={cn(
          'border rounded-md overflow-hidden bg-background',
          className
        )}
      >
        <RichTextPlugin
          contentEditable={
            <ContentEditable
              className={cn(
                'min-h-[400px] p-4 outline-none prose prose-slate dark:prose-invert max-w-none',
                readOnly && 'cursor-default'
              )}
            />
          }
          placeholder={
            <div className="absolute top-4 left-4 text-muted-foreground pointer-events-none">
              {placeholder}
            </div>
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        <HistoryPlugin />
        {onChange && <OnChangePlugin onChange={handleChange} />}
      </div>
    </LexicalComposer>
  );
}

