import React, { useEffect, useRef } from "react";
import Prism from "prismjs";

// Import common language support
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-json";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-shell-session";
import "prismjs/components/prism-python";
import "prismjs/components/prism-css";
import "prismjs/components/prism-markdown";
import "prismjs/components/prism-yaml";
import "prismjs/components/prism-rust";
import "prismjs/components/prism-go";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-diff";

interface CodeBlockProps {
  code: string;
  language?: string;
}

// Language aliases for common variations
const languageAliases: Record<string, string> = {
  js: "javascript",
  ts: "typescript",
  py: "python",
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  yml: "yaml",
  md: "markdown",
  plaintext: "text",
};

// Simple language detection based on code content patterns
function detectLanguage(code: string): string {
  const trimmed = code.trim();

  // JSON detection
  if (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    try {
      JSON.parse(trimmed);
      return "json";
    } catch {
      // Not valid JSON, continue detection
    }
  }

  // TypeScript/JavaScript patterns
  if (
    /^import\s+.*from\s+['"]/.test(trimmed) ||
    /^export\s+(default\s+)?(function|class|const|interface|type)/.test(trimmed)
  ) {
    // Check for TypeScript-specific syntax
    if (
      /:\s*(string|number|boolean|any|void|never)\b/.test(trimmed) ||
      /interface\s+\w+\s*\{/.test(trimmed) ||
      /type\s+\w+\s*=/.test(trimmed) ||
      /<\w+>/.test(trimmed)
    ) {
      return "typescript";
    }
    return "javascript";
  }

  // React/JSX patterns
  if (/<[A-Z][a-zA-Z]*[\s/>]/.test(trimmed) || /React\./.test(trimmed)) {
    if (/:\s*(string|number|boolean|React\.)/.test(trimmed)) {
      return "tsx";
    }
    return "jsx";
  }

  // Bash/Shell patterns
  if (
    /^#!/.test(trimmed) ||
    /^\$\s/.test(trimmed) ||
    /^(cd|ls|mkdir|rm|cp|mv|cat|echo|grep|chmod|sudo|npm|bun|yarn|git)\s/.test(
      trimmed
    )
  ) {
    return "bash";
  }

  // Python patterns
  if (
    /^def\s+\w+\s*\(/.test(trimmed) ||
    /^class\s+\w+[\s:(]/.test(trimmed) ||
    /^import\s+\w+$/.test(trimmed) ||
    /^from\s+\w+\s+import/.test(trimmed)
  ) {
    return "python";
  }

  // CSS patterns
  if (/^\.[a-z-]+\s*\{/.test(trimmed) || /^@(media|keyframes|import)/.test(trimmed)) {
    return "css";
  }

  // SQL patterns
  if (/^(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER)\s/i.test(trimmed)) {
    return "sql";
  }

  // YAML patterns
  if (/^\w+:\s*(\n|$)/.test(trimmed) && !trimmed.includes("{")) {
    return "yaml";
  }

  // Rust patterns
  if (/^(fn|impl|struct|enum|pub|use|mod)\s/.test(trimmed) || /^let\s+mut\s/.test(trimmed)) {
    return "rust";
  }

  // Go patterns
  if (/^(func|package|import)\s/.test(trimmed) || /^type\s+\w+\s+struct\s/.test(trimmed)) {
    return "go";
  }

  // Diff patterns
  if (/^(diff --git|@@|\+\+\+|---)/.test(trimmed)) {
    return "diff";
  }

  // Default to text if no pattern matches
  return "text";
}

// Normalize language name
function normalizeLanguage(lang: string): string {
  const lower = lang.toLowerCase().trim();
  return languageAliases[lower] || lower;
}

export function CodeBlock({ code, language }: CodeBlockProps) {
  const codeRef = useRef<HTMLElement>(null);

  // Determine the language to use
  const detectedLang = language ? normalizeLanguage(language) : detectLanguage(code);

  // Check if Prism supports this language
  const prismLang = Prism.languages[detectedLang] ? detectedLang : "text";

  useEffect(() => {
    if (codeRef.current && prismLang !== "text") {
      Prism.highlightElement(codeRef.current);
    }
  }, [code, prismLang]);

  // Count lines for line numbers
  const lines = code.split("\n");
  const showLineNumbers = lines.length > 1;

  return (
    <div className="code-block">
      {detectedLang !== "text" && (
        <div className="code-block-header">
          <span className="code-block-language">{detectedLang}</span>
        </div>
      )}
      <div className="code-block-content">
        {showLineNumbers && (
          <div className="code-block-line-numbers" aria-hidden="true">
            {lines.map((_, i) => (
              <span key={i} className="code-block-line-number">
                {i + 1}
              </span>
            ))}
          </div>
        )}
        <pre className="code-block-pre">
          <code ref={codeRef} className={`language-${prismLang}`}>
            {code}
          </code>
        </pre>
      </div>
    </div>
  );
}

export default CodeBlock;
