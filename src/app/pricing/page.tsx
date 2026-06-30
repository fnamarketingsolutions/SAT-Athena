import { MarketingNav } from "@/components/marketing/marketing-nav";
import { PricingPlans } from "@/components/marketing/pricing-plans";

export const metadata = {
  title: "Pricing — Athena",
  description: "Athena Family plan for Digital SAT prep.",
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingNav />
      <div className="pt-10">
        <PricingPlans paymentFirst />
      </div>
    </div>
  );
}
