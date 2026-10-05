import { execFileSync } from 'node:child_process';

import { expect, type Page } from '@playwright/test';

import { supabaseStatus } from '../support/supabase.mjs';

/** Requête SQL directe sur la base locale (préparation des données et vérifications). */
export function sql(query: string): string {
  return execFileSync(
    'psql',
    ['-X', '-q', '-tA', (supabaseStatus() as { DB_URL: string }).DB_URL, '-c', query],
    {
      encoding: 'utf8',
    },
  ).trim();
}

/** Bouton ou lien par son nom accessible. */
export function button(page: Page, name: string | RegExp) {
  const exact = typeof name === 'string';
  return page.getByRole('button', { name, exact }).or(page.getByRole('link', { name, exact }));
}

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@exemple.be`;
}

/** Inscription d'un nouveau parent ; renvoie son adresse. */
export async function signUp(page: Page, prefix: string): Promise<string> {
  const email = uniqueEmail(prefix);
  await page.goto('/');
  await button(page, 'Pas encore de compte ? Inscription').click();
  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByLabel('Mot de passe').fill('motdepasse1');
  await button(page, 'Créer mon compte').click();
  await expect(page.getByText('Vos enfants')).toBeVisible();
  return email;
}

/** Titre de la carte d'un enfant dans le cockpit : « <avatar> <pseudonyme> ». */
export function childTitle(page: Page, alias: string) {
  return page.getByRole('heading', {
    name: new RegExp(`^\\S+ ${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`),
  });
}

/** Famille du parent inscrit avec cette adresse. */
export function familyOf(email: string): string {
  return sql(
    `select p.family_id from parent p join auth.users u on u.id = p.user_id where u.email = '${email}'`,
  );
}

/** Enfant d'une famille, par son pseudonyme (les tests tournent en parallèle sur la même base). */
export function childOf(email: string, alias: string): string {
  return sql(`select id from child_profile where family_id = '${familyOf(email)}' and alias = '${alias}'`);
}

export async function addChild(
  page: Page,
  email: string,
  alias: string,
  { grade = '5e primaire', needs = [] as string[] } = {},
): Promise<{ childId: string; familyId: string }> {
  await button(page, 'Ajouter un enfant').click();
  await page.getByLabel("Pseudonyme de l'enfant").fill(alias);
  await page.getByRole('radio', { name: grade }).click();
  for (const need of needs) await page.getByRole('checkbox', { name: need }).click();
  if (needs.length > 0) await page.getByRole('checkbox', { name: /J'accepte/ }).click();
  await button(page, 'Enregistrer').click();
  await expect(childTitle(page, alias)).toBeVisible();
  return { childId: childOf(email, alias), familyId: familyOf(email) };
}

/** Tâches validées par le parent, comme après l'analyse d'une photo. */
export function insertValidatedTasks(familyId: string, childId: string) {
  sql(`insert into task (family_id, child_id, subject, kind, description, due_date, reference, status) values
    ('${familyId}', '${childId}', 'Mathématiques', 'devoir', 'Faire les exercices de division', current_date + 1, 'p. 34', 'validated'),
    ('${familyId}', '${childId}', 'Éveil', 'interro', 'Revoir les fleuves de Belgique', current_date + 4, null, 'validated'),
    ('${familyId}', '${childId}', 'Éveil', 'lecon', 'Étudier la Meuse et l''Escaut', current_date + 1, null, 'validated')`);
}

/**
 * Calcule et publie le planning de la semaine, puis attend que les fiches des leçons et interrogations
 * (préparées en arrière-plan par l'IA) soient enregistrées.
 */
export async function publishPlanning(page: Page, alias: string, childId: string) {
  await button(page, 'Planning de la semaine').click();
  await button(page, 'Calculer le planning').click();
  await expect(page.getByText('Proposition')).toBeVisible();
  await button(page, "Publier sur la console de l'enfant").click();
  await expect(page.getByText(`Semaine de ${alias}`)).toBeVisible();
  await expect
    .poll(() => Number(sql(`select count(*) from study_pack where child_id = '${childId}'`)), {
      timeout: 60_000,
    })
    .toBeGreaterThanOrEqual(2);
  await expect(page.getByText(/Préparation des fiches/)).toHaveCount(0, { timeout: 60_000 });
}

/** Ouvre la console enfant en créant le code parent 2809. */
export async function enterChildMode(page: Page, alias: string) {
  await button(page, 'Lancer la mission du jour').click();
  for (const digit of '2809') await button(page, digit).click();
  await expect(page.getByText('Saisissez à nouveau')).toBeVisible();
  for (const digit of '2809') await button(page, digit).click();
  await expect(page.getByText(`Bonjour ${alias}`)).toBeVisible();
}

/**
 * Ouvre l'entraînement de la première activité qui en propose un. Selon le profil (TDAH), la console n'affiche
 * qu'une activité à la fois et l'ordre du jour varie : les activités « à faire » qui précèdent sont cochées.
 */
export async function openTraining(page: Page) {
  for (let i = 0; i < 5; i++) {
    const celebration = button(page, 'Super !');
    if (await celebration.isVisible().catch(() => false)) await celebration.click();
    const training = button(page, "S'entraîner").first();
    if (await training.isVisible().catch(() => false)) {
      await training.click();
      return;
    }
    await button(page, "C'est fait !").first().click();
    await page.waitForTimeout(500);
  }
  throw new Error('Aucune activité avec entraînement dans la mission du jour.');
}
