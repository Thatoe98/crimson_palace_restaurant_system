import { Sidebar } from "./Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <div className="pl-64">
        <main className="p-8">
            {children}
        </main>
      </div>
    </div>
  );
}
