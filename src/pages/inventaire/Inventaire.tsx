import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Inventaire = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Redirect to consommables by default
    navigate("/inventaire/consommables", { replace: true });
  }, [navigate]);

  return null;
};

export default Inventaire;
