import React from 'react';
import ResponsiveDevicesTab from '@/components/superadmin/ResponsiveDevicesTab';
import { Toaster } from '@/components/ui/toaster';

export default function ResponsiveDevicesDemo() {
  return (
    <div className="container mx-auto p-4">
      <ResponsiveDevicesTab />
      <Toaster />
    </div>
  );
}