import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/hooks/useAssistantConversations";

interface ConversationTabProps {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
  onClose: () => void;
}

export const ConversationTab = ({ conversation, isActive, onClick, onClose }: ConversationTabProps) => {
  return (
    <div
      className={cn(
        "group relative p-2 rounded-lg cursor-pointer transition-colors border",
        isActive 
          ? "bg-primary/10 border-primary" 
          : "bg-background hover:bg-muted border-transparent"
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="flex-1 min-w-0">
          <p className={cn(
            "text-xs font-medium truncate",
            isActive ? "text-primary" : "text-foreground"
          )}>
            {conversation.title}
          </p>
          <div className="flex items-center gap-1 mt-1">
            <Badge 
              variant={conversation.status === "open" ? "default" : "secondary"}
              className="text-[10px] h-4 px-1"
            >
              {conversation.status === "open" ? "Ouvert" : "Clôturé"}
            </Badge>
          </div>
        </div>
        {conversation.status === "open" && (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
};
