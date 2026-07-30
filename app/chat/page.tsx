"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Send, Plus, LayoutDashboard, Loader2, Paperclip } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CartSidebar } from "@/components/chat/cart-sidebar";
import { isImageMessage, imageUrlFromMessage } from "@/lib/format";
import type { CartDetails } from "@/lib/types";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  menuImage?: boolean;
  imageUrl?: string;
}

function newUserId() {
  return "web:" + crypto.randomUUID();
}

const GREETING: ChatMessage = {
  role: "assistant",
  content:
    "Hi! Welcome to Juicito 🍔 I'm JuicitoBot. What would you like to order today?",
};

export default function ChatPage() {
  const [userId, setUserId] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cart, setCart] = useState<CartDetails | null>(null);
  const [phase, setPhase] = useState("greeting");
  const [orderId, setOrderId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Establish user id, then restore prior session (history + cart).
  useEffect(() => {
    let id = localStorage.getItem("juicito_user_id");
    if (!id) {
      id = newUserId();
      localStorage.setItem("juicito_user_id", id);
    }
    setUserId(id);

    (async () => {
      try {
        const res = await fetch(`/api/session?user_id=${encodeURIComponent(id)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data.messages) && data.messages.length > 0) {
          setMessages(
            data.messages.map((m: { role: string; content: string }) => {
              if (isImageMessage(m.content)) {
                return {
                  role: "user" as const,
                  content: "",
                  imageUrl: imageUrlFromMessage(m.content),
                };
              }
              return {
                role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
                content: m.content,
              };
            })
          );
        }
        setCart(data.cart ?? null);
        setPhase(data.phase ?? "greeting");
        if (data.last_order?.id) setOrderId(data.last_order.id);
      } catch {
        /* first-time user — keep greeting */
      }
    })();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading, uploading]);

  async function send() {
    const text = input.trim();
    if (!text || loading || uploading || !userId) return;

    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, message: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");

      setMessages((m) => [
        ...m,
        { role: "assistant", content: data.reply, menuImage: data.menu_image },
      ]);
      setCart(data.cart ?? null);
      setPhase(data.phase ?? "ordering");
      if (data.order_id) setOrderId(data.order_id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      toast.error(msg);
      setMessages((m) => [...m, { role: "assistant", content: `⚠️ ${msg}` }]);
    } finally {
      setLoading(false);
    }
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file || uploading || loading || !userId) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }

    const preview = URL.createObjectURL(file);
    setMessages((m) => [...m, { role: "user", content: "", imageUrl: preview }]);
    setUploading(true);

    try {
      const form = new FormData();
      form.append("user_id", userId);
      form.append("file", file);
      const res = await fetch("/api/payment", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
      if (data.order_id) {
        setOrderId(data.order_id);
        setPhase("complete");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      toast.error(msg);
      setMessages((m) => [...m, { role: "assistant", content: `⚠️ ${msg}` }]);
    } finally {
      setUploading(false);
    }
  }

  function newChat() {
    const id = newUserId();
    localStorage.setItem("juicito_user_id", id);
    setUserId(id);
    setMessages([GREETING]);
    setCart(null);
    setPhase("greeting");
    setOrderId(null);
    toast.success("Started a new chat");
  }

  const busy = loading || uploading;

  return (
    <div className="mx-auto flex h-screen max-w-6xl flex-col p-3 md:p-6">
      {/* Header */}
      <header className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-lg text-primary-foreground">
            🍔
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">Juicito</h1>
            <p className="text-xs text-muted-foreground">Order by chat · Islamabad</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={newChat}>
            <Plus className="h-4 w-4" /> New Chat
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin">
              <LayoutDashboard className="h-4 w-4" /> Admin
            </Link>
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col-reverse gap-4 md:flex-row">
        {/* Chat panel */}
        <div className="flex min-h-0 flex-1 flex-col rounded-xl border bg-card shadow-sm">
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                    m.role === "user"
                      ? "rounded-br-sm bg-primary text-primary-foreground"
                      : "rounded-bl-sm bg-muted text-foreground"
                  }`}
                >
                  {m.content && <p className="whitespace-pre-wrap">{m.content}</p>}
                  {m.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.imageUrl}
                      alt="Payment screenshot"
                      className="mt-1 max-h-56 rounded-lg border"
                    />
                  )}
                  {m.menuImage && (
                    <Image
                      src="/menu.png"
                      alt="Juicito menu"
                      width={320}
                      height={320}
                      className="mt-2 rounded-lg border"
                    />
                  )}
                </div>
              </div>
            ))}

            {busy && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm bg-muted px-4 py-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {uploading ? "Uploading screenshot…" : "JuicitoBot is typing…"}
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 border-t p-3">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onPickFile}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              title="Send payment screenshot"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Type your order… e.g. 'I want a zinger roll and a mango lassi'"
              disabled={busy}
            />
            <Button onClick={send} disabled={busy || !input.trim()} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Cart sidebar */}
        <CartSidebar cart={cart} phase={phase} orderId={orderId} />
      </div>
    </div>
  );
}
