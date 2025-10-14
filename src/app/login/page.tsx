"use client";

import { useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { ExtendedSession } from "@/lib/auth";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Identifiants invalides");
        setLoading(false);
        return;
      }

      // Get session to determine redirect
      const session = await getSession() as unknown as ExtendedSession | null;
      if (session?.user?.role) {
        switch (session.user.role) {
          case "ADMIN":
            router.push("/admin");
            break;
          case "COLLABORATEUR":
            router.push("/collaborateur");
            break;
          case "FOURNISSEUR":
            router.push("/fournisseur");
            break;
          default:
            router.push("/");
        }
      }
    } catch {
      setError("Une erreur est survenue");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen natura-bg flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Pattern */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2310b981' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      ></div>

      {/* Floating Elements */}
      <div className="absolute top-20 left-20 w-32 h-32 bg-green-100 rounded-full opacity-20 animate-pulse"></div>
      <div className="absolute bottom-20 right-20 w-24 h-24 bg-green-200 rounded-full opacity-20 animate-pulse delay-1000"></div>
      <div className="absolute top-1/2 left-10 w-16 h-16 bg-green-300 rounded-full opacity-20 animate-pulse delay-500"></div>

      <div className="relative z-10 w-full max-w-md">
        <Card className="natura-card natura-glass border-0 shadow-2xl">
          <CardHeader className="text-center space-y-4 pb-8">
            <div className="mx-auto w-16 h-16 natura-gradient rounded-full flex items-center justify-center shadow-lg">
              <span className="text-2xl font-bold text-white">N</span>
            </div>
            <div>
              <CardTitle className="text-3xl font-bold natura-text-gradient">
                Natura Beldi
              </CardTitle>
              <CardDescription className="text-gray-600 mt-2">
                Système de gestion multi-stores
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert
                  variant="destructive"
                  className="border-red-200 bg-red-50"
                >
                  <AlertDescription className="text-red-800">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label
                  htmlFor="username"
                  className="text-sm font-medium text-gray-700"
                >
                  Nom d&apos;utilisateur
                </Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={loading}
                  className="natura-input h-12"
                  placeholder="Entrez votre nom d'utilisateur"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-sm font-medium text-gray-700"
                >
                  Mot de passe
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="natura-input h-12"
                  placeholder="Entrez votre mot de passe"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 natura-button text-base font-semibold natura-hover"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Connexion...</span>
                  </div>
                ) : (
                  "Se connecter"
                )}
              </Button>
            </form>

            <div className="mt-8 p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-800 text-center">
                <strong>Compte admin:</strong> Natura.beldi / Natura5600
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
