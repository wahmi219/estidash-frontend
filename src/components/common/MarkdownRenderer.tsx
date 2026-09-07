'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

interface MarkdownRendererProps {
    content: string;
}

const markdownComponents: Components = {
    // Headings
    h1: ({ children }) => (
        <h3 className="chat-md-h1">{children}</h3>
    ),
    h2: ({ children }) => (
        <h4 className="chat-md-h2">{children}</h4>
    ),
    h3: ({ children }) => (
        <h5 className="chat-md-h3">{children}</h5>
    ),
    h4: ({ children }) => (
        <h6 className="chat-md-h4">{children}</h6>
    ),

    // Paragraphs
    p: ({ children }) => (
        <p className="chat-md-p">{children}</p>
    ),

    // Strong / Emphasis
    strong: ({ children }) => (
        <strong className="chat-md-strong">{children}</strong>
    ),
    em: ({ children }) => (
        <em className="chat-md-em">{children}</em>
    ),

    // Lists
    ul: ({ children }) => (
        <ul className="chat-md-ul">{children}</ul>
    ),
    ol: ({ children }) => (
        <ol className="chat-md-ol">{children}</ol>
    ),
    li: ({ children }) => (
        <li className="chat-md-li">{children}</li>
    ),

    // Code
    code: ({ className, children, ...props }) => {
        const isInline = !className;
        if (isInline) {
            return (
                <code className="chat-md-code-inline" {...props}>
                    {children}
                </code>
            );
        }
        return (
            <code className={`chat-md-code-block ${className || ''}`} {...props}>
                {children}
            </code>
        );
    },
    pre: ({ children }) => (
        <pre className="chat-md-pre">{children}</pre>
    ),

    // Tables (GFM)
    table: ({ children }) => (
        <div className="chat-md-table-wrap">
            <table className="chat-md-table">{children}</table>
        </div>
    ),
    thead: ({ children }) => (
        <thead className="chat-md-thead">{children}</thead>
    ),
    tbody: ({ children }) => (
        <tbody className="chat-md-tbody">{children}</tbody>
    ),
    tr: ({ children }) => (
        <tr className="chat-md-tr">{children}</tr>
    ),
    th: ({ children }) => (
        <th className="chat-md-th">{children}</th>
    ),
    td: ({ children }) => (
        <td className="chat-md-td">{children}</td>
    ),

    // Blockquote
    blockquote: ({ children }) => (
        <blockquote className="chat-md-blockquote">{children}</blockquote>
    ),

    // Horizontal rule
    hr: () => <hr className="chat-md-hr" />,

    // Links
    a: ({ href, children }) => (
        <a href={href} target="_blank" rel="noopener noreferrer" className="chat-md-link">
            {children}
        </a>
    ),
};

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
    return (
        <div className="chat-markdown">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={markdownComponents}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}
