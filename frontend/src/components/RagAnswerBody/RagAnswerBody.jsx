import { useCallback, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-bash';
import { Copy, Check } from 'lucide-react';
import styles from './RagAnswerBody.module.css';

function normalizeMarkdownContent(text) {
  if (!text || typeof text !== 'string') return '';

  const lines = text.split('\n');
  const result = [];
  let inFence = false;
  let codeBuffer = [];

  function isCodeLine(line) {
    const trimmed = line.trim();
    if (!trimmed) return false;

    if (/^(import |export |const |let |var |function |class |interface |type |return |from ["']|CREATE TABLE|SELECT |INSERT INTO|UPDATE |DELETE FROM)/i.test(trimmed)) {
      return true;
    }
    if (/^<[\w.]+[\s\S]*\/?>$/i.test(trimmed) || /^<\/[\w.]+>$/i.test(trimmed)) {
      return true;
    }
    if (/[;{}]$/.test(trimmed) || /\/>$/.test(trimmed)) {
      return true;
    }
    if (/(\(\s*\)\s*=>|=>|\buseState\(|\buseEffect\(|\buseParams\(|\bconsole\.log\()/.test(trimmed)) {
      return true;
    }
    if (line.startsWith('  ') && /[a-zA-Z0-9_$]/.test(trimmed)) {
      return true;
    }
    return false;
  }

  function flushCodeBuffer() {
    if (codeBuffer.length === 0) return;
    const strongCodeLines = codeBuffer.filter(l =>
      /^(import |export |function |const |let |var |class |CREATE TABLE|SELECT )/.test(l.trim()) ||
      /<[A-Z][\w.]*[\s\S]*\/?>/.test(l.trim())
    );
    if (codeBuffer.length >= 2 || strongCodeLines.length >= 1) {
      result.push('```jsx');
      result.push(...codeBuffer);
      result.push('```');
    } else {
      result.push(...codeBuffer);
    }
    codeBuffer = [];
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      flushCodeBuffer();
      inFence = !inFence;
      result.push(line);
      continue;
    }

    if (inFence) {
      result.push(line);
      continue;
    }

    if (isCodeLine(line)) {
      codeBuffer.push(line);
    } else if (!trimmed && codeBuffer.length > 0) {
      const nextLine = lines[i + 1];
      if (nextLine && isCodeLine(nextLine)) {
        codeBuffer.push(line);
      } else {
        flushCodeBuffer();
        result.push(line);
      }
    } else {
      flushCodeBuffer();
      result.push(line);
    }
  }

  flushCodeBuffer();
  return result.join('\n');
}

/**
 * @param {{ children: string }} props
 */
export default function RagAnswerBody({ children }) {
  const text = typeof children === 'string' ? children : '';
  if (!text.trim()) return null;
  const normalized = normalizeMarkdownContent(text);

  return (
    <div className={styles.root}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ node: _n, ...props }) => <p className={styles.p} {...props} />,
          strong: ({ node: _n, ...props }) => <strong className={styles.strong} {...props} />,
          b: ({ node: _n, ...props }) => <strong className={styles.strong} {...props} />,
          em: ({ node: _n, ...props }) => <em className={styles.em} {...props} />,
          i: ({ node: _n, ...props }) => <em className={styles.em} {...props} />,
          ul: ({ node: _n, ...props }) => (
            <ul className={styles.ul} {...props} />
          ),
          ol: ({ node: _n, ...props }) => (
            <ol className={styles.ol} {...props} />
          ),
          li: ({ node: _n, ...props }) => (
            <li className={styles.li} {...props} />
          ),
          h1: ({ node: _n, ...props }) => (
            <h2 className={styles.h1} {...props} />
          ),
          h2: ({ node: _n, ...props }) => (
            <h3 className={styles.h2} {...props} />
          ),
          h3: ({ node: _n, ...props }) => (
            <h4 className={styles.h3} {...props} />
          ),
          h4: ({ node: _n, ...props }) => (
            <h5 className={styles.h4} {...props} />
          ),
          blockquote: ({ node: _n, ...props }) => (
            <blockquote className={styles.blockquote} {...props} />
          ),
          a: ({ node: _n, ...props }) => (
            <a
              className={styles.a}
              target='_blank'
              rel='noreferrer noopener'
              {...props}
            />
          ),
          hr: ({ node: _n, ...props }) => (
            <hr className={styles.hr} {...props} />
          ),
          pre: ({ node: _n, children: preChildren }) => {
            const codeChild = Array.isArray(preChildren) ? preChildren[0] : preChildren;
            const codeProps = codeChild?.props || {};
            const codeContent = codeProps.children || '';
            const codeClassName = codeProps.className || '';
            return <CodeBlock className={codeClassName}>{codeContent}</CodeBlock>;
          },
          code: ({ node: _n, className, children: codeChildren, ...props }) => {
            const isFence = Boolean(className?.trim());
            if (isFence) {
              return (
                <code className={className} {...props}>
                  {codeChildren}
                </code>
              );
            }
            return (
              <code className={styles.inlineCode} {...props}>
                {codeChildren}
              </code>
            );
          },
        }}
      >
        {normalized}
      </ReactMarkdown>
    </div>
  );
}

function CodeBlock({ children, className }) {
  const preRef = useRef(null);
  const [copied, setCopied] = useState(false);

  const raw = typeof children === 'string'
    ? children
    : Array.isArray(children)
    ? children.map(c => (typeof c === 'string' ? c : c?.props?.children || '')).join('')
    : (children?.props?.children || '');

  const langMatch = typeof className === 'string' ? className.match(/language-([\w+#.-]+)/) : null;
  const lang = (langMatch ? langMatch[1] : 'javascript').toLowerCase();

  const handleCopy = useCallback(async () => {
    if (!raw) return;
    try {
      await navigator.clipboard.writeText(raw);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [raw]);

  let highlightedHtml = '';
  try {
    const grammar = Prism.languages[lang] || Prism.languages.javascript;
    highlightedHtml = Prism.highlight(raw, grammar, lang);
  } catch {
    highlightedHtml = '';
  }

  return (
    <div className={styles.codeWrap}>
      <button
        type='button'
        className={styles.copyBtn}
        onClick={handleCopy}
        aria-label={copied ? 'Copied to clipboard' : 'Copy code to clipboard'}
        title='Copy code'
      >
        {copied ? (
          <>
            <Check size={13} aria-hidden />
            <span>Copied</span>
          </>
        ) : (
          <>
            <Copy size={13} aria-hidden />
            <span>Copy</span>
          </>
        )}
      </button>
      <pre ref={preRef} className={styles.pre}>
        {highlightedHtml ? (
          <code
            className={`language-${lang}`}
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
          />
        ) : (
          <code>{raw}</code>
        )}
      </pre>
    </div>
  );
}
