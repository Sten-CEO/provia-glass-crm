import { useEffect, useState } from "react";
import { Bell, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface Notification {
  id: string;
  created_at: string;
  type: string;
  title: string;
  message: string;
  payload: any;
  read_at: string | null;
}

export const NotificationsPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    loadNotifications();

    const channel = supabase
      .channel('notifications-changes')
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
  }, []);

  const loadNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.read_at).length);
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
    toast.success("Toutes les notifications marquées comme lues");
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    let link = (notification as any).link || notification.payload?.link;
    if (link && link.startsWith('/interventions/') && !/\/(report|editer)(\/|$)/.test(link)) {
      link = `${link}/report`;
    }
    if (link) {
      navigate(link);
      setIsOpen(false);
    }
  };

  const getNotificationBadgeColor = (notification: Notification) => {
    const type = (notification as any).kind || notification.type;
    switch (type) {
      case 'quote_signed': return 'bg-green-500';
      case 'invoice_due': return 'bg-orange-500';
      case 'invoice_overdue': return 'bg-red-500';
      case 'invoice_to_send': return 'bg-yellow-500';
      case 'job_assigned': return 'bg-blue-500';
      case 'schedule_change': return 'bg-purple-500';
      case 'timesheet_alert': return 'bg-amber-500';
      case 'agenda_reminder': return 'bg-cyan-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500">
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-12 z-50 w-96 bg-background border rounded-lg shadow-lg">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">Notifications</h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  disabled={unreadCount === 0}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Tout marquer comme lu
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <ScrollArea className="h-[400px]">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  Aucune notification
                </div>
              ) : (
                <div className="divide-y">
                  {notifications.slice(0, 10).map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-accent cursor-pointer transition-colors ${
                        !notification.read_at ? 'bg-accent/50' : ''
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-2 h-2 rounded-full mt-2 ${(() => {
                          const type = (notification as any).kind || notification.type;
                          switch (type) {
                            case 'quote_signed': return 'bg-green-500';
                            case 'invoice_due': return 'bg-orange-500';
                            case 'invoice_overdue': return 'bg-red-500';
                            case 'invoice_to_send': return 'bg-yellow-500';
                            case 'job_assigned': return 'bg-blue-500';
                            case 'schedule_change': return 'bg-purple-500';
                            case 'timesheet_alert': return 'bg-amber-500';
                            case 'agenda_reminder': return 'bg-cyan-500';
                            default: return 'bg-gray-500';
                          }
                        })()}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-medium text-sm">{notification.title}</h4>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatDistanceToNow(new Date(notification.created_at), { 
                                addSuffix: true, 
                                locale: fr 
                              })}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                          {notification.payload?.link && (
                            <span className="text-xs text-primary mt-1 inline-block">Voir →</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {notifications.length > 10 && (
              <div className="p-4 border-t">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setIsOpen(false);
                    navigate('/notifications');
                  }}
                >
                  Voir toutes les notifications ({notifications.length})
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
