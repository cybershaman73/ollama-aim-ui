/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
import type { ChatMessage } from "../context/ChatContext";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

// Helper function to parse message content and extract <think> blocks.
const parseMessageContent = (content: string) => {
  // This regex extracts everything between <think> and </think> (including newlines).
  const thinkRegex = /<think>([\s\S]*?)<\/think>/i;
  const match = content.match(thinkRegex);
  let reasoningContent = "";
  let mainContent = content;
  if (match) {
    reasoningContent = match[1].trim();
    // Optionally remove the reasoning block from the main content.
    mainContent = content.replace(thinkRegex, "").trim();
  }
  return { mainContent, reasoningContent };
};

// Helper function to preprocess LaTeX content
const preprocessLaTeX = (content: string) => {
  // Process bracketed LaTeX expressions like: [ \boxed{1} ]
  // Convert to proper math format: $\boxed{1}$
  return content.replace(/\[ *(\\[a-zA-Z]+\{[^}]*\}) *\]/g, '$$$1$$');
};

interface ChatBubbleProps {
  message: ChatMessage;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const [accordionOpen, setAccordionOpen] = useState(false);
  const isUser = message.role === "user";
  const { mainContent: rawMainContent, reasoningContent: rawReasoningContent } = parseMessageContent(message.content || "");
  
  // Preprocess LaTeX in content
  const mainContent = preprocessLaTeX(rawMainContent);
  const reasoningContent = preprocessLaTeX(rawReasoningContent);

  // Determine where to place the streaming indicator
  // If reasoning is currently being streamed, show it in the reasoning section
  // Otherwise, show it in the main content
  const isStreamingReasoning = message.isStreaming && reasoningContent;
  const isStreamingMainContent = message.isStreaming && !isStreamingReasoning;

  return (
    <div 
      className={`p-3 rounded-lg mb-3 ${
        isUser 
          ? 'bg-slate-900 ml-4 md:ml-8 mr-2' 
          : 'bg-slate-900/25 mr-4 md:mr-8 ml-2'
      }`}
      data-testid={`${isUser ? 'user' : 'assistant'}-message`}
    >
      <div className="font-semibold mb-1 text-slate-300">
        {isUser ? 'You' : 'Agent'}
      </div>
      
              {/* Accordion toggler and block for reasoning content */}
              {(reasoningContent || isStreamingReasoning) && (
          <div className="mt-2">
            <button
              onClick={() => setAccordionOpen(!accordionOpen)}
              className="text-sm font-medium text-slate-400 hover:text-slate-200 focus:outline-none"
              data-testid="accordion-toggle"
            >
              {accordionOpen ? "Hide thinking process" : "Show thinking process"}
            </button>
            {accordionOpen && (
              <div className="mt-2 p-2 rounded border border-dotted border-slate-500 bg-slate-800 text-slate-300 italic">
                {isStreamingReasoning ? (
                  <div className="flex">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkMath]}
                      rehypePlugins={[rehypeKatex]}
                      components={{
                        code({ inline, className, children, ...props}: any) {
                          const match = /language-(\w+)/.exec(className || "");
                          return !inline && match ? (
                            <SyntaxHighlighter
                              style={oneDark}
                              language={match[1]}
                              PreTag="div"
                              {...props}
                            >
                              {String(children).replace(/\n$/, "")}
                            </SyntaxHighlighter>
                          ) : (
                            <code className={className} {...props}>
                              {children}
                            </code>
                          );
                        }
                      }}
                    >
                      {reasoningContent}
                    </ReactMarkdown>
                    <span className="animate-pulse text-slate-300" data-testid="streaming-indicator">▌</span>
                  </div>
                ) : (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={{
                      code({inline, className, children, ...props}: any) {
                        const match = /language-(\w+)/.exec(className || "");
                        return !inline && match ? (
                          <SyntaxHighlighter
                            style={oneDark}
                            language={match[1]}
                            PreTag="div"
                            {...props}
                          >
                            {String(children).replace(/\n$/, "")}
                          </SyntaxHighlighter>
                        ) : (
                          <code className={className} {...props}>
                            {children}
                          </code>
                        );
                      }
                    }}
                  >
                    {reasoningContent}
                  </ReactMarkdown>
                )}
              </div>
            )}
          </div>
        )}

      {/* Main content with markdown and math rendering */}
      <div className="text-slate-50 break-words">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex]}
          components={{
            code({ inline, className, children, ...props}: any) {
              const match = /language-(\w+)/.exec(className || "");
              return !inline && match ? (
                <SyntaxHighlighter
                  style={oneDark}
                  language={match[1]}
                  PreTag="div"
                  {...props}
                >
                  {String(children).replace(/\n$/, "")}
                </SyntaxHighlighter>
              ) : (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            }
          }}
        >
          {mainContent || " "}
        </ReactMarkdown>
        
        {isStreamingMainContent && (
          <span className="animate-pulse text-slate-300" data-testid="streaming-indicator">▌</span>
        )}
      
      </div>
    </div>
  );
};

export default ChatBubble;