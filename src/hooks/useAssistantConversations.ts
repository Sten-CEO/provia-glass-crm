import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  status: "open" | "closed";
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender: "user" | "assistant";
  content: string;
  created_at: string;
}

type ConversationRow = Conversation;
type MessageRow = Message;

export const useAssistantConversations = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(() => {
    return localStorage.getItem("assistant_active_conversation");
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch user's conversations
  const fetchConversations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("support_conversations" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setConversations((data || []) as unknown as ConversationRow[]);

      // If no active conversation and conversations exist, set first open one
      if (!activeConversationId && data && data.length > 0) {
        const openConv = ((data || []) as unknown as ConversationRow[]).find(c => c.status === "open");
        if (openConv) {
          setActiveConversationId(openConv.id);
          localStorage.setItem("assistant_active_conversation", openConv.id);
        }
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch messages for active conversation
  const fetchMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from("support_messages" as any)
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages((data || []) as unknown as MessageRow[]);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  // Create new conversation
  const createConversation = async (firstMessage: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create conversation with title from first message (truncated)
      const title = firstMessage.substring(0, 40) + (firstMessage.length > 40 ? "..." : "");
      
      const { data: conversation, error: convError } = await supabase
        .from("support_conversations" as any)
        .insert({
          user_id: user.id,
          title,
          status: "open"
        })
        .select()
        .single();

      if (convError) throw convError;

      // Insert first message
      const { error: msgError } = await supabase
        .from("support_messages" as any)
        .insert({
          conversation_id: (conversation as unknown as ConversationRow).id,
          sender: "user",
          content: firstMessage
        });

      if (msgError) throw msgError;

      // Set as active conversation
      const conv = conversation as unknown as ConversationRow;
      setActiveConversationId(conv.id);
      localStorage.setItem("assistant_active_conversation", conv.id);
      
      // Refresh conversations and messages
      await fetchConversations();
      await fetchMessages(conv.id);

      return conv.id;
    } catch (error) {
      console.error("Error creating conversation:", error);
      toast({
        title: "Erreur",
        description: "Impossible de créer la conversation",
        variant: "destructive"
      });
      return null;
    }
  };

  // Send message to existing conversation
  const sendMessage = async (conversationId: string, content: string, sender: "user" | "assistant") => {
    try {
      const { error } = await supabase
        .from("support_messages" as any)
        .insert({
          conversation_id: conversationId,
          sender,
          content
        });

      if (error) throw error;

      // Update conversation updated_at
      await supabase
        .from("support_conversations" as any)
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId);

      // Refresh messages
      await fetchMessages(conversationId);
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le message",
        variant: "destructive"
      });
    }
  };

  // Close conversation
  const closeConversation = async (conversationId: string) => {
    try {
      const { error } = await supabase
        .from("support_conversations" as any)
        .update({ status: "closed" })
        .eq("id", conversationId);

      if (error) throw error;

      // If closing active conversation, clear active state
      if (activeConversationId === conversationId) {
        setActiveConversationId(null);
        localStorage.removeItem("assistant_active_conversation");
        setMessages([]);
      }

      // Refresh conversations
      await fetchConversations();
      
      toast({
        title: "Conversation clôturée",
        description: "La conversation a été clôturée"
      });
    } catch (error) {
      console.error("Error closing conversation:", error);
      toast({
        title: "Erreur",
        description: "Impossible de clôturer la conversation",
        variant: "destructive"
      });
    }
  };

  // Switch active conversation
  const switchConversation = (conversationId: string) => {
    setActiveConversationId(conversationId);
    localStorage.setItem("assistant_active_conversation", conversationId);
    fetchMessages(conversationId);
  };

  // Initial load
  useEffect(() => {
    fetchConversations();
  }, []);

  // Load messages when active conversation changes
  useEffect(() => {
    if (activeConversationId) {
      fetchMessages(activeConversationId);
    }
  }, [activeConversationId]);

  // Realtime subscriptions
  useEffect(() => {
    const conversationsChannel = supabase
      .channel("support_conversations_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_conversations"
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    const messagesChannel = supabase
      .channel("support_messages_changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
          filter: activeConversationId ? `conversation_id=eq.${activeConversationId}` : undefined
        },
        () => {
          if (activeConversationId) {
            fetchMessages(activeConversationId);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(conversationsChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, [activeConversationId]);

  // Delete a conversation permanently
  const deleteConversation = async (conversationId: string) => {
    try {
      // Delete all messages first
      const { error: msgError } = await supabase
        .from("support_messages" as any)
        .delete()
        .eq("conversation_id", conversationId);

      if (msgError) throw msgError;

      // Delete conversation
      const { error: convError } = await supabase
        .from("support_conversations" as any)
        .delete()
        .eq("id", conversationId);

      if (convError) throw convError;

      // If this was the active conversation, clear it
      if (activeConversationId === conversationId) {
        setActiveConversationId(null);
        setMessages([]);
        localStorage.removeItem("assistant_active_conversation");
      }

      // Refresh conversations list
      await fetchConversations();

      toast({
        title: "Conversation supprimée",
        description: "La conversation a été supprimée définitivement."
      });
    } catch (error) {
      console.error("Error deleting conversation:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la conversation.",
        variant: "destructive"
      });
    }
  };

  // Start a new conversation (clear active state)
  const startNewConversation = () => {
    setActiveConversationId(null);
    setMessages([]);
    localStorage.removeItem("assistant_active_conversation");
  };

  return {
    conversations,
    activeConversationId,
    messages,
    loading,
    createConversation,
    sendMessage,
    closeConversation,
    switchConversation,
    startNewConversation,
    deleteConversation
  };
};
