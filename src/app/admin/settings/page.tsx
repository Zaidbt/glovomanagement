"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Clock, Save, AlertCircle } from "lucide-react";

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Settings state
  const [preparationAlertMinutes, setPreparationAlertMinutes] = useState("5");
  const [pickupAlertMinutes, setPickupAlertMinutes] = useState("5");

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/settings");

      if (response.ok) {
        const data = await response.json();

        // Set values from API or use defaults
        const prepAlert = data.settings.find((s: { key: string }) => s.key === "preparation_alert_minutes");
        const pickAlert = data.settings.find((s: { key: string }) => s.key === "pickup_alert_minutes");

        if (prepAlert) setPreparationAlertMinutes(prepAlert.value);
        if (pickAlert) setPickupAlertMinutes(pickAlert.value);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const settings = [
        {
          key: "preparation_alert_minutes",
          value: preparationAlertMinutes,
          description: "Délai d'alerte pour préparation commande (minutes)"
        },
        {
          key: "pickup_alert_minutes",
          value: pickupAlertMinutes,
          description: "Délai d'alerte pour récupération panier (minutes)"
        }
      ];

      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });

      if (response.ok) {
        toast({
          title: "✅ Paramètres sauvegardés",
          description: "Les délais d'alerte ont été mis à jour",
        });
      } else {
        throw new Error("Failed to save settings");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les paramètres",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des paramètres...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Paramètres Système</h1>
        <p className="text-gray-600">Configuration des alertes et délais</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Délais d&apos;Alerte
          </CardTitle>
          <CardDescription>
            Configurez les délais pour les alertes visuelles (cards rouges)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Preparation Alert */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 mt-1" />
              <div className="flex-1">
                <Label htmlFor="prep-alert" className="text-base font-semibold">
                  Alerte Préparation Fournisseur
                </Label>
                <p className="text-sm text-gray-600 mt-1">
                  Temps maximum avant qu&apos;une commande non préparée devienne ROUGE
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 ml-8">
              <Input
                id="prep-alert"
                type="number"
                min="1"
                max="60"
                value={preparationAlertMinutes}
                onChange={(e) => setPreparationAlertMinutes(e.target.value)}
                className="w-24"
              />
              <span className="text-gray-600">minutes</span>
            </div>
            <div className="ml-8 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">
                🔴 Les commandes reçues il y a plus de <strong>{preparationAlertMinutes} minutes</strong> sans préparation seront affichées en ROUGE chez le fournisseur
              </p>
            </div>
          </div>

          {/* Pickup Alert */}
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 mt-1" />
              <div className="flex-1">
                <Label htmlFor="pickup-alert" className="text-base font-semibold">
                  Alerte Récupération Collaborateur
                </Label>
                <p className="text-sm text-gray-600 mt-1">
                  Temps maximum avant qu&apos;un panier prêt non récupéré devienne ROUGE
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 ml-8">
              <Input
                id="pickup-alert"
                type="number"
                min="1"
                max="60"
                value={pickupAlertMinutes}
                onChange={(e) => setPickupAlertMinutes(e.target.value)}
                className="w-24"
              />
              <span className="text-gray-600">minutes</span>
            </div>
            <div className="ml-8 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">
                🔴 Les paniers prêts depuis plus de <strong>{pickupAlertMinutes} minutes</strong> non récupérés seront affichés en ROUGE chez le collaborateur
              </p>
            </div>
          </div>

          {/* Blue Alert Info */}
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 bg-blue-500 rounded-full mt-1"></div>
              <div className="flex-1">
                <Label className="text-base font-semibold">
                  Alerte Récupération Complétée
                </Label>
                <p className="text-sm text-gray-600 mt-1">
                  Les commandes récupérées par le collaborateur
                </p>
              </div>
            </div>
            <div className="ml-8 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                🔵 Les commandes dont les paniers ont été récupérés seront affichées en BLEU
              </p>
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-4 border-t">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full sm:w-auto"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Sauvegarde..." : "Sauvegarder les Paramètres"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-2">Comment ça marche ?</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Ajustez les délais selon vos besoins (weekends, rush hours, etc.)</li>
                <li>Les couleurs s&apos;appliquent automatiquement en temps réel</li>
                <li>Rouge = Urgence / Bleu = Complété / Normal = En cours</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
