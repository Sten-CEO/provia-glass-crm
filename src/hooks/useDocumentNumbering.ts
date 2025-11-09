import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type DocumentType = "quote" | "invoice" | "credit_note";

export function useDocumentNumbering(type: DocumentType) {
  return useQuery({
    queryKey: ["document_numbering", type],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_numbering")
        .select("*")
        .eq("type", type)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
}

export function useGenerateDocumentNumber(type: DocumentType) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Get current numbering config
      const { data: config, error: fetchError } = await supabase
        .from("document_numbering")
        .select("*")
        .eq("type", type)
        .single();

      if (fetchError) throw fetchError;

      // Check if we need to reset (new year)
      const now = new Date();
      const currentYear = now.getFullYear();
      const pattern = config.pattern;

      // Generate the number
      let number = config.next_number;

      // Replace pattern variables
      let generatedNumber = config.prefix;
      generatedNumber += pattern
        .replace("{YYYY}", String(currentYear))
        .replace("{YY}", String(currentYear).slice(-2))
        .replace("{MM}", String(now.getMonth() + 1).padStart(2, "0"))
        .replace("{####}", String(number).padStart(4, "0"));

      // Increment next_number
      const { error: updateError } = await supabase
        .from("document_numbering")
        .update({ next_number: number + 1 })
        .eq("id", config.id);

      if (updateError) throw updateError;

      return generatedNumber;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document_numbering", type] });
    },
  });
}

export function generateNumberPreview(
  prefix: string,
  pattern: string,
  nextNumber: number
): string {
  const now = new Date();
  const currentYear = now.getFullYear();

  let preview = prefix;
  preview += pattern
    .replace("{YYYY}", String(currentYear))
    .replace("{YY}", String(currentYear).slice(-2))
    .replace("{MM}", String(now.getMonth() + 1).padStart(2, "0"))
    .replace("{####}", String(nextNumber).padStart(4, "0"));

  return preview;
}
