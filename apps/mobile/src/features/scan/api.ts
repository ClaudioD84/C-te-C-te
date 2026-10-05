import type { Box, DocumentType, TaskKind } from '@cote-a-cote/shared';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { randomUUID } from '@/lib/uuid';

import { syncReminders } from '@/features/reminders/sync';
import { supabase } from '@/lib/supabase';

import { renderMaskedJpeg, type PreparedImage } from './image';

export type ScanStatus = 'uploaded' | 'processing' | 'draft' | 'validated' | 'failed';

export interface Scan {
  id: string;
  child_id: string;
  document_type: DocumentType | null;
  status: ScanStatus;
  error: string | null;
  /** Mots d'une dictée préparée relevés sur la photo. */
  spelling_words: string[] | null;
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
}

const TASK_COLUMNS =
  'id, child_id, scan_id, subject, kind, description, due_date, reference, confidence, status';

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
  image: PreparedImage;
  boxes: readonly Box[];
}

/** Applique les masques, envoie la photo dans le dossier privé de la famille et crée la numérisation. */
export async function submitScan({
  familyId,
  childId,
  documentType,
  image,
  boxes,
}: SubmitScanInput): Promise<string> {
  const scanId = randomUUID();
  const path = `${familyId}/${scanId}.jpg`;
  const body = await renderMaskedJpeg(image, boxes);

  const upload = await supabase.storage.from('scans').upload(path, body, { contentType: 'image/jpeg' });
  if (upload.error) throw upload.error;

  const { error } = await supabase
    .from('scan')
    .insert({ id: scanId, child_id: childId, document_type: documentType, storage_path: path });
  if (error) {
    await supabase.storage.from('scans').remove([path]);
    throw error;
  }
  return scanId;
}

/** Lance l'analyse par l'IA (fonction serveur). */
export function useProcessScan(scanId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke('scan-extract', { body: { scanId } });
      if (error instanceof FunctionsHttpError) {
        // Le serveur renvoie un message lisible par le parent.
        const body = (await error.context.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "L'analyse a échoué. Réessayez dans un instant.");
      }
      if (error) throw new Error('Connexion impossible. Vérifiez votre réseau et réessayez.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['scan', scanId] });
      queryClient.invalidateQueries({ queryKey: ['scan_tasks', scanId] });
    },
  });
}

export function useScan(scanId: string) {
  return useQuery({
    queryKey: ['scan', scanId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scan')
        .select('id, child_id, document_type, status, error, spelling_words')
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

/** Abandon : supprime la numérisation, ses tâches en brouillon et la photo si elle existe encore. */
export function useAbandonScan(scanId: string) {
  return useMutation({
    mutationFn: async () => {
      const { data } = await supabase.from('scan').select('storage_path').eq('id', scanId).maybeSingle();
      if (data?.storage_path) await supabase.storage.from('scans').remove([data.storage_path]);
      await supabase.from('task').delete().eq('scan_id', scanId).eq('status', 'draft');
      const { error } = await supabase.from('scan').delete().eq('id', scanId);
      if (error) throw error;
    },
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
      void syncReminders();
    },
  });
}
