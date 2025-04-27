import React from "react";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";

export default function ForgotPasswordPage() {
  const { user, isLoading } = useAuth();

  // Wenn bereits angemeldet, zur Startseite weiterleiten
  if (!isLoading && user) {
    return <Redirect to="/" />;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Handyshop Verwaltung</h1>
          <p className="text-gray-600 mt-2">Passwort zurücksetzen</p>
        </div>
        <ForgotPasswordForm />
      </div>
    </div>
  );
}