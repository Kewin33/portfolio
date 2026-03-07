"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

type MarkdownContentProps = {
  content?: string;
  className?: string;
  pClassName?: string;
};

export default function MarkdownContent({ content = "", className = "", pClassName = "" }: MarkdownContentProps) {
  return (
    <div className={`markdown-content ${className}`.trim()}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          a: ({ ...props }) => (
            <a {...props} target="_blank" rel="noreferrer" className="underline underline-offset-4 text-blue-600 hover:text-blue-800" />
          ),
          img: ({ src, alt, ...props }) => (
            // use a responsive img tag for external/internal images
            // next/image cannot be used easily here because sizes may vary
            <img src={src} alt={alt as string} {...props} className="mx-auto rounded-md object-cover" />
          ),
          h1: ({ children }) => (
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-[18px] md:text-[20px] font-semibold text-slate-900 dark:text-white">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg md:text-xl font-semibold text-slate-900 dark:text-white">{children}</h3>
          ),
          p: ({ children }) => (
            <p className={`mt-4 ${pClassName || 'text-base text-slate-700 dark:text-slate-200'}`.trim()}>
              {children}
            </p>
          ),
          ul: ({ children }) => <ul className="list-disc ml-6 mt-3">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal ml-6 mt-3">{children}</ol>,
          li: ({ children }) => <li className="mb-2">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 pl-4 italic text-slate-600 dark:text-slate-300">{children}</blockquote>
          ),
          code: ({ className, children, ...props }) => {
            const language = className?.toString().replace("language-", "") || "";
            const isInline = !language;
            if (isInline) {
              return (
                <code {...props} className="rounded bg-slate-200 px-1.5 py-0.5 text-[0.95em] dark:bg-slate-800">
                  {children}
                </code>
              );
            }
            return (
              <pre className="my-4 overflow-auto rounded bg-slate-900/5 p-4 dark:bg-slate-800">
                <code {...props} className={className} data-language={language}>
                  {children}
                </code>
              </pre>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}