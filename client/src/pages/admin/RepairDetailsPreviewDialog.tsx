import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Smartphone,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Tag,
  AlertCircle,
  Clock,
  Euro,
  FileText,
  User,
  Clipboard,
  Printer,
  Pen,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  XCircle,
  MessageCircle,
  Pencil
} from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

// Interface für die Props
interface RepairDetailsPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  repair: any;
}

// Hilfsfunktion für Status-Badges
function getStatusBadge(status: string) {
  switch (status) {
    case 'eingegangen':
      return <Badge className="bg-yellow-100 text-amber-700 hover:bg-yellow-100 rounded-md px-2 py-1 text-xs font-normal">Eingegangen</Badge>;
    case 'in_reparatur':
      return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 rounded-md px-2 py-1 text-xs font-normal">In Arbeit</Badge>;
    case 'ersatzteil_eingetroffen':
      return <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 rounded-md px-2 py-1 text-xs font-normal">Ersatzteil eingetroffen</Badge>;
    case 'fertig':
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 rounded-md px-2 py-1 text-xs font-normal">Fertig</Badge>;
    case 'abgeholt':
      return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 rounded-md px-2 py-1 text-xs font-normal">Abgeholt</Badge>;
    default:
      return <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100 rounded-md px-2 py-1 text-xs font-normal">{status}</Badge>;
  }
}

// Formatiere das Datum im deutschen Format
function formatDate(dateString: string) {
  return format(new Date(dateString), 'dd. MMMM yyyy', { locale: de });
}

// Formatiere das Datum und die Uhrzeit
function formatDateTime(dateString: string) {
  return format(new Date(dateString), 'dd.MM.yyyy HH:mm', { locale: de });
}

export function RepairDetailsPreviewDialog({ open, onClose, repair }: RepairDetailsPreviewDialogProps) {
  // Variable für den Anzeigenamen
  const customerName = repair ? `${repair.customerName}` : 'Unbekannter Kunde';
  
  // Wenn keine Reparatur ausgewählt ist
  if (!repair) {
    return null;
  }
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Reparaturauftrag {repair.orderCode || `#${repair.id}`}
          </DialogTitle>
          <DialogDescription>
            Vollständige Informationen zum Reparaturauftrag und Kundendaten
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          {/* Kundendaten */}
          <div className="bg-slate-50 rounded-lg p-4 shadow-sm border">
            <h3 className="text-lg font-medium flex items-center gap-2 mb-3">
              <User className="h-5 w-5" />
              Kundendaten
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <User className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                <div>
                  <div className="font-medium">{customerName}</div>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <Phone className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                <div>"+49 123 45678900"</div>
              </div>
              
              <div className="flex items-start gap-2">
                <Mail className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                <div>{customerName.toLowerCase().replace(' ', '.') + '@example.com'}</div>
              </div>
              
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                <div>
                  <div>Musterstraße 123</div>
                  <div>10115 Berlin</div>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                <div>Kunde seit {formatDate(repair.createdAt)}</div>
              </div>
            </div>
          </div>
          
          {/* Gerätedaten */}
          <div className="bg-slate-50 rounded-lg p-4 shadow-sm border">
            <h3 className="text-lg font-medium flex items-center gap-2 mb-3">
              <Smartphone className="h-5 w-5" />
              Gerätedaten
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <Smartphone className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                <div>
                  <div className="font-medium">{repair.brand} {repair.model}</div>
                  <div className="text-sm text-muted-foreground">{repair.deviceType}</div>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <Tag className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                <div>
                  <div className="text-sm text-muted-foreground">Seriennummer</div>
                  <div>SN12345678XYZ</div>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                <div>
                  <div className="text-sm text-muted-foreground">Fehlerbeschreibung</div>
                  <div className="whitespace-pre-wrap">Display defekt\nAkku hält nicht lange\nLautsprecher funktioniert nicht</div>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                <div>
                  <div className="text-sm text-muted-foreground">Status</div>
                  <div>{getStatusBadge(repair.status)}</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Weitere Informationen */}
          <div className="bg-slate-50 rounded-lg p-4 shadow-sm border md:col-span-2">
            <h3 className="text-lg font-medium flex items-center gap-2 mb-3">
              <Clipboard className="h-5 w-5" />
              Auftragsinformationen
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                  <div>
                    <div className="text-sm text-muted-foreground">Auftragsdatum</div>
                    <div>{formatDate(repair.createdAt)}</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <Euro className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                  <div>
                    <div className="text-sm text-muted-foreground">Kostenvoranschlag</div>
                    <div className="font-medium">149,00 €</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <Euro className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                  <div>
                    <div className="text-sm text-muted-foreground">Anzahlung</div>
                    <div>50,00 €</div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                <div>
                  <div className="text-sm text-muted-foreground">Notizen</div>
                  <div className="whitespace-pre-wrap">Kunde hat keinen Ersatzakku mitgegeben. Ersatzteile müssen bestellt werden. Kunde wünscht Benachrichtigung, sobald das Gerät fertig ist.</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Unterschriften */}
          <div className="bg-slate-50 rounded-lg p-4 shadow-sm border md:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Abgabe-Unterschrift */}
              <div>
                <h3 className="text-lg font-medium flex items-center gap-2 mb-3">
                  <Pen className="h-5 w-5" />
                  Unterschrift bei Abgabe
                </h3>
                
                <div className="border rounded bg-white p-2">
                  <div className="h-24 flex items-center justify-center text-gray-400">
                    <Pen className="h-8 w-8 mr-2" />Unterschrift würde hier angezeigt werden
                  </div>
                </div>
                
                <div className="mt-4 flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1"
                  >
                    <Pen className="h-4 w-4" />
                    Unterschrift hinzufügen
                  </Button>
                </div>
              </div>
              
              {/* Abholungs-Unterschrift */}
              <div>
                <h3 className="text-lg font-medium flex items-center gap-2 mb-3">
                  <Pen className="h-5 w-5" />
                  Unterschrift bei Abholung
                </h3>
                
                <div className="border rounded bg-white p-2">
                  <div className="h-24 flex items-center justify-center text-gray-400">
                    <Pen className="h-8 w-8 mr-2" />Unterschrift würde hier angezeigt werden
                  </div>
                </div>
                
                <div className="mt-4 flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1"
                  >
                    <Pen className="h-4 w-4" />
                    Unterschrift hinzufügen
                  </Button>
                </div>
              </div>
            </div>
          </div>
          
          {/* E-Mail-Verlauf */}
          <div className="bg-slate-50 rounded-lg p-4 shadow-sm border md:col-span-2">
            <h3 className="text-lg font-medium flex items-center gap-2 mb-3">
              <MessageCircle className="h-5 w-5" />
              E-Mail-Verlauf
            </h3>
            
            <div className="space-y-3">
              <div className="border rounded-md p-3 bg-white">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">Reparatur abgeschlossen</div>
                    <div className="text-sm text-muted-foreground">An: {customerName.toLowerCase().replace(' ', '.') + '@example.com'}</div>
                  </div>
                  <div className="text-sm text-muted-foreground">{formatDateTime('2025-05-01T15:30:00')}</div>
                </div>
              </div>
              
              <div className="border rounded-md p-3 bg-white">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">Ersatzteil eingetroffen</div>
                    <div className="text-sm text-muted-foreground">An: {customerName.toLowerCase().replace(' ', '.') + '@example.com'}</div>
                  </div>
                  <div className="text-sm text-muted-foreground">{formatDateTime('2025-04-29T11:15:00')}</div>
                </div>
              </div>
            </div>
            
            <div className="mt-4 flex justify-end">
              <Button variant="outline" size="sm" className="flex items-center gap-1">
                <Mail className="h-4 w-4" />
                E-Mail senden
              </Button>
            </div>
          </div>
        </div>
        
        {/* Footer mit Aktionen */}
        <div className="mt-6 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="flex items-center gap-1" onClick={onClose}>
              <ArrowLeft className="h-4 w-4" />
              Zurück
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-9 w-9">
              <Printer className="h-4 w-4" />
            </Button>
            
            <Button variant="outline" size="icon" className="h-9 w-9">
              <Pencil className="h-4 w-4" />
            </Button>
            
            <Button variant="outline" size="sm" className="flex items-center gap-1">
              <ArrowRight className="h-4 w-4" />
              Status ändern
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}