import { Stack } from 'expo-router';

export default function ParentLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Cockpit parent' }} />
      <Stack.Screen name="profils/nouveau" options={{ title: 'Nouvel enfant', presentation: 'modal' }} />
      <Stack.Screen name="profils/[childId]" options={{ title: 'Modifier le profil' }} />
      <Stack.Screen name="code-parent" options={{ title: 'Code parent', presentation: 'modal' }} />
      <Stack.Screen name="scan/nouveau" options={{ title: 'Nouvelle photo' }} />
      <Stack.Screen name="scan/[scanId]" options={{ title: 'Vérification' }} />
      <Stack.Screen name="planning/[childId]" options={{ title: 'Planning' }} />
      <Stack.Screen name="compte" options={{ title: 'Mon compte' }} />
      <Stack.Screen name="abonnement" options={{ title: 'Abonnement' }} />
      <Stack.Screen name="rappels" options={{ title: 'Rappels' }} />
      <Stack.Screen name="programme/[childId]" options={{ title: "Programme de l'année" }} />
      <Stack.Screen name="paquet/[taskId]" options={{ title: 'Fiche et quiz' }} />
      <Stack.Screen name="examen/nouveau" options={{ title: 'Dossier de révision' }} />
      <Stack.Screen name="suivi/[childId]" options={{ title: 'Suivi' }} />
      <Stack.Screen name="maternelle/[childId]" options={{ title: 'Activités' }} />
      <Stack.Screen name="recompense/[childId]" options={{ title: 'Récompense' }} />
      <Stack.Screen name="vacances/[childId]" options={{ title: 'Vacances' }} />
      <Stack.Screen name="mot/[childId]" options={{ title: 'Petit mot' }} />
      <Stack.Screen name="cartable/[childId]" options={{ title: 'Cartable' }} />
      <Stack.Screen name="blocus/[childId]" options={{ title: 'Plan de blocus' }} />
      <Stack.Screen name="fratrie" options={{ title: 'Défi de la fratrie' }} />
      <Stack.Screen name="bilan-pro/[childId]" options={{ title: 'Bilan pour un professionnel' }} />
      <Stack.Screen name="appareils/[childId]" options={{ title: 'Tablette de l’enfant' }} />
    </Stack>
  );
}
