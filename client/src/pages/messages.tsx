import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { 
  Send, 
  Inbox, 
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
import { Separator } from "@/components/ui/separator";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Message, User as UserType } from "@shared/schema";

interface MessageWithUser extends Message {
  sender?: UserType;
  receiver?: UserType;
}

export default function MessagesPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"inbox" | "sent">("inbox");
  const [selectedMessage, setSelectedMessage] = useState<MessageWithUser | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [composeDialogOpen, setComposeDialogOpen] = useState(false);
  const [newMessage, setNewMessage] = useState({
    recipientId: "",
    subject: "",
    content: "",
  });

  const { data: messages, isLoading: loadingMessages } = useQuery<MessageWithUser[]>({
    queryKey: ["/api/messages", activeTab],
  });

  const { data: users } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
  });

  const filteredMessages = messages?.filter((message) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      message.subject?.toLowerCase().includes(searchLower) ||
      message.content.toLowerCase().includes(searchLower)
    );
  });

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

  const handleSendMessage = () => {
    setComposeDialogOpen(false);
    setNewMessage({ recipientId: "", subject: "", content: "" });
  };

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
              placeholder={t("common.search")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-messages"
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "inbox" | "sent")} className="px-4 pt-2">
          <TabsList className="w-full">
            <TabsTrigger value="inbox" className="flex-1" data-testid="tab-inbox">
              <Inbox className="h-4 w-4 mr-2" />
              {t("messages.inbox")}
            </TabsTrigger>
            <TabsTrigger value="sent" className="flex-1" data-testid="tab-sent">
              <Send className="h-4 w-4 mr-2" />
              {t("messages.sent")}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <ScrollArea className="flex-1">
          <div className="p-2">
            {loadingMessages ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-3 mb-2">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-24 mb-2" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  </div>
                </div>
              ))
            ) : !filteredMessages?.length ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Mail className="h-10 w-10 mb-3" />
                <p className="text-sm">{t("messages.noMessages")}</p>
              </div>
            ) : (
              filteredMessages.map((message) => {
                const otherUser = activeTab === "inbox" ? message.sender : message.receiver;
                const isSelected = selectedMessage?.id === message.id;
                const isUnread = activeTab === "inbox" && !message.isRead;

                return (
                  <button
                    key={message.id}
                    className={`w-full text-left p-3 rounded-md mb-1 hover-elevate active-elevate-2 transition-colors ${
                      isSelected ? "bg-accent" : ""
                    } ${isUnread ? "bg-primary/5" : ""}`}
                    onClick={() => setSelectedMessage(message)}
                    data-testid={`message-item-${message.id}`}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="text-xs">
                          {otherUser?.firstName?.[0]}{otherUser?.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-sm truncate ${isUnread ? "font-semibold" : ""}`}>
                            {otherUser?.firstName} {otherUser?.lastName}
                          </span>
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {formatDate(message.createdAt)}
                          </span>
                        </div>
                        {message.subject && (
                          <p className={`text-sm truncate ${isUnread ? "font-medium" : "text-muted-foreground"}`}>
                            {message.subject}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground truncate">
                          {message.content}
                        </p>
                      </div>
                      {isUnread && (
                        <Badge variant="default" className="h-2 w-2 p-0 rounded-full" />
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
        {selectedMessage ? (
          <>
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>
                      {activeTab === "inbox"
                        ? `${selectedMessage.sender?.firstName?.[0]}${selectedMessage.sender?.lastName?.[0]}`
                        : `${selectedMessage.receiver?.firstName?.[0]}${selectedMessage.receiver?.lastName?.[0]}`}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium" data-testid="text-message-sender">
                      {activeTab === "inbox"
                        ? `${selectedMessage.sender?.firstName} ${selectedMessage.sender?.lastName}`
                        : `${selectedMessage.receiver?.firstName} ${selectedMessage.receiver?.lastName}`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(selectedMessage.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {activeTab === "sent" && (
                    selectedMessage.isRead ? (
                      <CheckCheck className="h-4 w-4 text-primary" />
                    ) : (
                      <Check className="h-4 w-4 text-muted-foreground" />
                    )
                  )}
                </div>
              </div>
              {selectedMessage.subject && (
                <h2 className="text-lg font-semibold mt-3" data-testid="text-message-subject">
                  {selectedMessage.subject}
                </h2>
              )}
            </div>

            <ScrollArea className="flex-1 p-6">
              <p className="whitespace-pre-wrap" data-testid="text-message-content">
                {selectedMessage.content}
              </p>
            </ScrollArea>

            {activeTab === "inbox" && (
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Textarea
                    placeholder={t("messages.reply")}
                    className="resize-none"
                    data-testid="input-reply-message"
                  />
                  <Button size="icon" data-testid="button-send-reply">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <Mail className="h-16 w-16 mb-4" />
            <p className="text-lg">Select a message to read</p>
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
                  {users?.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {user.firstName} {user.lastName}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">{t("messages.subject")}</label>
              <Input
                value={newMessage.subject}
                onChange={(e) => setNewMessage({ ...newMessage, subject: e.target.value })}
                placeholder={t("messages.subject")}
                data-testid="input-message-subject"
              />
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
