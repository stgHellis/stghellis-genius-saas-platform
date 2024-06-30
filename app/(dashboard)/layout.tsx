import Navbar from "@/components/navbar";
import Sidebar from "@/components/sidebar";
import { getApiLimitCount } from "@/lib/api-limit";
import { checkSubscription } from "@/lib/subscription";

// Ceci est une fonction asynchrone appelée DashboardLayout qui prend un objet avec une propriété children 
// comme argument. children est de type React.ReactNode, ce qui signifie qu’il peut être n’importe quel élément React 
// valide.
const DashboardLayout = async ({ children }: { children: React.ReactNode }) => {
  // Cette ligne appelle une fonction asynchrone getApiLimitCount qui récupère le nombre de requêtes 
  // API restantes pour l’utilisateur. Le mot-clé await est utilisé pour attendre que la promesse soit résolue 
  // avant de continuer.
  const apiLimitCount = await getApiLimitCount();

  // De même, cette ligne appelle une fonction asynchrone checkSubscription qui vérifie probablement 
  // si l’utilisateur a un abonnement Pro. Le résultat est stocké dans la variable isPro.
  const isPro = await checkSubscription();

  return (
    <div className="h-full relative">
      <div className="hidden h-full md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-[80] bg-gray-900">
        <Sidebar isPro={isPro} apiLimitCount={apiLimitCount} />
      </div>
      <main className="md:pl-72 pb-10">
        <Navbar />
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;
