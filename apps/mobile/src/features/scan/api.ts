import type { DocumentType, Remediation, TaskKind, VocabularyEntry } from '@cote-a-cote/shared';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { randomUUID } from '@/lib/uuid';

import { syncReminders } from '@/features/reminders/sync';
import { supabase } from '@/lib/supabase';

import { jpegBytes, type PreparedImage } from './image';

export type ScanStatus = 'uploaded' | 'processing' | 'draft' | 'validated' | 'failed';

export interface Scan {
  id: string;
  child_id: string;
  document_type: DocumentType | null;
  status: ScanStatus;
  error: string | null;
  /** Mots d'une dictée préparée (ou mots à revoir d'une dictée corrigée) relevés sur la photo. */
  spelling_words: string[] | null;
  /** Liste de vocabulaire lue sur la photo. */
  vocabulary: VocabularyEntry[] | null;
  vocabulary_subject: string | null;
  /** Tâche créée avec les cartes de cette liste. */
  vocabulary_task_id: string | null;
}

export interface TaskRow {
  id: string;
  child_id: string;
  scan_id: string | null;
  subject: string;
  kind: TaskKind;
  description: string;
  due_date: string | null;
  reference: string | null;
  confidence: number | null;
  status: 'draft' | 'validated' | 'done';
  /** Interrogation corrigée : erreurs relevées pour la remédiation. */
  remediation: Remediation | null;
}

const TASK_COLUMNS =
  'id, child_id, scan_id, subject, kind, description, due_date, reference, confidence, status, remediation';

export function useFamilyId() {
  return useQuery({
    queryKey: ['family_id'],
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await supabase.from('parent').select('family_id').single();
      if (error) throw error;
      return data.family_id as string;
    },
  });
}

interface SubmitScanInput {
  familyId: string;
  childId: string;
  documentType: DocumentType;
  /** Pages du document, dans l'ordre. */
  pages: PreparedImage[];
}

/** Envoie les pages d'un document dans le dossier privé de la famille et crée la numérisation. */
export async function submitScan({
  familyId,
  childId,
  documentType,
  pages,
}: SubmitScanInput): Promise<string> {
  const scanId = randomUUID();
  // Première page : <famille>/<numérisation>.jpg ; les suivantes : <numérisation>-2.jpg, -3.jpg…
  const paths = pages.map((_, i) => `${familyId}/${scanId}${i === 0 ? '' : `-${i + 1}`}.jpg`);
  const removeAll = () => supabase.storage.from('scans').remove(paths);

  const uploads = await Promise.all(
    pages.map((page, i) =>
      supabase.storage.from('scans').upload(paths[i]!, jpegBytes(page), { contentType: 'image/jpeg' }),
    ),
  );
  const failed = uploads.find((upload) => upload.error);
  if (failed) {
    await removeAll();
    throw failed.error;
  }

  const { error } = await supabase.from('scan').insert({
    id: scanId,
    child_id: childId,
    document_type: documentType,
    storage_path: paths[0],
    extra_storage_paths: paths.slice(1),
  });
  if (error) {
    await removeAll();
    throw error;
  }
  return scanId;
}

/** Analyse d'un document par l'IA (fonction serveur) ; l'erreur porte un message lisible par le parent. */
export async function processScan(scanId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('scan-extract', { body: { scanId } });
  if (error instanceof FunctionsHttpError) {
    const body = (await error.context.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "L'analyse a échoué. Réessayez dans un instant.");
  }
  if (error) throw new Error('Connexion impossible. Vérifiez votre réseau et réessayez.');
}

/** Lance l'analyse par l'IA (fonction serveur). */
export function useProcessScan(scanId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => processScan(scanId),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['scan', scanId] });
      queryClient.invalidateQueries({ queryKey: ['scan_tasks', scanId] });
      queryClient.invalidateQueries({ queryKey: ['pending_scans'] });
    },
  });
}

export interface PendingScan {
  id: string;
  document_type: DocumentType | null;
  status: Exclude<ScanStatus, 'validated'>;
  error: string | null;
  created_at: string;
  /** Pages encore à lire (photos pas encore analysées). */
  pages: number;
  /** Tâches lues sur le document. */
  tasks: number;
}

