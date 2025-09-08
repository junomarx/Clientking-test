import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Mail,
  Plus,
  Send,
  Edit,
  Trash2,
  Users,
  Calendar,
  Eye,
  BarChart3,
  CheckCircle,
  Clock,
  FileText,
  Loader2
} from 'lucide-react';

interface Newsletter {
  id: number;
  title: string;
  subject: string;
  content: string;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface NewsletterStats {
  totalNewsletters: number;
  sentNewsletters: number;
  subscribedUsers: number;
  recentNewsletters: any[];
}

interface NewsletterHistoryItem {
  newsletterId: number;
  title: string;
  subject: string;
  recipientCount: number;
  lastSentAt: string;
  successfulSends: number;
  failedSends: number;
}

interface NewsletterRecipient {
  id: number;
  recipientEmail: string;
  status: 'sent' | 'failed';
  sentAt: string;
  shopName?: string | null;
  shopId?: number | null;
}

export default function SuperadminNewsletterTab() {
  const { toast } = useToast();
  
  // States
  const [selectedNewsletter, setSelectedNewsletter] = useState<Newsletter | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSendDialogOpen, setIsSendDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [isRecipientsDialogOpen, setIsRecipientsDialogOpen] = useState(false);
  const [selectedNewsletterForRecipients, setSelectedNewsletterForRecipients] = useState<NewsletterHistoryItem | null>(null);
  
  const [newNewsletter, setNewNewsletter] = useState({
    title: '',
    subject: '',
    content: ''
  });

  // Queries
  const { data: newsletters, isLoading: newslettersLoading } = useQuery<Newsletter[]>({
    queryKey: ['/api/superadmin/newsletters'],
  });

  const { data: stats, isLoading: statsLoading } = useQuery<NewsletterStats>({
    queryKey: ['/api/superadmin/newsletters/stats'],
  });

  const { data: sendHistory, isLoading: historyLoading } = useQuery<NewsletterHistoryItem[]>({
    queryKey: ['/api/superadmin/newsletters/send-history'],
  });

  // Query für Gesamtzahl der Shops
  const { data: totalShopsData } = useQuery<{ totalShops: number }>({
    queryKey: ['/api/superadmin/shops/total-count'],
  });

  // Query für detaillierte Empfänger-Liste 
  const { data: recipients, isLoading: recipientsLoading, refetch: refetchRecipients } = useQuery<NewsletterRecipient[]>({
    queryKey: ['/api/superadmin/newsletters', selectedNewsletterForRecipients?.newsletterId, 'recipients'],
    enabled: !!selectedNewsletterForRecipients?.newsletterId,
    refetchOnMount: true,
    staleTime: 0, // Immer frische Daten laden
  });
  

  // Mutations
  const createNewsletterMutation = useMutation({
    mutationFn: async (data: { title: string; subject: string; content: string }) => {
      const response = await apiRequest('POST', '/api/superadmin/newsletters', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Newsletter erstellt",
        description: "Newsletter wurde erfolgreich erstellt",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/newsletters'] });
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/newsletters/stats'] });
      setIsCreateDialogOpen(false);
      setNewNewsletter({ title: '', subject: '', content: '' });
    },
    onError: (error: any) => {
      toast({
        title: "Fehler",
        description: error.message || "Fehler beim Erstellen des Newsletters",
        variant: "destructive",
      });
    },
  });

  const updateNewsletterMutation = useMutation({
    mutationFn: async (data: { id: number; subject: string; content: string }) => {
      const response = await apiRequest('PATCH', `/api/superadmin/newsletters/${data.id}`, {
        subject: data.subject,
        content: data.content
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Newsletter aktualisiert",
        description: "Newsletter wurde erfolgreich aktualisiert",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/newsletters'] });
      setIsEditDialogOpen(false);
      setSelectedNewsletter(null);
    },
    onError: (error: any) => {
      toast({
        title: "Fehler",
        description: error.message || "Fehler beim Aktualisieren des Newsletters",
        variant: "destructive",
      });
    },
  });

  const deleteNewsletterMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/superadmin/newsletters/${id}`);
      // 204 No Content hat keinen Response-Body
      return response.ok;
    },
    onSuccess: () => {
      toast({
        title: "Newsletter gelöscht",
        description: "Newsletter wurde erfolgreich gelöscht",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/newsletters'] });
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/newsletters/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/newsletters/send-history'] });
    },
    onError: (error: any) => {
      toast({
        title: "Fehler",
        description: error.message || "Fehler beim Löschen des Newsletters",
        variant: "destructive",
      });
    },
  });

  const sendNewsletterMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('POST', `/api/superadmin/newsletters/${id}/send`);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Newsletter versendet",
        description: `Newsletter wurde an ${data.recipientCount} Empfänger gesendet`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/newsletters'] });
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/newsletters/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/newsletters/send-history'] });
      setIsSendDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Fehler",
        description: error.message || "Fehler beim Versenden des Newsletters",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (newsletter: Newsletter) => {
    setSelectedNewsletter(newsletter);
    setIsEditDialogOpen(true);
  };

  const handlePreview = (newsletter: Newsletter) => {
    setSelectedNewsletter(newsletter);
    setIsPreviewDialogOpen(true);
  };

  const handleSend = (newsletter: Newsletter) => {
    setSelectedNewsletter(newsletter);
    setIsSendDialogOpen(true);
  };

  const getNewsletterStatus = (newsletter: Newsletter) => {
    if (newsletter.sentAt) {
      return <Badge variant="default" className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Versendet</Badge>;
    }
    return <Badge variant="outline" className="text-gray-600"><Clock className="h-3 w-3 mr-1" />Entwurf</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gesamt Newsletter</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats?.totalNewsletters || 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Versendete Newsletter</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats?.sentNewsletters || 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Abonnenten</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats?.subscribedUsers || 0}
            </div>
            {!statsLoading && totalShopsData?.totalShops && totalShopsData.totalShops > 0 && (
              <p className="text-xs text-muted-foreground">
                {Math.round(((stats?.subscribedUsers || 0) / totalShopsData.totalShops) * 100)}% aller Shops
              </p>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kürzlich versendet</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats?.recentNewsletters?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Letzte 30 Tage</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="newsletters" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="newsletters">Newsletter verwalten</TabsTrigger>
          <TabsTrigger value="variables">Variablen</TabsTrigger>
          <TabsTrigger value="history">Versand-Historie</TabsTrigger>
        </TabsList>

        <TabsContent value="newsletters" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Newsletter</CardTitle>
                  <CardDescription>
                    Erstellen und verwalten Sie Newsletter für Shop-Owner und Multi-Shop-Admins
                  </CardDescription>
                </div>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Newsletter erstellen
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Neuer Newsletter</DialogTitle>
                      <DialogDescription>
                        Erstellen Sie einen neuen Newsletter für Ihre Shop-Owner und Multi-Shop-Admins
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="title">Titel</Label>
                        <Input
                          id="title"
                          placeholder="Newsletter Titel..."
                          value={newNewsletter.title}
                          onChange={(e) => setNewNewsletter(prev => ({ ...prev, title: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="subject">Betreff</Label>
                        <Input
                          id="subject"
                          placeholder="Newsletter Betreff..."
                          value={newNewsletter.subject}
                          onChange={(e) => setNewNewsletter(prev => ({ ...prev, subject: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="content">Inhalt</Label>
                        <Textarea
                          id="content"
                          placeholder="Newsletter Inhalt..."
                          rows={15}
                          value={newNewsletter.content}
                          onChange={(e) => setNewNewsletter(prev => ({ ...prev, content: e.target.value }))}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                        Abbrechen
                      </Button>
                      <Button 
                        onClick={() => createNewsletterMutation.mutate(newNewsletter)}
                        disabled={createNewsletterMutation.isPending || !newNewsletter.subject || !newNewsletter.content}
                      >
                        {createNewsletterMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Erstellen
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {newslettersLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableCaption>
                    {newsletters?.length === 0 ? "Noch keine Newsletter erstellt" : `${newsletters?.length || 0} Newsletter`}
                  </TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Betreff</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Erstellt</TableHead>
                      <TableHead>Versendet</TableHead>
                      <TableHead className="text-right">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {newsletters?.map((newsletter) => (
                      <TableRow key={newsletter.id}>
                        <TableCell className="font-medium">{newsletter.subject}</TableCell>
                        <TableCell>{getNewsletterStatus(newsletter)}</TableCell>
                        <TableCell>
                          {format(new Date(newsletter.createdAt), 'dd.MM.yyyy - HH:mm', { locale: de })}
                        </TableCell>
                        <TableCell>
                          {newsletter.sentAt ? format(new Date(newsletter.sentAt), 'dd.MM.yyyy - HH:mm', { locale: de }) : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => handlePreview(newsletter)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleEdit(newsletter)}
                              disabled={newsletter.sentAt ? true : false}
                              title={newsletter.sentAt ? "Versendete Newsletter können nicht bearbeitet werden" : "Newsletter bearbeiten"}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="default" size="sm" onClick={() => handleSend(newsletter)}>
                              <Send className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Newsletter löschen</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Sind Sie sicher, dass Sie diesen Newsletter löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => deleteNewsletterMutation.mutate(newsletter.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Löschen
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    )) || []}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="variables" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Newsletter-Variablen</CardTitle>
              <CardDescription>
                Verfügbare Variablen für die personalisierte Gestaltung Ihrer Newsletter
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-blue-600">👤 Empfänger-Informationen</h3>
                  <div className="grid gap-3">
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div>
                        <code className="font-mono text-sm bg-white px-2 py-1 rounded border">{"{{empfaengername}}"}</code>
                        <p className="text-sm text-gray-600 mt-1">Name des Newsletter-Empfängers (Vor- und Nachname, oder Firmenname als Fallback)</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div>
                        <code className="font-mono text-sm bg-white px-2 py-1 rounded border">{"{{shopowner_name}}"}</code>
                        <p className="text-sm text-gray-600 mt-1">Name des Shop-Owners (identisch mit empfaengername)</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div>
                        <code className="font-mono text-sm bg-white px-2 py-1 rounded border">{"{{empfaengeremail}}"}</code>
                        <p className="text-sm text-gray-600 mt-1">E-Mail-Adresse des Empfängers</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div>
                        <code className="font-mono text-sm bg-white px-2 py-1 rounded border">{"{{firmenname}}"}</code>
                        <p className="text-sm text-gray-600 mt-1">Name der Firma/des Shops</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3 text-green-600">📧 Newsletter-Management</h3>
                  <div className="grid gap-3">
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div>
                        <code className="font-mono text-sm bg-white px-2 py-1 rounded border">{"{{abmeldelink}}"}</code>
                        <p className="text-sm text-gray-600 mt-1">Automatisch generierter Link zum Abmelden vom Newsletter</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3 text-purple-600">🏢 ClientKing Informationen</h3>
                  <div className="grid gap-3">
                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                      <div>
                        <code className="font-mono text-sm bg-white px-2 py-1 rounded border">{"{{clientking_logo}}"}</code>
                        <p className="text-sm text-gray-600 mt-1">ClientKing Logo (als HTML img-Tag)</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                      <div>
                        <code className="font-mono text-sm bg-white px-2 py-1 rounded border">{"{{aktuellesjahr}}"}</code>
                        <p className="text-sm text-gray-600 mt-1">Aktuelles Jahr (z.B. 2025)</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-800 mb-2">💡 Verwendung der Variablen</h4>
                <p className="text-sm text-yellow-700 mb-2">
                  Verwenden Sie diese Variablen direkt in Ihrem Newsletter-Inhalt. Sie werden automatisch durch die entsprechenden Werte ersetzt.
                </p>
                <div className="bg-white p-3 rounded border text-sm">
                  <strong>Beispiel:</strong><br/>
                  <code>{"Hallo {{empfaengername}},"}<br/>
                  <br/>
                  willkommen bei ClientKing!<br/>
                  <br/>
                  {"Ihr Team von {{firmenname}}"}<br/>
                  <br/>
                  {"<a href=\"{{abmeldelink}}\">Newsletter abbestellen</a>"}</code>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Versand-Historie</CardTitle>
              <CardDescription>
                Übersicht über alle versendeten Newsletter
              </CardDescription>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableCaption>
                    {sendHistory?.length === 0 ? "Noch keine Newsletter versendet" : `${sendHistory?.length || 0} Versendungen`}
                  </TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Newsletter</TableHead>
                      <TableHead className="hidden md:table-cell">Empfänger-Anzahl</TableHead>
                      <TableHead className="hidden md:table-cell">Gesendet am</TableHead>
                      <TableHead className="hidden md:table-cell">Status</TableHead>
                      <TableHead>Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sendHistory?.map((historyItem) => (
                      <TableRow key={historyItem.newsletterId}>
                        <TableCell className="font-medium">
                          <div className="space-y-1">
                            <div>{historyItem.subject}</div>
                            <div className="text-sm text-gray-500 md:hidden">
                              <div>
                                {historyItem.recipientCount} Empfänger
                                {totalShopsData?.totalShops && totalShopsData.totalShops > 0 && (
                                  <span className="text-xs ml-1">
                                    ({historyItem.recipientCount} von {totalShopsData.totalShops} Shops - {Math.round((historyItem.recipientCount / totalShopsData.totalShops) * 100)}%)
                                  </span>
                                )}
                              </div>
                              <div>{format(new Date(historyItem.lastSentAt), 'dd.MM.yyyy', { locale: de })}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="space-y-1">
                            <div>{historyItem.recipientCount} Empfänger</div>
                            {totalShopsData?.totalShops && totalShopsData.totalShops > 0 && (
                              <div className="text-xs text-gray-500">
                                {historyItem.recipientCount} von {totalShopsData.totalShops} Shops ({Math.round((historyItem.recipientCount / totalShopsData.totalShops) * 100)}%)
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {format(new Date(historyItem.lastSentAt), 'dd.MM.yyyy - HH:mm', { locale: de })}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="space-y-1">
                            <Badge variant="default">
                              {historyItem.successfulSends} Erfolgreich
                            </Badge>
                            {historyItem.failedSends > 0 && (
                              <Badge variant="destructive">
                                {historyItem.failedSends} Fehlgeschlagen
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // Cache für Recipients invalidieren
                              queryClient.invalidateQueries({ 
                                queryKey: ['/api/superadmin/newsletters', historyItem.newsletterId, 'recipients'] 
                              });
                              setSelectedNewsletterForRecipients(historyItem);
                              setIsRecipientsDialogOpen(true);
                            }}
                          >
                            <Users className="h-4 w-4 mr-1" />
                            Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    )) || []}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Recipients Dialog */}
      <Dialog open={isRecipientsDialogOpen} onOpenChange={setIsRecipientsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Empfänger-Details</DialogTitle>
            <DialogDescription>
              Detaillierte Liste aller Empfänger für "{selectedNewsletterForRecipients?.subject}"
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            {recipientsLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Summary Stats */}
                {selectedNewsletterForRecipients && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {selectedNewsletterForRecipients.recipientCount}
                      </div>
                      <div className="text-sm text-gray-600">Gesamt</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {selectedNewsletterForRecipients.successfulSends}
                      </div>
                      <div className="text-sm text-gray-600">Erfolgreich</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {selectedNewsletterForRecipients.failedSends}
                      </div>
                      <div className="text-sm text-gray-600">Fehlgeschlagen</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-600">
                        {format(new Date(selectedNewsletterForRecipients.lastSentAt), 'dd.MM.yyyy', { locale: de })}
                      </div>
                      <div className="text-sm text-gray-600">Gesendet am</div>
                    </div>
                  </div>
                )}

                {/* Recipients Table */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>E-Mail-Adresse</TableHead>
                          <TableHead className="hidden lg:table-cell">Shop-Name</TableHead>
                          <TableHead className="hidden md:table-cell">Status</TableHead>
                          <TableHead className="hidden md:table-cell">Gesendet am</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recipients?.map((recipient) => (
                          <TableRow key={recipient.id}>
                            <TableCell className="font-medium">
                              <div className="space-y-1">
                                <div>{recipient.recipientEmail}</div>
                                <div className="lg:hidden text-sm text-gray-500">
                                  {recipient.shopName || 'Unbekannter Shop'}
                                </div>
                                <div className="md:hidden">
                                  <Badge 
                                    variant={recipient.status === 'sent' ? 'default' : 'destructive'}
                                    className="mr-2"
                                  >
                                    {recipient.status === 'sent' ? 'Erfolgreich' : 'Fehlgeschlagen'}
                                  </Badge>
                                  <span className="text-sm text-gray-500">
                                    {format(new Date(recipient.sentAt), 'dd.MM.yyyy HH:mm', { locale: de })}
                                  </span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              <div className="text-sm">
                                {recipient.shopName || <span className="text-gray-400">Unbekannter Shop</span>}
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <Badge variant={recipient.status === 'sent' ? 'default' : 'destructive'}>
                                {recipient.status === 'sent' ? 'Erfolgreich' : 'Fehlgeschlagen'}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              {format(new Date(recipient.sentAt), 'dd.MM.yyyy - HH:mm', { locale: de })}
                            </TableCell>
                          </TableRow>
                        )) || []}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {recipients?.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    Keine Empfänger-Daten verfügbar
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRecipientsDialogOpen(false)}>
              Schließen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Newsletter bearbeiten</DialogTitle>
            <DialogDescription>
              Bearbeiten Sie den Newsletter. Nur unveröffentlichte Newsletter können bearbeitet werden.
            </DialogDescription>
          </DialogHeader>
          {selectedNewsletter && (
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-subject">Betreff</Label>
                <Input
                  id="edit-subject"
                  value={selectedNewsletter.subject}
                  onChange={(e) => setSelectedNewsletter(prev => prev ? { ...prev, subject: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-content">Inhalt</Label>
                <Textarea
                  id="edit-content"
                  rows={15}
                  value={selectedNewsletter.content}
                  onChange={(e) => setSelectedNewsletter(prev => prev ? { ...prev, content: e.target.value } : null)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button 
              onClick={() => {
                if (selectedNewsletter) {
                  updateNewsletterMutation.mutate({
                    id: selectedNewsletter.id,
                    subject: selectedNewsletter.subject,
                    content: selectedNewsletter.content
                  });
                }
              }}
              disabled={updateNewsletterMutation.isPending}
            >
              {updateNewsletterMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Newsletter Vorschau</DialogTitle>
            <DialogDescription>
              Vorschau des Newsletter-Inhalts
            </DialogDescription>
          </DialogHeader>
          {selectedNewsletter && (
            <div className="space-y-4">
              <div>
                <Label>Betreff:</Label>
                <p className="font-medium">{selectedNewsletter.subject}</p>
              </div>
              <Separator />
              <div>
                <Label>Inhalt (HTML-Vorschau):</Label>
                <div className="mt-2 border rounded-md bg-white max-h-96 overflow-y-auto">
                  <div 
                    dangerouslySetInnerHTML={{ __html: selectedNewsletter.content }}
                    className="p-4"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPreviewDialogOpen(false)}>
              Schließen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Confirmation Dialog */}
      <Dialog open={isSendDialogOpen} onOpenChange={setIsSendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Newsletter versenden</DialogTitle>
            <DialogDescription>
              Sind Sie sicher, dass Sie diesen Newsletter an alle abonnierten Shop-Owner und Multi-Shop-Admins versenden möchten?
            </DialogDescription>
          </DialogHeader>
          {selectedNewsletter && (
            <div className="space-y-2">
              <p><strong>Betreff:</strong> {selectedNewsletter.subject}</p>
              <p><strong>Empfänger:</strong> {stats?.subscribedUsers || 0} Abonnenten</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSendDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button 
              onClick={() => {
                if (selectedNewsletter) {
                  sendNewsletterMutation.mutate(selectedNewsletter.id);
                }
              }}
              disabled={sendNewsletterMutation.isPending}
            >
              {sendNewsletterMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Newsletter versenden
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}