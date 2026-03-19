"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  FileText,
  Mic,
  Plus,
  Send,
} from "lucide-react";
import type { AIMessage, AIKnowledgeEntry } from "../../_types";
import styles from "./ai-assistant.module.css";

const MODEL_TAGS = ["GPT-4o", "Document AI", "Financial AI", "Candle Analyst"] as const;

const DEFAULT_RESPONSE =
  "I don't have a specific answer for that in my knowledge base. For portfolio-related questions, you can ask about your holdings, performance metrics, risk analysis, or trading strategies. How can I help you today?";

function parseBold(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, j) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={j}>{part.slice(2, -2)}</strong>
    ) : (
      part
    )
  );
}

function formatContent(text: string): React.ReactNode {
  const lines = text.split("\n");
  const result: React.ReactNode[] = [];
  let listItems: string[] = [];
  let keyIdx = 0;

  const flushList = () => {
    if (listItems.length > 0) {
      result.push(
        <ul key={keyIdx++} className={styles.bulletList}>
          {listItems.map((item, i) => (
            <li key={i}>{parseBold(item)}</li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("•") || trimmed.startsWith("- ")) {
      flushList();
      listItems.push(trimmed.replace(/^[•\-]\s*/, "").trim());
    } else {
      flushList();
      result.push(
        <span key={keyIdx++}>
          {parseBold(line)}
        </span>
      );
      result.push(<br key={keyIdx++} />);
    }
  }
  flushList();
  const last = result[result.length - 1];
  if (result.length > 0 && last != null && typeof last === "object" && "type" in last && last.type === "br") {
    result.pop();
  }
  return result;
}

function matchKnowledge(query: string, knowledge: AIKnowledgeEntry[]): string | null {
  const q = query.toLowerCase().trim();
  if (!q || knowledge.length === 0) return null;

  let bestMatch: AIKnowledgeEntry | null = null;
  let bestScore = 0;

  for (const entry of knowledge) {
    let score = 0;
    for (const kw of entry.keywords) {
      if (q.includes(kw.toLowerCase())) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = entry;
    }
  }

  return bestScore > 0 && bestMatch ? bestMatch.response : null;
}

export interface AIAssistantProps {
  initialMessages: AIMessage[];
  knowledge: AIKnowledgeEntry[];
}

export function AIAssistant({ initialMessages, knowledge }: AIAssistantProps) {
  const [messages, setMessages] = useState<AIMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [activeTag, setActiveTag] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    chatRef.current?.scrollTo({
      top: chatRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isTyping) return;

    const userMsg: AIMessage = {
      id: Date.now().toString(),
      role: "user",
      content: trimmed,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    const delay = 600 + Math.random() * 800;
    setTimeout(() => {
      const response = matchKnowledge(trimmed, knowledge) ?? DEFAULT_RESPONSE;
      const aiMsg: AIMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
    }, delay);
  }, [input, isTyping, knowledge]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.sparkle}>✦</span>
        <h3 className={styles.title}>AI Assistant</h3>
        <button
          type="button"
          className={styles.iconBtn}
          aria-label="Documents"
        >
          <FileText size={18} />
        </button>
        <button
          type="button"
          className={styles.iconBtn}
          aria-label="Expand"
        >
          <ArrowUpRight size={18} />
        </button>
      </div>

      <div ref={chatRef} className={styles.chatArea}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={
              msg.role === "user" ? styles.messageUser : styles.messageAssistant
            }
          >
            {msg.role === "assistant"
              ? formatContent(msg.content)
              : msg.content}
          </div>
        ))}
        {isTyping && (
          <div className={styles.typingIndicator}>
            <span className={styles.typingDot} />
            <span className={styles.typingDot} />
            <span className={styles.typingDot} />
          </div>
        )}
      </div>

      <div className={styles.modelTags}>
        {MODEL_TAGS.map((tag, i) => (
          <button
            key={tag}
            type="button"
            className={activeTag === i ? styles.tagActive : styles.tag}
            onClick={() => setActiveTag(i)}
          >
            {tag}
          </button>
        ))}
      </div>

      <div className={styles.inputBar}>
        <button
          type="button"
          className={styles.plusBtn}
          aria-label="Add attachment"
        >
          <Plus size={18} />
        </button>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter Task for AI Assistant"
          className={styles.input}
          disabled={isTyping}
        />
        <button
          type="button"
          className={styles.micBtn}
          aria-label="Voice input"
        >
          <Mic size={18} />
        </button>
        <button
          type="button"
          className={styles.sendBtn}
          onClick={handleSend}
          disabled={!input.trim() || isTyping}
          aria-label="Send"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
