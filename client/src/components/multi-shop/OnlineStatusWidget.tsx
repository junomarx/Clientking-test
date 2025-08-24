import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useQuery } from '@tanstack/react-query';
import { 
  Users, 
  Wifi, 
  WifiOff, 
  Clock,
  Circle,
  User
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

interface Employee {
  id: number;
  username: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  shopId: number | null;
  shopName?: string;
  role: string;
  isActive: boolean;
}

export function OnlineStatusWidget() {
  const { onlineUsers, isConnected, wsStatus } = useOnlineStatus();
  
  // Lade alle Mitarbeiter für die Shops, die der MSA verwaltet
  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['/api/multi-shop/employees'],
    enabled: true
  });

  // Kombiniere Online-Status mit Mitarbeiter-Daten
  const employeesWithStatus = employees.map(employee => {
    const onlineUser = onlineUsers.find(user => user.userId === employee.id);
    return {
      ...employee,
      isOnline: !!onlineUser,
      lastSeen: onlineUser?.lastSeen ? new Date(onlineUser.lastSeen) : null,
      isActive: onlineUser?.isActive || false
    };
  });

  const onlineEmployees = employeesWithStatus.filter(emp => emp.isOnline);
  const offlineEmployees = employeesWithStatus.filter(emp => !emp.isOnline);

  const getDisplayName = (employee: Employee) => {
    if (employee.firstName && employee.lastName) {
      return `${employee.firstName} ${employee.lastName}`;
    }
    return employee.username;
  };

  const getTimeAgo = (date: Date | null) => {
    if (!date) return 'Nie';
    return formatDistanceToNow(date, { 
      addSuffix: true,
      locale: de 
    });
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Mitarbeiter Online-Status
          <Badge 
            variant={isConnected ? "default" : "destructive"}
            className="ml-auto"
          >
            {isConnected ? (
              <>
                <Wifi className="h-3 w-3 mr-1" />
                Live
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3 mr-1" />
                Offline
              </>
            )}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status-Übersicht */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{onlineEmployees.length}</div>
            <div className="text-sm text-green-700">Online</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-600">{offlineEmployees.length}</div>
            <div className="text-sm text-gray-700">Offline</div>
          </div>
        </div>

        {/* Online Mitarbeiter */}
        {onlineEmployees.length > 0 && (
          <div>
            <h4 className="font-medium text-green-700 mb-3 flex items-center gap-2">
              <Circle className="h-2 w-2 fill-green-500 text-green-500" />
              Derzeit Online ({onlineEmployees.length})
            </h4>
            <div className="space-y-2">
              {onlineEmployees.map(employee => (
                <div 
                  key={employee.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-green-50 border border-green-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <User className="h-8 w-8 text-green-600 bg-green-100 rounded-full p-1" />
                      <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 border-2 border-white rounded-full animate-pulse" />
                    </div>
                    <div>
                      <div className="font-medium text-green-900">{getDisplayName(employee)}</div>
                      <div className="text-sm text-green-600">
                        {employee.shopName && `${employee.shopName} • `}
                        {employee.role}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-green-600">
                      <Clock className="h-3 w-3 inline mr-1" />
                      {getTimeAgo(employee.lastSeen)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Offline Mitarbeiter - nur die ersten 5 anzeigen */}
        {offlineEmployees.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
              <Circle className="h-2 w-2 fill-gray-400 text-gray-400" />
              Offline ({offlineEmployees.length})
            </h4>
            <div className="space-y-2">
              {offlineEmployees.slice(0, 5).map(employee => (
                <div 
                  key={employee.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-200"
                >
                  <div className="flex items-center gap-3">
                    <User className="h-8 w-8 text-gray-500 bg-gray-100 rounded-full p-1" />
                    <div>
                      <div className="font-medium text-gray-900">{getDisplayName(employee)}</div>
                      <div className="text-sm text-gray-500">
                        {employee.shopName && `${employee.shopName} • `}
                        {employee.role}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">
                      Offline
                    </div>
                  </div>
                </div>
              ))}
              {offlineEmployees.length > 5 && (
                <div className="text-center p-2 text-sm text-gray-500">
                  ... und {offlineEmployees.length - 5} weitere offline
                </div>
              )}
            </div>
          </div>
        )}

        {/* Keine Mitarbeiter */}
        {employees.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>Keine Mitarbeiter gefunden</p>
          </div>
        )}

        {/* WebSocket Status */}
        <div className="text-xs text-gray-500 pt-2 border-t flex items-center justify-between">
          <span>WebSocket Status: {wsStatus}</span>
          <span>
            {isConnected ? (
              <span className="text-green-600">● Echtzeit aktiv</span>
            ) : (
              <span className="text-red-600">● Verbindung getrennt</span>
            )}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}