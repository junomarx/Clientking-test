import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChangePasswordDialog } from "@/components/auth/ChangePasswordDialog";
import { useAuth } from "@/hooks/use-auth";
import { User } from "lucide-react";

export function UserSettingsTab() {
  const [isChangePasswordDialogOpen, setIsChangePasswordDialogOpen] = useState(false);
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <User className="h-5 w-5" />
            Benutzerprofil
          </CardTitle>
          <CardDescription>
            Verwalten Sie Ihre persönlichen Benutzereinstellungen und Sicherheitsoptionen.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Benutzerinformationen */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-2">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Benutzername</h3>
                <p className="mt-1">{user?.username}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">E-Mail-Adresse</h3>
                <p className="mt-1">{user?.email}</p>
              </div>
            </div>
          </div>

          {/* Sicherheitsoptionen */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-base font-medium">Sicherheit</h3>
            <Button 
              variant="outline" 
              onClick={() => setIsChangePasswordDialogOpen(true)}
            >
              Passwort ändern
            </Button>
          </div>
        </CardContent>
      </Card>

      <ChangePasswordDialog 
        open={isChangePasswordDialogOpen}
        onOpenChange={setIsChangePasswordDialogOpen}
      />
    </div>
  );
}