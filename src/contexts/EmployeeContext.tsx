import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EmployeeContextType {
  employeeId: string | null;
  employeeName: string;
  loading: boolean;
}

const EmployeeContext = createContext<EmployeeContextType | undefined>(undefined);

export const EmployeeProvider = ({ children }: { children: ReactNode }) => {
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [employeeName, setEmployeeName] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadEmployee();
  }, []);

  const loadEmployee = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/employee/login");
        return;
      }

      // Récupérer l'employé via user_id
      const { data: employee, error } = await supabase
        .from("equipe")
        .select("id, nom")
        .eq("user_id", user.id)
        .single();

      if (error || !employee) {
        toast.error("Profil employé introuvable");
        navigate("/employee/login");
        return;
      }

      setEmployeeId(employee.id);
      setEmployeeName(employee.nom);
    } catch (error) {
      console.error(error);
      toast.error("Erreur de chargement du profil");
    } finally {
      setLoading(false);
    }
  };

  return (
    <EmployeeContext.Provider value={{ employeeId, employeeName, loading }}>
      {children}
    </EmployeeContext.Provider>
  );
};

export const useEmployee = () => {
  const context = useContext(EmployeeContext);
  if (context === undefined) {
    throw new Error("useEmployee must be used within an EmployeeProvider");
  }
  return context;
};
