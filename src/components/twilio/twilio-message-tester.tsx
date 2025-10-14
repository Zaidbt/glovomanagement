"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Send, MessageSquare, CheckCircle, XCircle, Clock } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface TwilioMessageTesterProps {
  credentialId: string;
  instanceName: string;
  phoneNumber?: string;
  accountSid?: string;
  authToken?: string;
}

interface MessageResult {
  success: boolean;
  message: string;
  data?: {
    sid: string;
    status: string;
    to: string;
    from: string;
    body: string;
    dateCreated: string;
  };
}

export function TwilioMessageTester({
  credentialId,
  phoneNumber,
  accountSid,
  authToken,
}: TwilioMessageTesterProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [to, setTo] = useState("");
  const [from, setFrom] = useState(phoneNumber || "");
  const [templateSid, setTemplateSid] = useState("");
  const [templateParams] = useState<Record<string, string>>({
    "1": "bonjour ceci est un test de natura beldi",
  });
  const [lastResult, setLastResult] = useState<MessageResult | null>(null);
  const { toast } = useToast();

  // Mettre à jour le numéro quand il change
  React.useEffect(() => {
    if (phoneNumber) {
      setFrom(phoneNumber);
    }
  }, [phoneNumber]);

  const handleSendMessage = async () => {
    console.log("🔍 Testeur - Début envoi message");
    console.log("🔍 Testeur - CredentialId:", credentialId);
    console.log("🔍 Testeur - To:", to);
    console.log("🔍 Testeur - From:", from);
    console.log("🔍 Testeur - TemplateSid:", templateSid);

    if (!to || !from || !templateSid) {
      console.log("❌ Testeur - Champs manquants");
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setLastResult(null);

    try {
      const messageData: Record<string, unknown> = {
        credentialId,
        to,
        from,
        type: "whatsapp",
        templateSid: templateSid,
        templateParams: templateParams,
        // Utiliser les credentials du formulaire
        accountSid: accountSid,
        authToken: authToken,
      };

      console.log("🔍 Testeur - MessageData:", messageData);

      const response = await fetch("/api/twilio/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messageData),
      });

      const result = await response.json();
      setLastResult(result);

      if (result.success) {
        toast({
          title: "Message envoyé",
          description: "Message WhatsApp envoyé avec succès",
        });
      } else {
        toast({
          title: "Erreur",
          description: result.message || "Erreur lors de l&apos;envoi",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Erreur envoi message:", error);
      toast({
        title: "Erreur",
        description: "Erreur de connexion",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case "sent":
      case "delivered":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
      case "undelivered":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "queued":
      case "sending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "sent":
      case "delivered":
        return "bg-green-100 text-green-800 border-green-200";
      case "failed":
      case "undelivered":
        return "bg-red-100 text-red-800 border-red-200";
      case "queued":
      case "sending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-green-500" />
          Test d&apos;envoi WhatsApp
        </CardTitle>
        <p className="text-sm text-gray-600 mt-2">
          💡 Utilisez votre Content Template SID pour envoyer des messages
          WhatsApp.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4">
          <div>
            <Label htmlFor="from">De (votre numéro)</Label>
            <Input
              id="from"
              placeholder="+212XXXXXXXXX"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="to">À (numéro destinataire)</Label>
            <Input
              id="to"
              placeholder="+212XXXXXXXXX"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="templateSid">Content Template SID</Label>
            <Input
              id="templateSid"
              placeholder="HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              value={templateSid}
              onChange={(e) => setTemplateSid(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">
              SID du template WhatsApp approuvé (commence par HX...)
            </p>
          </div>

          <Button
            onClick={handleSendMessage}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Envoyer le message
              </>
            )}
          </Button>
        </div>

        {lastResult && (
          <div className="mt-4 p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Résultat de l&apos;envoi</span>
              {lastResult.success ? (
                <Badge className="bg-green-100 text-green-800 border-green-200">
                  Succès
                </Badge>
              ) : (
                <Badge className="bg-red-100 text-red-800 border-red-200">
                  Échec
                </Badge>
              )}
            </div>

            {lastResult.success && lastResult.data && (
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  {getStatusIcon(lastResult.data.status)}
                  <span>Statut: </span>
                  <Badge className={getStatusColor(lastResult.data.status)}>
                    {lastResult.data.status}
                  </Badge>
                </div>
                <div>
                  <span className="font-medium">Message ID:</span>{" "}
                  {lastResult.data.sid}
                </div>
                <div>
                  <span className="font-medium">Envoyé à:</span>{" "}
                  {lastResult.data.to}
                </div>
                <div>
                  <span className="font-medium">Envoyé de:</span>{" "}
                  {lastResult.data.from}
                </div>
                <div>
                  <span className="font-medium">Date:</span>{" "}
                  {new Date(lastResult.data.dateCreated).toLocaleString()}
                </div>
              </div>
            )}

            {!lastResult.success && (
              <div className="text-sm text-red-600">
                <span className="font-medium">Erreur:</span>{" "}
                {lastResult.message}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
