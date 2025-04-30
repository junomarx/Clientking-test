import React from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ToastTestDialog({ open, onOpenChange }: Props) {
  const { toast } = useToast();

  // Toast-Beispielfunktionen
  const showDefaultToast = () => {
    toast({
      title: "Standard Toast",
      description: "Das ist ein Standard-Toast ohne besondere Formatierung"
    });
  };

  const showSuccessToast = () => {
    toast.success({
      title: "Erfolgreich!",
      description: "Der Vorgang wurde erfolgreich abgeschlossen"
    });
  };

  const showInfoToast = () => {
    toast.info({
      title: "Information",
      description: "Hier ist eine wichtige Information für Sie"
    });
  };

  const showWarningToast = () => {
    toast.warning({
      title: "Warnung",
      description: "Bitte beachten Sie diese wichtige Warnung"
    });
  };

  const showErrorToast = () => {
    toast.error({
      title: "Fehler",
      description: "Es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut."
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Toast-Benachrichtigungen Test</DialogTitle>
          <DialogDescription>
            Klicken Sie auf die Buttons, um verschiedene Toast-Benachrichtigungen zu testen.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid grid-cols-1 gap-2">
            <Button onClick={showDefaultToast}>Standard Toast anzeigen</Button>
            <Button onClick={showSuccessToast} className="bg-green-600 hover:bg-green-700">
              Erfolgs-Toast anzeigen
            </Button>
            <Button onClick={showInfoToast} className="bg-blue-600 hover:bg-blue-700">
              Info-Toast anzeigen
            </Button>
            <Button onClick={showWarningToast} className="bg-yellow-600 hover:bg-yellow-700 text-white">
              Warnungs-Toast anzeigen
            </Button>
            <Button onClick={showErrorToast} className="bg-red-600 hover:bg-red-700">
              Fehler-Toast anzeigen
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