/** Documents d'un enfant pas encore validés : en attente, en cours de lecture, à relire ou en échec. */
export function usePendingScans(childId: string) {
  return useQuery({
    queryKey: ['pending_scans', childId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scan')
        .select(
          'id, document_type, status, error, created_at, storage_path, extra_storage_paths, task!task_scan_id_family_id_fkey(count)',
        )
        .eq('child_id', childId)
        .neq('status', 'validated')
        .order('created_at');
      if (error) throw error;
      return data.map((scan) => ({
        id: scan.id as string,
        document_type: scan.document_type as DocumentType | null,
        status: scan.status as PendingScan['status'],
        error: scan.error as string | null,
        created_at: scan.created_at as string,
        pages: scan.storage_path ? 1 + (scan.extra_storage_paths as string[]).length : 0,
        tasks: (scan.task as { count: number }[])[0]?.count ?? 0,
      }));
    },
    // Tant qu'un document est en attente ou en cours de lecture, on vérifie régulièrement son état.
    refetchInterval: (query) =>
      query.state.data?.some((scan) => scan.status === 'uploaded' || scan.status === 'processing')
        ? 3000
        : false,
  });
}

export function useScan(scanId: string) {
  return useQuery({
    queryKey: ['scan', scanId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scan')
        .select(
          'id, child_id, document_type, status, error, spelling_words, vocabulary, vocabulary_subject, vocabulary_task_id',
        )
        .eq('id', scanId)
        .single();
      if (error) throw error;
      return data as Scan;
    },
    // Tant que l'analyse tourne, on vérifie régulièrement son état.
    refetchInterval: (query) => (query.state.data?.status === 'processing' ? 3000 : false),
  });
}

export function useScanTasks(scanId: string) {
  return useQuery({
    queryKey: ['scan_tasks', scanId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task')
        .select(TASK_COLUMNS)
        .eq('scan_id', scanId)
        .order('due_date', { nullsFirst: false })
        .order('created_at');
      if (error) throw error;
      return data as TaskRow[];
    },
  });
}

export type TaskDraft = Pick<TaskRow, 'subject' | 'kind' | 'description' | 'due_date' | 'reference'>;

export function useSaveTask(scanId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, childId, draft }: { id?: string; childId: string; draft: TaskDraft }) => {
      const { error } = id
        ? await supabase.from('task').update(draft).eq('id', id)
        : await supabase.from('task').insert({ ...draft, child_id: childId, scan_id: scanId, confidence: 1 });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['scan_tasks', scanId] }),
  });
}

export function useDeleteTask(scanId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('task').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['scan_tasks', scanId] }),
  });
}

/** Abandon : supprime la numérisation, ses tâches en brouillon et les photos si elles existent encore. */
export function useAbandonScan(scanId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await supabase
        .from('scan')
        .select('storage_path, extra_storage_paths')
        .eq('id', scanId)
        .maybeSingle();
      if (data?.storage_path)
        await supabase.storage
          .from('scans')
          .remove([data.storage_path, ...((data.extra_storage_paths as string[]) ?? [])]);
      await supabase.from('task').delete().eq('scan_id', scanId).eq('status', 'draft');
      const { error } = await supabase.from('scan').delete().eq('id', scanId);
      if (error) throw error;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['pending_scans'] }),
  });
}

/** Le parent valide la liste : les tâches deviennent utilisables par le planning. */
export function useValidateScan(scanId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const tasks = await supabase
        .from('task')
        .update({ status: 'validated' })
        .eq('scan_id', scanId)
        .eq('status', 'draft');
      if (tasks.error) throw tasks.error;
      const scan = await supabase.from('scan').update({ status: 'validated' }).eq('id', scanId);
      if (scan.error) throw scan.error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scan', scanId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['pending_scans'] });
      void syncReminders();
    },
  });
}

/** Devoir ajouté à la main, sans photo : directement validé (le parent l'a écrit lui-même). */
export function useAddManualTask(childId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (draft: TaskDraft) => {
      const { error } = await supabase
        .from('task')
        .insert({ ...draft, child_id: childId, confidence: 1, status: 'validated' });
      if (error) throw new Error('L’enregistrement a échoué. Vérifiez votre connexion.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['premiers_pas'] });
      void syncReminders();
    },
  });
}
