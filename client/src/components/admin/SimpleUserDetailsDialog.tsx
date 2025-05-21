import { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DeleteConfirmDialog } from '@/components/ui/DeleteConfirmDialog';
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Pencil, ThumbsUp, Trash2 } from "lucide-react";

interface UserDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  userId: number | null;
  onToggleActive?: (userId: number) => void;
  onEdit?: (userId: number) => void;
  onDelete?: (userId: number) => void;
}

type UserResponse = {
  id: number;
  username: string;
  email: string;
  isActive: boolean;
  isAdmin: boolean;
};

export function SimpleUserDetailsDialog({ open, onClose, userId, onToggleActive, onEdit, onDelete }: UserDetailsDialogProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const { data: user, isLoading, isError, error } = useQuery<UserResponse, Error>({
    queryKey: [`/api/superadmin/users/${userId}`],
    queryFn: async () => {
      if (!userId) return null;
      const res = await apiRequest('GET', `/api/superadmin/users/${userId}`);
      return res.json();
    },
    enabled: !!userId && open
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async (userId: number) => {
      const action = user?.isActive ? 'deactivate' : 'activate';
      const res = await apiRequest('POST', `/api/superadmin/users/${userId}/${action}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/users'] });
      queryClient.invalidateQueries({ queryKey: [`/api/superadmin/users/${userId}`] });
      toast({
        title: user?.isActive ? "Benutzer deaktiviert" : "Benutzer aktiviert",
        description: `Der Benutzer wurde erfolgreich ${user?.isActive ? 'deaktiviert' : 'aktiviert'}.`,
      });
      if (onToggleActive && userId) {
        onToggleActive(userId);
      }
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      setIsDeleting(true);
      const res = await apiRequest('DELETE', `/api/superadmin/users/${userId}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Fehler beim Löschen des Benutzers');
      }
      return true;
    },
    onSuccess: () => {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/users'] });
      toast({
        title: "Benutzer gelöscht",
        description: "Der Benutzer wurde erfolgreich gelöscht.",
      });
      onClose();
      if (onDelete && userId) {
        onDelete(userId);
      }
    },
    onError: (error: any) => {
      setIsDeleting(false);
      toast({
        title: "Fehler beim Löschen des Benutzers",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleClose = () => {
    onClose();
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent>
          <div className="flex justify-center my-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (isError) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fehler</DialogTitle>
            <DialogDescription>
              Beim Laden der Benutzerdaten ist ein Fehler aufgetreten: {error?.message}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Schließen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      {showDeleteDialog && user && (
        <DeleteConfirmDialog
          open={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          onConfirm={() => {
            if (userId) deleteUserMutation.mutate(userId);
          }}
          title="Benutzer löschen"
          description={`Sind Sie sicher, dass Sie den Benutzer ${user.username} löschen möchten? Alle zugehörigen Daten werden ebenfalls gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.`}
          isDeleting={isDeleting}
          itemName="Benutzer"
        />
      )}
      
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[600px]">
          {user && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <DialogTitle className="text-xl">{user.username}</DialogTitle>
                    <DialogDescription className="text-sm mt-1">
                      {user.isAdmin ? (
                        <Badge className="mr-2">Admin</Badge>
                      ) : (
                        <Badge variant="outline" className="mr-2">Benutzer</Badge>
                      )}
                      {user.isActive ? (
                        <Badge variant="default" className="bg-green-600">Aktiv</Badge>
                      ) : (
                        <Badge variant="destructive">Inaktiv</Badge>
                      )}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="py-4">
                <h3 className="text-lg font-medium">Benutzerinformationen</h3>
                <p className="mt-2 text-sm">E-Mail: {user.email}</p>
              </div>
              
              <DialogFooter className="gap-2 flex-col sm:flex-row">
                <Button variant="outline" onClick={handleClose}>
                  Schließen
                </Button>
                {onEdit && (
                  <Button 
                    variant="outline" 
                    onClick={() => onEdit(user.id)}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Bearbeiten
                  </Button>
                )}
                {onToggleActive && (
                  <Button
                    variant={user.isActive ? "outline" : "default"}
                    onClick={() => toggleActiveMutation.mutate(user.id)}
                    disabled={toggleActiveMutation.isPending}
                  >
                    {toggleActiveMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <ThumbsUp className="h-4 w-4 mr-2" />
                    )}
                    {user.isActive ? "Deaktivieren" : "Aktivieren"}
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="destructive"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Löschen
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}