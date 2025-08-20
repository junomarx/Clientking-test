import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useMultiShopPermissions } from '@/hooks/use-multi-shop-permissions';
import { 
  Building2, 
  User, 
  Shield, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Info,
  Eye,
  FileText
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

interface PendingRequest {
  id: number;
  userId: number;
  multiShopAdminId: number;
  shopId: number;
  status: 'pending' | 'approved' | 'denied';
  requestReason: string;
  adminUsername: string;
  adminEmail?: string;
  createdAt: string;
  updatedAt: string;
}

interface ShopOwnerPermissionDialogProps {
  request: PendingRequest | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove?: (requestId: number, comment?: string) => void;
  onDeny?: (requestId: number, reason: string) => void;
}

/**
 * DSGVO-konformer Permission Dialog für Shop Owner
 * Ermöglicht detaillierte Kontrolle über Multi-Shop Admin Zugriffe
 */
export function ShopOwnerPermissionDialog({
  request,
  isOpen,
  onClose,
  onApprove,
  onDeny
}: ShopOwnerPermissionDialogProps) {
  const { toast } = useToast();
  const [approvalComment, setApprovalComment] = useState('');
  const [denyReason, setDenyReason] = useState('');
  const [showDenyForm, setShowDenyForm] = useState(false);
  
  const {
    approvePermission,
    denyPermission,
    isApprovingPermission,
    isDenyingPermission
  } = useMultiShopPermissions();

  const isProcessing = isApprovingPermission || isDenyingPermission;

  const handleApprove = () => {
    if (!request) return;
    
    approvePermission({ 
      requestId: request.id, 
      comment: approvalComment.trim() || undefined 
    });
    
    // Clean up and close
    setTimeout(() => {
      onClose();
      setApprovalComment('');
      onApprove?.(request.id, approvalComment);
    }, 100);
  };

  const handleDeny = () => {
    if (!request || !denyReason.trim()) {
      toast({
        title: 'Grund erforderlich',
        description: 'Bitte geben Sie einen Grund für die Ablehnung an.',
        variant: 'destructive'
      });
      return;
    }
    
    denyPermission({ requestId: request.id, reason: denyReason.trim() });
    
    // Clean up and close
    setTimeout(() => {
      onClose();
      setDenyReason('');
      setShowDenyForm(false);
      onDeny?.(request.id, denyReason);
    }, 100);
  };

  if (!request) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            DSGVO-konforme Zugriffsberechtigung
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Übersicht der Anfrage */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5" />
                Anfrage-Details
              </CardTitle>
              <CardDescription>
                Ein Multi-Shop Administrator möchte Zugriff auf Ihren Shop erhalten
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Administrator</Label>
                  <p className="font-semibold">{request.adminUsername}</p>
                  {request.adminEmail && (
                    <p className="text-sm text-gray-500">{request.adminEmail}</p>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Angefragt</Label>
                  <p className="text-sm">
                    {formatDistanceToNow(new Date(request.createdAt), { 
                      addSuffix: true, 
                      locale: de 
                    })}
                  </p>
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-gray-600">Begründung der Anfrage</Label>
                <div className="mt-1 p-3 bg-gray-50 rounded-md border">
                  <p className="text-sm">{request.requestReason || 'Keine Begründung angegeben'}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <Info className="h-4 w-4 text-blue-600" />
                <div className="text-sm">
                  <p className="font-medium text-blue-800">DSGVO-Hinweis</p>
                  <p className="text-blue-700">
                    Durch die Genehmigung erteilen Sie explizite Einwilligung zur Einsicht in Ihre Shop-Daten 
                    gemäß Art. 6 Abs. 1 lit. a DSGVO. Sie können diese Einwilligung jederzeit widerrufen.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Berechtigung-Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Eye className="h-5 w-5" />
                Zugriffsberechtigungen
              </CardTitle>
              <CardDescription>
                Folgende Berechtigungen werden erteilt
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">Reparatur-Übersicht</span>
                  </div>
                  <Badge variant="secondary">Nur Lesen</Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">Kunden-Statistiken</span>
                  </div>
                  <Badge variant="secondary">Nur Lesen</Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">Umsatz-Berichte</span>
                  </div>
                  <Badge variant="secondary">Nur Lesen</Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-red-50 border border-red-200 rounded">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium">Kunde-Kontaktdaten</span>
                  </div>
                  <Badge variant="destructive">Kein Zugriff</Badge>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-800">Temporärer Zugriff</p>
                    <p className="text-amber-700">
                      Der Zugriff wird nur für administrative Zwecke gewährt und kann jederzeit von Ihnen 
                      widerrufen werden.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Genehmigung/Ablehnung Formulare */}
          {!showDenyForm ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5" />
                  Genehmigungskommentar (Optional)
                </CardTitle>
                <CardDescription>
                  Fügen Sie einen Kommentar zu Ihrer Entscheidung hinzu
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Notizen oder Kommentare zur Genehmigung..."
                  value={approvalComment}
                  onChange={(e) => setApprovalComment(e.target.value)}
                  rows={3}
                />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-red-700">
                  <XCircle className="h-5 w-5" />
                  Ablehnungsgrund (Erforderlich)
                </CardTitle>
                <CardDescription>
                  Bitte geben Sie einen Grund für die Ablehnung an
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Grund der Ablehnung..."
                  value={denyReason}
                  onChange={(e) => setDenyReason(e.target.value)}
                  rows={3}
                  required
                />
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="gap-2">
          {!showDenyForm ? (
            <>
              <Button
                variant="outline"
                onClick={() => setShowDenyForm(true)}
                disabled={isProcessing}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Ablehnen
              </Button>
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isProcessing}
              >
                Abbrechen
              </Button>
              <Button
                onClick={handleApprove}
                disabled={isProcessing}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {isProcessing ? 'Wird genehmigt...' : 'Zugriff genehmigen'}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setShowDenyForm(false);
                  setDenyReason('');
                }}
                disabled={isProcessing}
              >
                Zurück
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeny}
                disabled={isProcessing || !denyReason.trim()}
              >
                <XCircle className="h-4 w-4 mr-2" />
                {isProcessing ? 'Wird abgelehnt...' : 'Endgültig ablehnen'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}