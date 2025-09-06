import React from "react";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";

export default function ResetPasswordPage() {
  const { user, isLoading } = useAuth();
  
  // Get token from URL search params
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  // Wenn bereits angemeldet, zur Startseite weiterleiten
  if (!isLoading && user) {
    return <Redirect to="/" />;
  }

  // Wenn kein Token vorhanden ist, zur "Passwort vergessen"-Seite weiterleiten
  if (!token) {
    return <Redirect to="/forgot-password" />;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Handyshop Verwaltung</h1>
          <p className="text-gray-600 mt-2">Neues Passwort festlegen</p>
        </div>
        <ResetPasswordForm token={token} />
      </div>
    </div>
  );
}