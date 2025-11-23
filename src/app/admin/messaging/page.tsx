"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { io, Socket } from "socket.io-client";
import "./messaging.css";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Phone, RefreshCw, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Image from "next/image";
import { fr } from "date-fns/locale";
import { clientEventTracker } from "@/lib/client-event-tracker";
import { hasPermission, PERMISSIONS } from "@/config/permissions";
import { validateWhatsAppNumber } from "@/lib/phone-validation";

interface Store {
  id: string;
  name: string;
  twilioCredential?: {
    id: string;
    name: string;
    customField1?: string;
  };
}

interface Conversation {
  contactNumber: string;
  contactName?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
}

interface Message {
  twilioSid: string;
  direction: "inbound" | "outbound";
  fromNumber: string;
  toNumber: string;
  body: string;
  status?: string;
  sentAt: string;
  receivedAt?: string;
  mediaUrl?: string;
  mediaType?: string;
  mediaSid?: string;
  hasMedia: boolean;
}

export default function MessagingPage() {
  const { data: session } = useSession();
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const [timeSinceLastRefresh, setTimeSinceLastRefresh] = useState<string>("");
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // No need to block global scroll - let the page handle its own scrolling

  const fetchStores = useCallback(async () => {
    try {
      const response = await fetch("/api/stores");
      if (response.ok) {
        const data = await response.json();
        setStores(data);
        if (data.length > 0) {
          setSelectedStore(data[0].id);
        }
      }
    } catch {
      // Error handled by toast
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchConversations = useCallback(
    async (page = 1, forceRefresh = true) => {
      if (!selectedStore) return;

      // Vérification des permissions
      if (!hasPermission(PERMISSIONS.WHATSAPP_CONVERSATIONS_VIEW)) {
        toast({
          title: "Accès refusé",
          description:
            "Vous n'avez pas la permission de voir les conversations",
          variant: "destructive",
        });
        return;
      }

      try {
        setRefreshing(true);
        const response = await fetch(
          `/api/conversations?storeId=${selectedStore}&page=${page}&limit=20&forceRefresh=${forceRefresh}`
        );

        if (response.ok) {
          const data = await response.json();
          setConversations(data.data || []);
          setCurrentPage(data.pagination?.currentPage || 1);
          setTotalPages(data.pagination?.totalPages || 1);
        } else {
          const error = await response.json();
          toast({
            title: "Erreur",
            description:
              error.error || "Erreur lors du chargement des conversations",
            variant: "destructive",
          });
        }
      } catch (err) {
        console.error("Erreur chargement conversations:", err);
        toast({
          title: "Erreur",
          description: "Erreur lors du chargement des conversations",
          variant: "destructive",
        });
      } finally {
        setRefreshing(false);
      }
    },
    [selectedStore, toast]
  );

  const fetchMessages = useCallback(async () => {
    if (!selectedStore || !selectedConversation) return;

    // Vérification des permissions
    if (!hasPermission(PERMISSIONS.WHATSAPP_MESSAGES_VIEW)) {
      toast({
        title: "Accès refusé",
        description: "Vous n'avez pas la permission de voir les messages",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoadingMessages(true);

      const response = await fetch(
        `/api/conversations/${selectedStore}/messages?contactNumber=${selectedConversation}&limit=30&forceRefresh=true`
      );

      if (response.ok) {
        const data = await response.json();

        setMessages(data.data || []);
      } else {
        const error = await response.json();
        console.error("Erreur chargement messages:", error);
        toast({
          title: "Erreur",
          description: error.error || "Erreur lors du chargement des messages",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Erreur chargement messages:", err);
      toast({
        title: "Erreur",
        description: "Erreur lors du chargement des messages",
        variant: "destructive",
      });
    } finally {
      setLoadingMessages(false);
    }
  }, [selectedStore, selectedConversation, toast]);

  // Charger les stores au montage
  useEffect(() => {
    fetchStores();
    setLastRefreshTime(new Date()); // Initialiser le temps de refresh
  }, [fetchStores]);

  // Charger les conversations quand un store est sélectionné
  useEffect(() => {
    if (selectedStore) {
      setCurrentPage(1);
      fetchConversations(1, true);
    }
  }, [selectedStore, fetchConversations]);

  // Charger les messages quand une conversation est sélectionnée
  useEffect(() => {
    if (selectedStore && selectedConversation) {
      fetchMessages();
    }
  }, [selectedStore, selectedConversation, fetchMessages]);

  // WebSocket connection for live message notifications
  useEffect(() => {
    if (!session?.user || !(session.user as { id?: string }).id) return;

    const socket: Socket = io({
      path: "/socket.io/",
    });

    socket.on("connect", () => {
      console.log("✅ Connected to WebSocket");
      // Join personal collaborateur/admin room
      socket.emit("join-room", `collaborateur:${(session.user as { id: string }).id}`);
    });

    socket.on("new-message", (data) => {
      console.log("💬 New message received via WebSocket:", data);

      // Show toast notification if not viewing this conversation
      if (data.storeId === selectedStore) {
        if (data.contactNumber !== selectedConversation) {
          toast({
            title: "💬 Nouveau message!",
            description: `De ${data.contactNumber}: ${data.message.substring(0, 50)}${data.message.length > 50 ? '...' : ''}`,
          });
        }

        // Refresh conversations to update unread count
        fetchConversations(currentPage, true);

        // If viewing this conversation, refresh messages
        if (data.contactNumber === selectedConversation) {
          fetchMessages();
        }
      }
    });

    socket.on("disconnect", () => {
      console.log("❌ Disconnected from WebSocket");
    });

    return () => {
      socket.disconnect();
    };
  }, [(session?.user as { id?: string })?.id, selectedStore, selectedConversation, currentPage, fetchConversations, fetchMessages, toast]);

  // Log pour debug
  useEffect(() => {}, [messages]);

  // Auto-scroll vers le bas quand les messages se chargent
  useEffect(() => {
    if (messages.length > 0) {
      // Petit délai pour laisser le temps au DOM de se mettre à jour
      setTimeout(() => {
        if (messagesScrollRef.current) {
          const scrollArea = messagesScrollRef.current.querySelector(
            "[data-radix-scroll-area-viewport]"
          );
          if (scrollArea) {
            scrollArea.scrollTop = scrollArea.scrollHeight;
          }
        }
      }, 200);
    }
  }, [messages]);

  // Actualisation automatique toutes les 5 minutes
  useEffect(() => {
    if (!selectedStore) return;

    const interval = setInterval(() => {
      setLastRefreshTime(new Date());
      fetchConversations(currentPage, true);

      if (selectedConversation) {
        fetchMessages();
      }
    }, 10 * 60 * 1000); // 10 minutes (optimisé pour VPS)

    return () => clearInterval(interval);
  }, [
    selectedStore,
    selectedConversation,
    currentPage,
    fetchConversations,
    fetchMessages,
  ]);

  // Mise à jour du temps écoulé depuis le dernier refresh
  useEffect(() => {
    if (!lastRefreshTime) return;

    const updateTime = () => {
      const now = new Date();
      const diffMs = now.getTime() - lastRefreshTime.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffSeconds = Math.floor((diffMs % (1000 * 60)) / 1000);

      if (diffMinutes > 0) {
        setTimeSinceLastRefresh(`${diffMinutes}m ${diffSeconds}s`);
      } else {
        setTimeSinceLastRefresh(`${diffSeconds}s`);
      }
    };

    // Mise à jour immédiate
    updateTime();

    // Mise à jour toutes les secondes
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, [lastRefreshTime]);

  const handleStoreChange = async (storeId: string) => {
    setSelectedStore(storeId);
    setSelectedConversation("");
    setMessages([]);

    // Event tracking
    await clientEventTracker.trackEvent({
      type: "MESSAGING_STORE_CHANGE",
      title: "Changement de store",
      description: `Store sélectionné pour la messagerie`,
      metadata: { storeId },
    });
  };

  const handleConversationClick = (contactNumber: string) => {
    setSelectedConversation(contactNumber);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    fetchConversations(newPage, false);
  };

  const handleRefresh = () => {
    setLastRefreshTime(new Date());
    fetchConversations(currentPage, true);
  };

  // Envoyer un message
  const sendMessage = async () => {
    // Vérification des permissions
    if (!hasPermission(PERMISSIONS.WHATSAPP_MESSAGES_SEND)) {
      toast({
        title: "Accès refusé",
        description: "Vous n'avez pas la permission d'envoyer des messages",
        variant: "destructive",
      });
      return;
    }

    if (!newMessage.trim() || !selectedStore || !selectedConversation) {
      toast({
        title: "Erreur",
        description:
          "Veuillez sélectionner une conversation et saisir un message",
        variant: "destructive",
      });
      return;
    }

    // Validation du numéro de téléphone
    const phoneValidation = validateWhatsAppNumber(selectedConversation);
    if (!phoneValidation.isValid) {
      toast({
        title: "Numéro invalide",
        description: phoneValidation.error || "Format de numéro invalide",
        variant: "destructive",
      });
      return;
    }

    // Validation de la longueur du message
    if (newMessage.trim().length > 1000) {
      toast({
        title: "Message trop long",
        description: "Le message ne peut pas dépasser 1000 caractères",
        variant: "destructive",
      });
      return;
    }

    try {
      setSendingMessage(true);

      // Récupérer les credentials du store
      const store = stores.find((s) => s.id === selectedStore);
      if (!store?.twilioCredential) {
        throw new Error("Aucune credential Twilio configurée pour ce store");
      }

      const response = await fetch("/api/twilio/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          credentialId: store.twilioCredential.id,
          to: selectedConversation,
          message: newMessage.trim(),
          type: "whatsapp",
        }),
      });

      if (response.ok) {
        // Event tracking
        await clientEventTracker.trackEvent({
          type: "MESSAGING_MESSAGE_SENT",
          title: "Message WhatsApp envoyé",
          description: `Message envoyé à ${selectedConversation}`,
          metadata: {
            contactNumber: selectedConversation,
            storeId: selectedStore,
            messageLength: newMessage.trim().length,
          },
        });

        toast({
          title: "Message envoyé",
          description: "Message WhatsApp envoyé avec succès",
        });

        // Vider le champ et rafraîchir les messages
        setNewMessage("");
        await fetchMessages();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur lors de l'envoi");
      }
    } catch (err) {
      // Event tracking pour les erreurs
      await clientEventTracker.trackEvent({
        type: "MESSAGING_MESSAGE_ERROR",
        title: "Erreur envoi message",
        description: `Erreur lors de l'envoi du message à ${selectedConversation}`,
        metadata: {
          contactNumber: selectedConversation,
          storeId: selectedStore,
          error: err instanceof Error ? err.message : "Erreur inconnue",
        },
      });

      toast({
        title: "Erreur d'envoi",
        description:
          err instanceof Error
            ? err.message
            : "Erreur lors de l'envoi du message",
        variant: "destructive",
      });
    } finally {
      setSendingMessage(false);
    }
  };

  // Gérer l'envoi avec Enter
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatPhoneNumber = (phone: string) => {
    // Formater le numéro pour l'affichage
    return phone
      .replace("+", "")
      .replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, "$1 $2 $3 $4 $5");
  };

  const getInitials = (contactNumber: string) => {
    return contactNumber.slice(-2);
  };

  const renderMedia = (message: Message) => {
    if (!message.hasMedia || !message.mediaUrl || !message.mediaType) {
      return null;
    }

    const isImage = message.mediaType.startsWith("image/");
    const isVideo = message.mediaType.startsWith("video/");
    const isAudio = message.mediaType.startsWith("audio/");
    const isDocument =
      message.mediaType.includes("pdf") ||
      message.mediaType.includes("document") ||
      message.mediaType.includes("sheet") ||
      message.mediaType.includes("presentation");

    if (isImage) {
      return (
        <div className="mt-2">
          <Image
            src={message.mediaUrl}
            alt="Image"
            width={300}
            height={200}
            className="max-w-xs rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => window.open(message.mediaUrl, "_blank")}
          />
        </div>
      );
    }

    if (isVideo) {
      return (
        <div className="mt-2">
          <video
            src={message.mediaUrl}
            controls
            className="max-w-xs rounded-lg"
          >
            Votre navigateur ne supporte pas la lecture vidéo.
          </video>
        </div>
      );
    }

    if (isAudio) {
      return (
        <div className="mt-2">
          <div className="bg-gray-100 rounded-lg p-3 max-w-xs">
            <audio
              src={message.mediaUrl}
              controls
              className="w-full"
              onLoadedMetadata={(e) => {
                const audio = e.target as HTMLAudioElement;
                const duration = audio.duration;
                const minutes = Math.floor(duration / 60);
                const seconds = Math.floor(duration % 60);
                const durationText = `${minutes}:${seconds
                  .toString()
                  .padStart(2, "0")}`;

                // Mettre à jour l'affichage de la durée
                const durationElement =
                  audio.parentElement?.querySelector(".audio-duration");
                if (durationElement) {
                  durationElement.textContent = durationText;
                }
              }}
            >
              Votre navigateur ne supporte pas la lecture audio.
            </audio>
            <div className="audio-duration text-xs text-gray-500 mt-1 text-center">
              Chargement...
            </div>
          </div>
        </div>
      );
    }

    if (isDocument) {
      return (
        <div className="mt-2">
          <a
            href={message.mediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors"
          >
            📄 Document ({message.mediaType.split("/")[1]?.toUpperCase()})
          </a>
        </div>
      );
    }

    // Autres types de médias
    return (
      <div className="mt-2">
        <a
          href={message.mediaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors"
        >
          📎 Fichier ({message.mediaType.split("/")[1]?.toUpperCase()})
        </a>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Chargement des stores...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden messaging-page">
      <div className="container mx-auto p-6 h-full flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Messagerie WhatsApp
              </h1>
              <p className="text-gray-600 mt-2">
                Gérez vos conversations WhatsApp par store
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>
                    Auto-refresh:{" "}
                    {timeSinceLastRefresh
                      ? `il y a ${timeSinceLastRefresh}`
                      : "10min"}
                  </span>
                </div>
                <div className="text-xs text-gray-400">Optimisé VPS</div>
              </div>
              <Select value={selectedStore} onValueChange={handleStoreChange}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Sélectionner un store" />
                </SelectTrigger>
                <SelectContent>
                  {stores.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      <div className="flex items-center space-x-2">
                        <MessageSquare className="h-4 w-4 text-green-600" />
                        <span>{store.name}</span>
                        {store.twilioCredential?.customField1 && (
                          <span className="text-xs text-gray-500">
                            ({store.twilioCredential.customField1})
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleRefresh}
                disabled={refreshing}
                variant="outline"
                size="sm"
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
                />
                Actualiser
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full overflow-hidden">
            {/* Conversations List */}
            <Card className="lg:col-span-1 h-full flex flex-col overflow-hidden">
              <CardHeader className="flex-shrink-0">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <MessageSquare className="h-5 w-5 text-green-600" />
                    <span>Conversations</span>
                    {conversations.length > 0 && (
                      <Badge variant="secondary">{conversations.length}</Badge>
                    )}
                  </div>
                  {totalPages > 1 && (
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">
                        Page {currentPage} sur {totalPages}
                      </span>
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  {conversations.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      <p>Aucune conversation récente</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {conversations.map((conv) => (
                        <div
                          key={conv.contactNumber}
                          onClick={() =>
                            handleConversationClick(conv.contactNumber)
                          }
                          className={`p-4 cursor-pointer hover:bg-gray-50 border-l-4 transition-colors ${
                            selectedConversation === conv.contactNumber
                              ? "border-green-500 bg-green-50"
                              : "border-transparent"
                          }`}
                        >
                          <div className="flex items-start space-x-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="bg-green-100 text-green-700">
                                {getInitials(conv.contactNumber)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {conv.contactName ||
                                    formatPhoneNumber(conv.contactNumber)}
                                </p>
                                {conv.unreadCount > 0 && (
                                  <Badge
                                    variant="destructive"
                                    className="text-xs"
                                  >
                                    {conv.unreadCount}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-500 truncate">
                                {conv.lastMessage}
                              </p>
                              {conv.lastMessageAt && (
                                <p className="text-xs text-gray-400">
                                  {formatDistanceToNow(
                                    new Date(conv.lastMessageAt),
                                    {
                                      addSuffix: true,
                                      locale: fr,
                                    }
                                  )}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t bg-gray-50">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage <= 1 || refreshing}
                  >
                    Précédent
                  </Button>
                  <div className="flex items-center space-x-2">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = Math.max(1, currentPage - 2) + i;
                      if (pageNum > totalPages) return null;
                      return (
                        <Button
                          key={pageNum}
                          variant={
                            pageNum === currentPage ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() => handlePageChange(pageNum)}
                          disabled={refreshing}
                          className="w-8 h-8 p-0"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages || refreshing}
                  >
                    Suivant
                  </Button>
                </div>
              )}
            </Card>

            {/* Messages */}
            <Card className="lg:col-span-2 h-full flex flex-col overflow-hidden">
              <CardHeader className="flex-shrink-0">
                <CardTitle className="flex items-center space-x-2">
                  <Phone className="h-5 w-5 text-green-600" />
                  <span>
                    {selectedConversation
                      ? `Messages avec ${formatPhoneNumber(
                          selectedConversation
                        )}`
                      : "Sélectionnez une conversation"}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-hidden">
                <ScrollArea ref={messagesScrollRef} className="h-full">
                  {!selectedConversation ? (
                    <div className="p-8 text-center text-gray-500">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg">Sélectionnez une conversation</p>
                      <p className="text-sm">pour voir les messages</p>
                    </div>
                  ) : loadingMessages ? (
                    <div className="p-8 text-center">
                      <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
                      <p>Chargement des messages...</p>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      <p>Aucun message dans cette conversation</p>
                    </div>
                  ) : (
                    <div className="p-4 space-y-4">
                      {messages.map((message) => (
                        <div
                          key={message.twilioSid}
                          className={`flex ${
                            message.direction === "outbound"
                              ? "justify-end"
                              : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                              message.direction === "outbound"
                                ? "bg-green-500 text-white"
                                : "bg-gray-100 text-gray-900"
                            }`}
                          >
                            {message.body && (
                              <p className="text-sm">{message.body}</p>
                            )}
                            {renderMedia(message)}
                            <div className="flex items-center justify-between mt-1">
                              <p className="text-xs opacity-70">
                                {formatDistanceToNow(new Date(message.sentAt), {
                                  addSuffix: true,
                                  locale: fr,
                                })}
                              </p>
                              {message.direction === "outbound" && (
                                <div className="flex items-center space-x-1">
                                  {message.status === "delivered" && (
                                    <span className="text-xs">✓✓</span>
                                  )}
                                  {message.status === "sent" && (
                                    <span className="text-xs">✓</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>

              {/* Zone d'envoi de message */}
              {selectedConversation && (
                <div className="border-t bg-white p-4">
                  <div className="flex gap-2">
                    <Textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Tapez votre message..."
                      className="flex-1 min-h-[40px] max-h-[120px] resize-none"
                      disabled={sendingMessage}
                    />
                    <Button
                      onClick={sendMessage}
                      disabled={!newMessage.trim() || sendingMessage}
                      className="px-6"
                    >
                      {sendingMessage ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Envoi...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Send className="w-4 h-4" />
                          Envoyer
                        </div>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
