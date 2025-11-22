import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { useCurrentCompany } from "@/hooks/useCurrentCompany";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Bell, CheckCheck } from "lucide-react";

interface Notification {
  id: string;
  created_at: string;
  kind: string;
  title: string;
  message: string;
  link: string | null;
  read_at: string | null;
}

export default function Notifications() {
  const { companyId } = useCurrentCompany();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'today' | '7days' | '30days'>('all');
  const navigate = useNavigate();

  useEffect(() => {
    if (companyId) {
      loadNotifications();

      const channel = supabase
        .channel('notifications-page')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'notifications'
        }, () => {
          loadNotifications();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [filter, companyId]);

  const loadNotifications = async () => {
    if (!companyId) return;

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    const now = new Date();
    if (filter === 'today') {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      query = query.gte('created_at', today.toISOString());
    } else if (filter === '7days') {
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      query = query.gte('created_at', sevenDaysAgo.toISOString());
    } else if (filter === '30days') {
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      query = query.gte('created_at', thirtyDaysAgo.toISOString());
    }

    const { data } = await query;

    if (data) {
      setNotifications(data as any);
    }
  };

  const markAsRead = async (id: string) => {
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id);
    
    loadNotifications();
  };

  const markAllAsRead = async () => {
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .is('read_at', null);
    
    loadNotifications();
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const getNotificationBadgeColor = (kind: string) => {
    switch (kind) {
      case 'quote_signed':
        return 'bg-green-100 text-green-700';
      case 'invoice_overdue':
        return 'bg-red-100 text-red-700';
      case 'invoice_to_send':
        return 'bg-orange-100 text-orange-700';
      case 'job_assigned':
        return 'bg-blue-100 text-blue-700';
      case 'schedule_change':
        return 'bg-yellow-100 text-yellow-700';
      case 'timesheet_alert':
        return 'bg-purple-100 text-purple-700';
      case 'agenda_reminder':
        return 'bg-indigo-100 text-indigo-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const unreadCount = notifications.filter(n => !n.read_at).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bell className="h-8 w-8" />
            Notifications
          </h1>
          <p className="text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} notification(s) non lue(s)` : 'Toutes vos notifications'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button onClick={markAllAsRead} variant="outline">
            <CheckCheck className="h-4 w-4 mr-2" />
            Marquer tout comme lu
          </Button>
        )}
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="w-full">
        <TabsList>
          <TabsTrigger value="all">Toutes</TabsTrigger>
          <TabsTrigger value="today">Aujourd'hui</TabsTrigger>
          <TabsTrigger value="7days">7 derniers jours</TabsTrigger>
          <TabsTrigger value="30days">30 derniers jours</TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="space-y-4 mt-6">
          {notifications.length === 0 ? (
            <Card className="p-12 text-center">
              <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Aucune notification pour cette période</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                    !notification.read_at ? 'border-l-4 border-l-primary bg-muted/30' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className={`text-base ${!notification.read_at ? 'font-semibold' : 'font-medium'}`}>
                          {notification.title}
                        </h3>
                        <Badge className={getNotificationBadgeColor(notification.kind)}>
                          {notification.kind.replace('_', ' ')}
                        </Badge>
                        {!notification.read_at && (
                          <Badge variant="default" className="ml-auto">Nouveau</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
