import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Send, 
  Mail, 
  Search, 
  Plus,
  User,
  Check,
  CheckCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";
import type { Message, User as UserType } from "@shared/schema";

interface MessageWithUser extends Message {
  sender?: UserType;
  receiver?: UserType;
}

interface Conversation {
  partnerId: string;
  partner: UserType;
  messages: MessageWithUser[];
  lastMessage: MessageWithUser;
  unreadCount: number;
}

export default function MessagesPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [composeDialogOpen, setComposeDialogOpen] = useState(false);
  const [newMessage, setNewMessage] = useState({
    recipientId: "",
    content: "",
  });
  const [replyContent, setReplyContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: inboxMessages, isLoading: loadingInbox } = useQuery<MessageWithUser[]>({
    queryKey: ["/api/messages", "inbox"],
    queryFn: async () => {
      const response = await fetch("/api/messages?type=inbox", {
        credentials: "include",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("authToken")}`
        }
      });
      if (!response.ok) throw new Error("Failed to fetch messages");
      return response.json();
    }
  });

  const { data: sentMessages, isLoading: loadingSent } = useQuery<MessageWithUser[]>({
    queryKey: ["/api/messages", "sent"],
    queryFn: async () => {
      const response = await fetch("/api/messages?type=sent", {
        credentials: "include",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("authToken")}`
        }
      });
      if (!response.ok) throw new Error("Failed to fetch messages");
      return response.json();
    }
  });

  const { data: recipients } = useQuery<UserType[]>({
    queryKey: ["/api/messages/recipients"],
  });

  const markReadMutation = useMutation({
    mutationFn: async (messageId: string) => {
      return apiRequest("PATCH", `/api/messages/${messageId}/read`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
    }
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { receiverId: string; content: string }) => {
      return apiRequest("POST", "/api/messages", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      toast({ title: t("messages.messageSent") });
      setComposeDialogOpen(false);
      setNewMessage({ recipientId: "", content: "" });
      setReplyContent("");
    },
    onError: () => {
      toast({ title: t("messages.sendFailed"), variant: "destructive" });
    }
  });

  const conversations: Conversation[] = (() => {
    if (!inboxMessages || !sentMessages || !currentUser) return [];

    const allMessages = [...inboxMessages, ...sentMessages];
    const conversationMap = new Map<string, Conversation>();

    allMessages.forEach(msg => {
      const partnerId = msg.senderId === currentUser.id ? msg.receiverId : msg.senderId;
      const partner = msg.senderId === currentUser.id ? msg.receiver : msg.sender;

      if (!partner) return;

      if (!conversationMap.has(partnerId)) {
        conversationMap.set(partnerId, {
          partnerId,
          partner,
          messages: [],
          lastMessage: msg,
          unreadCount: 0,
        });
      }

      const conv = conversationMap.get(partnerId)!;
      conv.messages.push(msg);

      if (new Date(msg.createdAt) > new Date(conv.lastMessage.createdAt)) {
        conv.lastMessage = msg;
      }

      if (msg.receiverId === currentUser.id && !msg.isRead) {
        conv.unreadCount++;
      }
    });

    conversationMap.forEach(conv => {
      conv.messages.sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    });

    return Array.from(conversationMap.values()).sort((a, b) =>
      new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime()
    );
  })();

  const filteredConversations = conversations.filter((conv) => {
    const searchLower = searchQuery.toLowerCase();
    const partnerName = `${conv.partner.firstName} ${conv.partner.lastName}`.toLowerCase();
    return (
      partnerName.includes(searchLower) ||
      conv.messages.some(msg => 
        msg.content.toLowerCase().includes(searchLower)
      )
    );
  });

  useEffect(() => {
    if (selectedConversation) {
      const updated = conversations.find(c => c.partnerId === selectedConversation.partnerId);
      if (updated) {
        setSelectedConversation(updated);
        updated.messages.forEach(msg => {
          if (msg.receiverId === currentUser?.id && !msg.isRead) {
            markReadMutation.mutate(msg.id);
          }
        });
      }
    }
  }, [inboxMessages, sentMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedConversation?.messages.length]);

  const formatDate = (date: string | Date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (days === 1) {
      return "Yesterday";
    } else if (days < 7) {
      return d.toLocaleDateString([], { weekday: "short" });
    } else {
      return d.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  };

  const formatMessageTime = (date: string | Date) => {
    const d = new Date(date);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    
    if (isToday) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString([], { 
      month: "short", 
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const handleSendMessage = () => {
    if (!newMessage.recipientId || !newMessage.content) {
      toast({ title: t("messages.fillRequired"), variant: "destructive" });
      return;
    }
    sendMessageMutation.mutate({
      receiverId: newMessage.recipientId,
      content: newMessage.content
    });
  };

  const handleSendReply = () => {
    if (!replyContent.trim() || !selectedConversation) {
      toast({ title: t("messages.fillRequired"), variant: "destructive" });
      return;
    }
    sendMessageMutation.mutate({
      receiverId: selectedConversation.partnerId,
      content: replyContent
    });
    setReplyContent("");
  };

  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConversation(conv);
    conv.messages.forEach(msg => {
      if (msg.receiverId === currentUser?.id && !msg.isRead) {
        markReadMutation.mutate(msg.id);
      }
    });
  };

  const isLoading = loadingInbox || loadingSent;

  return (
    <div className="flex h-full">
      <div className="w-80 border-r flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h1 className="text-xl font-semibold" data-testid="text-messages-title">
              {t("messages.title")}
            </h1>
            <Button
              size="icon"
              onClick={() => setComposeDialogOpen(true)}
              data-testid="button-compose-message"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("messages.search")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-messages"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-3 mb-1">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-24 mb-2" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  </div>
                </div>
              ))
            ) : !filteredConversations.length ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Mail className="h-10 w-10 mb-3" />
                <p className="text-sm">{t("messages.noMessages")}</p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = selectedConversation?.partnerId === conv.partnerId;
                const hasUnread = conv.unreadCount > 0;

                return (
                  <button
                    key={conv.partnerId}
                    className={`w-full text-left p-3 rounded-md mb-1 hover-elevate active-elevate-2 transition-colors ${
                      isSelected ? "bg-accent" : ""
                    } ${hasUnread ? "bg-primary/5" : ""}`}
                    onClick={() => handleSelectConversation(conv)}
                    data-testid={`conversation-item-${conv.partnerId}`}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="text-xs">
                          {conv.partner.firstName?.[0]}{conv.partner.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-sm truncate ${hasUnread ? "font-semibold" : ""}`}>
                            {conv.partner.firstName} {conv.partner.lastName}
                          </span>
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {formatDate(conv.lastMessage.createdAt)}
                          </span>
                        </div>
                        <p className={`text-xs truncate ${hasUnread ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                          {conv.lastMessage.senderId === currentUser?.id && (
                            <span className="text-muted-foreground">You: </span>
                          )}
                          {conv.lastMessage.content}
                        </p>
                      </div>
                      {hasUnread && (
                        <Badge variant="default" className="h-5 min-w-5 px-1.5 text-xs">
                          {conv.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            <div className="p-4 border-b">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>
                    {selectedConversation.partner.firstName?.[0]}{selectedConversation.partner.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium" data-testid="text-conversation-partner">
                    {selectedConversation.partner.firstName} {selectedConversation.partner.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedConversation.partner.email}
                  </p>
                </div>
              </div>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {selectedConversation.messages.map((msg) => {
                  const isMine = msg.senderId === currentUser?.id;

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                      data-testid={`message-${msg.id}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg px-4 py-2 ${
                          isMine
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        <div className={`flex items-center justify-end gap-1 mt-1 ${isMine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                          <span className="text-xs">
                            {formatMessageTime(msg.createdAt)}
                          </span>
                          {isMine && (
                            msg.isRead ? (
                              <CheckCheck className="h-3 w-3" />
                            ) : (
                              <Check className="h-3 w-3" />
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Textarea
                  placeholder={t("messages.typeMessage")}
                  className="resize-none"
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendReply();
                    }
                  }}
                  data-testid="input-reply-message"
                />
                <Button 
                  size="icon" 
                  onClick={handleSendReply}
                  disabled={!replyContent.trim() || sendMessageMutation.isPending}
                  data-testid="button-send-reply"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <Mail className="h-16 w-16 mb-4" />
            <p className="text-lg">{t("messages.selectConversation")}</p>
            <p className="text-sm mt-2">{t("messages.startNewConversation")}</p>
            <Button
              className="mt-4"
              onClick={() => setComposeDialogOpen(true)}
              data-testid="button-start-conversation"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t("messages.newMessage")}
            </Button>
          </div>
        )}
      </div>

      <Dialog open={composeDialogOpen} onOpenChange={setComposeDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("messages.newMessage")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">{t("messages.to")}</label>
              <Select
                value={newMessage.recipientId}
                onValueChange={(v) => setNewMessage({ ...newMessage, recipientId: v })}
              >
                <SelectTrigger data-testid="select-recipient">
                  <SelectValue placeholder={t("messages.selectRecipient")} />
                </SelectTrigger>
                <SelectContent>
                  {recipients?.map((recipient) => (
                    <SelectItem key={recipient.id} value={recipient.id}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {recipient.firstName} {recipient.lastName}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">{t("messages.message")}</label>
              <Textarea
                value={newMessage.content}
                onChange={(e) => setNewMessage({ ...newMessage, content: e.target.value })}
                placeholder={t("messages.message")}
                rows={6}
                className="resize-none"
                data-testid="input-message-content"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setComposeDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSendMessage} data-testid="button-send-message">
              <Send className="h-4 w-4 mr-2" />
              {t("messages.send")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
