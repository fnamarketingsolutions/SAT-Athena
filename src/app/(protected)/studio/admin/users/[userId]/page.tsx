import { AdminUserDetailPage } from "@/components/admin/admin-user-detail";

type Props = { params: Promise<{ userId: string }> };

export default async function Page({ params }: Props) {
  const { userId } = await params;
  return <AdminUserDetailPage userId={userId} />;
}
