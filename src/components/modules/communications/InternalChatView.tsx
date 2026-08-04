"use client";

import React, { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { MessageSquare, PlusCircle, Pin, Send, Lock, Hash, ExternalLink, AlertCircle, Loader2 } from "lucide-react";
import { communicationsApi, ChatChannel, ChatMessage } from "@/services/communicationsApi";
import { CreateChannelModal } from "./CreateChannelModal";

export function InternalChatView() {
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<ChatChannel | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoadingChannels, setIsLoadingChannels] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadChannels = async () => {
    try {
      setIsLoadingChannels(true);
      setError(null);
      const data = await communicationsApi.getChannels();
      setChannels(data);
      if (data.length > 0 && !selectedChannel) {
        setSelectedChannel(data[0]);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Chat channels could not be loaded");
    } finally {
      setIsLoadingChannels(false);
    }
  };

  const loadMessages = async (channelId: string) => {
    try {
      setIsLoadingMessages(true);
      const data = await communicationsApi.getMessages(channelId);
      setMessages(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Channel messages could not be loaded");
    } finally {
      setIsLoadingMessages(false);
    }
  };

  useEffect(() => {
    loadChannels();
  }, []);

  useEffect(() => {
    if (selectedChannel) {
      loadMessages(selectedChannel.id);
    }
  }, [selectedChannel]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !selectedChannel) return;

    try {
      setIsSending(true);
      const sent = await communicationsApi.sendMessage({
        channelId: selectedChannel.id,
        senderName: "Operations Officer",
        senderRole: "HQ Operations",
        content: inputMessage,
      });
      setMessages((prev) => [...prev, sent]);
      setInputMessage("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Message could not be saved");
    } finally {
      setIsSending(false);
    }
  };

  if (isLoadingChannels) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-muted-foreground space-y-2 bg-card rounded-lg border border-border">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span>Loading workplace channels and message feeds...</span>
      </div>
    );
  }

  if (error) {
    return (
      <CorporateEmptyState
        title="Chat Engine Unreachable"
        description={error}
        actionLabel="Retry Connection"
        onAction={loadChannels}
        icon={AlertCircle}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-lg border border-border shadow-xs">
        <div>
          <h3 className="text-sm font-bold font-heading text-foreground">
            Workplace Messaging & Cross-Department Coordination
          </h3>
        </div>

        <Button size="sm" className="gap-1.5 text-xs font-semibold shrink-0" onClick={() => setIsModalOpen(true)}>
          <PlusCircle className="h-4 w-4" />
          Create Channel
        </Button>
      </div>

      {channels.length === 0 ? (
        <CorporateEmptyState
          title="No Communication Channels Found"
          description="No active workplace chat channels exist. Create a new channel for site engineers, finance approvals, or legal compliance to begin collaborating."
          actionLabel="Create Channel"
          onAction={() => setIsModalOpen(true)}
          icon={MessageSquare}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-[600px] border border-border rounded-lg bg-card overflow-hidden">
          <div className="md:col-span-1 border-r border-border bg-muted/20 flex flex-col">
            <div className="p-3 border-b border-border font-bold text-xs text-foreground flex items-center justify-between">
              <span>Department Channels</span>
              <Badge variant="outline" className="text-[10px] border-border">{channels.length}</Badge>
            </div>

            <ScrollArea className="flex-1 p-2">
              <div className="space-y-1">
                {channels.map((ch) => {
                  const isSelected = selectedChannel?.id === ch.id;
                  return (
                    <button
                      key={ch.id}
                      onClick={() => setSelectedChannel(ch)}
                      className={`w-full text-left p-2.5 rounded text-xs transition-colors flex items-center justify-between ${
                        isSelected
                          ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                          : "hover:bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {ch.isPrivate ? (
                          <Lock className="h-3.5 w-3.5 shrink-0" />
                        ) : (
                          <Hash className="h-3.5 w-3.5 shrink-0" />
                        )}
                        <span className="truncate">{ch.channelName}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          <div className="md:col-span-3 flex flex-col bg-card">
            {selectedChannel ? (
              <>
                <div className="p-3 border-b border-border flex items-center justify-between bg-muted/10">
                  <div>
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Hash className="h-4 w-4 text-primary" />
                      {selectedChannel.channelName}
                    </h4>
                    <p className="text-[11px] text-muted-foreground">{selectedChannel.description || selectedChannel.department}</p>
                  </div>

                  <Badge variant="outline" className="text-[10px]">
                    {selectedChannel.memberCount} Members
                  </Badge>
                </div>

                <ScrollArea className="flex-1 p-4">
                  {isLoadingMessages ? (
                    <div className="flex flex-col items-center justify-center p-8 text-xs text-muted-foreground space-y-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Loading message history...</span>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-12 text-xs text-muted-foreground space-y-1">
                      <p className="font-semibold text-foreground">Channel Created</p>
                      <p>No messages posted yet in this channel. Send a message to start conversation.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((msg) => (
                        <div key={msg.id} className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-foreground">{msg.senderName}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">({msg.senderRole})</span>
                            <span className="text-[10px] text-muted-foreground font-mono ml-auto">
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            {msg.isPinned && (
                              <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-900 border-amber-300 gap-1">
                                <Pin className="h-2.5 w-2.5" /> Pinned
                              </Badge>
                            )}
                          </div>

                          <div className="p-3 rounded-lg bg-muted/30 border border-border text-xs text-foreground space-y-2">
                            <p className="whitespace-pre-wrap">{msg.content}</p>

                            {msg.actionLinkUrl && (
                              <div className="pt-2 border-t border-border/50">
                                <a
                                  href={msg.actionLinkUrl}
                                  className="inline-flex items-center gap-1.5 text-[11px] font-bold text-primary hover:underline bg-card px-2.5 py-1 rounded border border-border"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  <span>{msg.actionLinkLabel || "Open Associated ERP Record"}</span>
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>

                <form onSubmit={handleSendMessage} className="p-3 border-t border-border flex items-center gap-2 bg-muted/10">
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder={`Message #${selectedChannel.channelName}...`}
                    className="h-9 text-xs flex-1"
                  />
                  <Button type="submit" size="sm" className="h-9 px-3 gap-1 text-xs" disabled={isSending || !inputMessage.trim()}>
                    {isSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    Send
                  </Button>
                </form>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-xs text-muted-foreground">
                Select a channel from the left sidebar to view messages.
              </div>
            )}
          </div>
        </div>
      )}

      <CreateChannelModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={(newCh) => {
          setChannels((prev) => [newCh, ...prev]);
          setSelectedChannel(newCh);
        }}
      />
    </div>
  );
}
