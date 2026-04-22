import { CollectionSettingsShell } from '@/components/collection-settings/CollectionSettingsShell';

export default function CollectionSettingsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  return <CollectionSettingsShell collectionId={params.id}>{children}</CollectionSettingsShell>;
}
