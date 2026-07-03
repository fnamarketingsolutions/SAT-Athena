import { MarketingNav } from "@/components/marketing/marketing-nav";
import { PricingPlans } from "@/components/marketing/pricing-plans";

import { APP_BRANDING } from "@/lib/exam-config";

export const metadata = {
  title: `Pricing — ${APP_BRANDING.shortName}`,
  description: `${APP_BRANDING.shortName} — bar exam multiple-choice prep.`,
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
