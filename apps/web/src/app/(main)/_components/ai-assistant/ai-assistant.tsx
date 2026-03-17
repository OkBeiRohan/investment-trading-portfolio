"use client";

import { ArrowUpRight, Send } from "lucide-react";
import type { AIMessage } from "../../_types";
import styles from "./ai-assistant.module.css";

function formatContent(text: string) {
  return text.split("\n").map((line, i) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return (
      <span key={i}>
        {parts.map((part, j) =>
          part.startsWith("**") && part.endsWith("**") ? (
            <strong key={j}>{part.slice(2, -2)}</strong>
          ) : (
            part
          )
        )}
        {i < text.split("\n").length - 1 && <br />}
      </span>
    );
  });
}

export function AIAssistant({ messages }: { messages: AIMessage[] }) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.sparkle}>✦</span>
        <h3 className={styles.title}>AI Assistant</h3>
        <button
          type="button"
          className={styles.expandBtn}
          aria-label="Expand"
        >
          <ArrowUpRight size={18} />
        </button>
      </div>

      <div className={styles.messages}>
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
      </div>

      <div className={styles.categories}>
        <button type="button" className={styles.categoryBtn}>
          GPT-4o
        </button>
        <button type="button" className={styles.categoryBtn}>
          Financial AI
        </button>
        <button type="button" className={styles.categoryBtn}>
          Candle Analyst
        </button>
      </div>

      <div className={styles.inputRow}>
        <input
          type="text"
          placeholder="Enter Task for AI Assistant"
          className={styles.input}
        />
        <button type="button" className={styles.sendBtn} aria-label="Send">
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
