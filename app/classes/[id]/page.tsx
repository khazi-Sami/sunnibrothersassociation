import { redirect } from "next/navigation";

export default async function LegacyClassPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/education/live/${id}`);
}
