"use client"

import * as React from "react"
import { useState, useEffect, useRef } from "react";
import { Lightbulb, Mic, Globe, Paperclip, Send } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const PLACEHOLDERS = [
  "Generate website with HextaUI",
  "Create a new project with Next.js",
  "What is the meaning of life?",
  "What is the best way to learn React?",
  "How to cook a delicious meal?",
  "Summarize this article",
];

// Messages/history panel
const ChatHistory = ({ messages, isAssistantThinking }) => {
  const listRef = useRef(null);
  const endRef = useRef(null);

  useEffect(() => {
    if (!listRef.current || !endRef.current) return;
    endRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages, isAssistantThinking]);

  return (
    <div className="w-full max-w-3xl mx-auto flex-1 px-4 pt-4 overflow-y-auto" ref={listRef} style={{ minHeight: 0 }}>
      <div className="flex flex-col gap-3">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`${m.role === "user" ? "bg-black text-white" : "bg-gray-100 text-gray-900"} px-3 py-2 rounded-2xl max-w-[85%] whitespace-pre-wrap`}
            >
              {m.content}
            </div>
          </div>
        ))}

        {isAssistantThinking && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-900 px-3 py-2 rounded-2xl">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Thinking</span>
                <motion.span className="inline-flex gap-1" initial={{ opacity: 0.4 }} animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1, repeat: Infinity }}>
                  <span>•</span>
                  <span>•</span>
                  <span>•</span>
                </motion.span>
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
};

// Input/composer panel
const ChatComposer = ({ onSend }) => {
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [showPlaceholder, setShowPlaceholder] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const [thinkActive, setThinkActive] = useState(false);
  const [deepSearchActive, setDeepSearchActive] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const wrapperRef = useRef(null);

  // Cycle placeholder text when input is inactive
  useEffect(() => {
    if (isActive || inputValue) return;
    const interval = setInterval(() => {
      setShowPlaceholder(false);
      setTimeout(() => {
        setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDERS.length);
        setShowPlaceholder(true);
      }, 400);
    }, 3000);
    return () => clearInterval(interval);
  }, [isActive, inputValue]);

  // Close input when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        if (!inputValue) setIsActive(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [inputValue]);

  const placeholderContainerVariants = {
    initial: {},
    animate: { transition: { staggerChildren: 0.025 } },
    exit: { transition: { staggerChildren: 0.015, staggerDirection: -1 } },
  };

  const letterVariants = {
    initial: { opacity: 0, filter: "blur(12px)", y: 10 },
    animate: {
      opacity: 1,
      filter: "blur(0px)",
      y: 0,
      transition: {
        opacity: { duration: 0.25 },
        filter: { duration: 0.4 },
        y: { type: "spring", stiffness: 80, damping: 20 },
      },
    },
    exit: { opacity: 0, filter: "blur(12px)", y: -10, transition: { opacity: { duration: 0.2 }, filter: { duration: 0.3 }, y: { type: "spring", stiffness: 80, damping: 20 } } },
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-4" ref={wrapperRef}>
      {/* Input Row */}
      <div className="flex items-center gap-2 p-3 rounded-full bg-white shadow-sm w-full">
        <button className="p-3 rounded-full hover:bg-gray-100 transition" title="Attach file" type="button" tabIndex={-1}>
          <Paperclip size={20} />
        </button>

        {/* Text Input & Placeholder */}
        <div className="relative flex-1" onClick={() => setIsActive(true)}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="flex-1 border-0 outline-0 rounded-md py-2 text-base bg-transparent w-full font-normal"
            style={{ position: "relative", zIndex: 1 }}
            onFocus={() => setIsActive(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const text = inputValue.trim();
                if (!text) return;
                onSend(text);
                setInputValue("");
                setIsActive(true);
              }
            }}
            placeholder=""
          />
          <div className="absolute left-0 top-0 w-full h-full pointer-events-none flex items-center px-3 py-2">
            <AnimatePresence mode="wait">
              {showPlaceholder && !isActive && !inputValue && (
                <motion.span
                  key={placeholderIndex}
                  className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-400 select-none pointer-events-none"
                  style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", zIndex: 0 }}
                  variants={placeholderContainerVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                >
                  {PLACEHOLDERS[placeholderIndex].split("").map((char, i) => (
                    <motion.span key={i} variants={letterVariants} style={{ display: "inline-block" }}>
                      {char === " " ? "\u00A0" : char}
                    </motion.span>
                  ))}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>

        <button className="p-3 rounded-full hover:bg-gray-100 transition" title="Voice input" type="button" tabIndex={-1}>
          <Mic size={20} />
        </button>
        <button
          className="flex items-center gap-1 bg-black hover:bg-zinc-700 text-white p-3 rounded-full font-medium justify-center"
          title="Send"
          type="button"
          tabIndex={-1}
          onClick={(e) => {
            e.stopPropagation();
            const text = inputValue.trim();
            if (!text) return;
            onSend(text);
            setInputValue("");
            setIsActive(true);
          }}
        >
          <Send size={18} />
        </button>
      </div>

      {/* Expanded Controls */}
      <motion.div
        className="w-full flex justify-start px-2 items-center text-sm"
        variants={{
          hidden: { opacity: 0, y: 12, pointerEvents: "none", transition: { duration: 0.2 } },
          visible: { opacity: 1, y: 0, pointerEvents: "auto", transition: { duration: 0.3, delay: 0.05 } },
        }}
        initial="hidden"
        animate={isActive || inputValue ? "visible" : "hidden"}
        style={{ marginTop: 8 }}
      >
        <div className="flex gap-3 items-center">
          <button
            className={`flex items-center gap-1 px-4 py-2 rounded-full transition-all font-medium group ${
              thinkActive ? "bg-blue-600/10 outline outline-blue-600/60 text-blue-950" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
            title="Think"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setThinkActive((a) => !a);
            }}
          >
            <Lightbulb className="group-hover:fill-yellow-300 transition-all" size={18} />
            Think
          </button>

          <motion.button
            className={`flex items-center px-4 gap-1 py-2 rounded-full transition font-medium whitespace-nowrap overflow-hidden justify-start  ${
              deepSearchActive ? "bg-blue-600/10 outline outline-blue-600/60 text-blue-950" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
            title="Deep Search"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDeepSearchActive((a) => !a);
            }}
            initial={false}
            animate={{ width: deepSearchActive ? 125 : 36, paddingLeft: deepSearchActive ? 8 : 9 }}
          >
            <div className="flex-1">
              <Globe size={18} />
            </div>
            <motion.span className="pb-[2px]" initial={false} animate={{ opacity: deepSearchActive ? 1 : 0 }}>
              Deep Search
            </motion.span>
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};

// Outer container component that maintains chat history state
const AIChatInput = () => {
  // messages: { id: number, role: 'user' | 'assistant', content: string }
  const [messages, setMessages] = useState([]);
  const [isAssistantThinking, setIsAssistantThinking] = useState(false);

  const handleSend = (text) => {
    // Add user message
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), role: "user", content: text },
    ]);

    // Simulate assistant thinking and replying
    setIsAssistantThinking(true);
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: "assistant", content: "[ai response]" },
      ]);
      setIsAssistantThinking(false);
    }, 900);
  };

  return (
    <div className="w-full min-h-screen flex flex-col items-center text-black">
      {/* History area */}
      <div className="flex-1 w-full flex">
        <ChatHistory messages={messages} isAssistantThinking={isAssistantThinking} />
      </div>

      {/* Composer area */}
      <ChatComposer onSend={handleSend} />
    </div>
  );
};

export default AIChatInput;