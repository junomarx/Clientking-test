import React, { useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { RepairDetailsDialog } from '@/components/repairs/RepairDetailsDialog';

export default function RepairDetailsPage() {
  const { repairId } = useParams();
  const [, setLocation] = useLocation();

  // Wenn die Dialog geschlossen wird, zur Hauptseite zurück
  const handleClose = () => {
    setLocation('/');
  };

  return (
    <RepairDetailsDialog
      open={true}
      onClose={handleClose}
      repairId={repairId ? parseInt(repairId) : null}
    />
  );
}