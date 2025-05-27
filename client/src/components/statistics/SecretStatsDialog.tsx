import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { StatisticsTabRebuilt } from './StatisticsTabRebuilt';

interface SecretStatsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SecretStatsDialog({ open, onClose }: SecretStatsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Erweiterte Statistiken</DialogTitle>
        </DialogHeader>
        
        {/* Render the full statistics component */}
        <div className="mt-4">
          <StatisticsTabRebuilt />
        </div>
      </DialogContent>
    </Dialog>
  );
}