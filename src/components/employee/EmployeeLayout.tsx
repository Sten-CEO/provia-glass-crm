import { Outlet } from "react-router-dom";
import { EmployeeTabBar } from "./EmployeeTabBar";
import { EmployeeHeader } from "./EmployeeHeader";

export const EmployeeLayout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <EmployeeHeader />
      
      <main className="flex-1 overflow-auto pb-20">
        <Outlet />
      </main>

      <EmployeeTabBar />
    </div>
  );
};
