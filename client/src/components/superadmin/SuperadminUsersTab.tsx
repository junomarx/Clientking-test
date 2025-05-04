  import React, { useState } from 'react';
  import { useQuery, useMutation } from '@tanstack/react-query';
  import {
    Card, CardContent, CardDescription, CardHeader, CardTitle
  } from '@/components/ui/card';
  import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  } from '@/components/ui/table';
  import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
  } from '@/components/ui/dialog';
  import { Label } from '@/components/ui/label';
  import { Input } from '@/components/ui/input';
  import { Button } from '@/components/ui/button';
  import { Badge } from '@/components/ui/badge';
  import { Switch } from '@/components/ui/switch';
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
  import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
  import { useToast } from '@/hooks/use-toast';
  import { Skeleton } from '@/components/ui/skeleton';
  import { apiRequest, queryClient } from '@/lib/queryClient';
  import {
    CircleUserRound, UserCog, BadgeCheck, BadgeX, Package, Pencil
  } from 'lucide-react';

  interface User {
    id: number;
    username: string;
    email: string;
    isActive: boolean;
    isAdmin: boolean;
    shopId: number | null;
    packageId: number | null;
    createdAt: string;
  }

  interface UserFormData extends Partial<User> {
    password?: string;
  }

  interface Package {
    id: number;
    name: string;
    priceMonthly: number;
  }

  export default function SuperadminUsersTab() {
    const { toast } = useToast();
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editForm, setEditForm] = useState<UserFormData>({});

    const { data: users, isLoading: isLoadingUsers, error: usersError } = useQuery<User[]>({
      queryKey: ['/api/superadmin/users'],
    });

    const { data: packages } = useQuery<Package[]>({
      queryKey: ['/api/superadmin/packages'],
    });

    const updateUserMutation = useMutation({
      mutationFn: async ({ userId, data }: { userId: number; data: UserFormData }) => {
        const response = await apiRequest('PATCH', `/api/superadmin/users/${userId}`, data);
        return await response.json();
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/superadmin/users'] });
        setIsEditDialogOpen(false);
        toast({ title: 'Benutzer aktualisiert' });
      },
      onError: (error: Error) => {
        toast({ variant: 'destructive', title: 'Fehler', description: error.message });
      },
    });

    const handleEditUser = (user: User) => {
      setSelectedUser(user);
      setEditForm({
        email: user.email,
        isAdmin: user.isAdmin,
        shopId: user.shopId,
        packageId: user.packageId,
      });
      setIsEditDialogOpen(true);
    };

    const handleUpdateUser = () => {
      if (selectedUser) {
        updateUserMutation.mutate({ userId: selectedUser.id, data: editForm });
      }
    };

    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Benutzerverwaltung</h1>
        {isLoadingUsers ? (
          <Skeleton className="w-full h-96" />
        ) : users ? (
          <Card>
            <CardHeader>
              <CardTitle>Alle Benutzer</CardTitle>
              <CardDescription>{users.length} Benutzer insgesamt</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Benutzername</TableHead>
                    <TableHead>E-Mail</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
     itte e            {users.mhreap(user => (
                    <ibTableRow key={user.id}>
                      <TableCell>{user.id}</TableCell>
                      <TableCell>{user.username}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        {user.isActive ? (
                          <Badge variant="outline" className="bg-green-100 text-green-700">Aktiv</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-100 text-red-700">Inaktiv</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" onClick={() => handleEditUser(user)}>
                          <Pencil className="h-3 w-3 mr-1" /> Bearbeiten
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          <p>Keine Benutzerdaten verfügbar</p>
        )}

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Benutzer bearbeiten: {selectedUser?.username}</DialogTitle>
              <DialogDescription>Einstellungen und Rechte anpassen.</DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="settings">
              <TabsList>
                <TabsTrigger value="settings">Einstellungen</TabsTrigger>
                <TabsTrigger value="permissions">Berechtigungen</TabsTrigger>
              </TabsList>

              <TabsContent value="settings">
                <div className="space-y-4">
                  <Label>E-Mail</Label>
                  <Input
                    value={editForm.email || ''}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  />
                  <Label>Shop ID</Label>
                  <Input
                    type="number"
                    value={editForm.shopId?.toString() || ''}
                    onChange={(e) => setEditForm({ ...editForm, shopId: parseInt(e.target.value) || null })}
                  />
                </div>
              </TabsContent>

              <TabsContent value="permissions">
                <div className="space-y-4">
                  <Label>Administrator</Label>
                  <Switch
                    checked={!!editForm.isAdmin}
                    onCheckedChange={(checked) => setEditForm({ ...editForm, isAdmin: checked })}
                  />

                  <Label>Paket</Label>
                  <Select
                    value={editForm.packageId !== null && editForm.packageId !== undefined
                      ? editForm.packageId.toString()
                      : '__none__'}
                    onValueChange={(value) =>
                      setEditForm({
                        ...editForm,
                        packageId: value === '__none__' ? null : parseInt(value),
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Paket wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Kein Paket</SelectItem>
                      {packages?.map(pkg => (
                        <SelectItem key={pkg.id} value={pkg.id.toString()}>
                          {pkg.name} ({pkg.priceMonthly.toFixed(2)} €/Monat)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Abbrechen
              </Button>
              <Button onClick={handleUpdateUser}>Speichern</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }
