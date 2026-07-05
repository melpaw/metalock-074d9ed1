import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserRound, ShieldCheck, FileCheck2 } from "lucide-react";
import { ProfileInfoTab } from "@/components/profile/ProfileInfoTab";
import { ProfileSecurityTab } from "@/components/profile/ProfileSecurityTab";
import { ProfileKycTab } from "@/components/profile/ProfileKycTab";

export const Route = createFileRoute("/_authenticated/app/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("profile.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("profile.subtitle")}</p>
      </div>

      <Tabs defaultValue="info" className="space-y-6">
        <TabsList className="grid grid-cols-3 max-w-lg">
          <TabsTrigger value="info" className="gap-1.5"><UserRound className="h-4 w-4" /> {t("profile.tabs.info")}</TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5"><ShieldCheck className="h-4 w-4" /> {t("profile.tabs.security")}</TabsTrigger>
          <TabsTrigger value="kyc" className="gap-1.5"><FileCheck2 className="h-4 w-4" /> {t("profile.tabs.kyc")}</TabsTrigger>
        </TabsList>
        <TabsContent value="info"><ProfileInfoTab /></TabsContent>
        <TabsContent value="security"><ProfileSecurityTab /></TabsContent>
        <TabsContent value="kyc"><ProfileKycTab /></TabsContent>
      </Tabs>
    </div>
  );
}
