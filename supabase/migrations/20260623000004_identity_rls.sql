-- ============================================================================
-- OSIA · S1.2-H3 · Row Level Security (deny-all + ownership por auth.uid())
--
-- Defensa en profundidad (docs/09): RLS es la ÚLTIMA línea, no la única. El cliente no
-- toca estos schemas por PostgREST (van por apps/api con service_role, que hace BYPASSRLS);
-- aun así, si algún día se exponen, el ownership por `auth.uid()` se sostiene.
--
-- Habilitar RLS sin policy = deny-all para anon/authenticated. Se conceden solo las lecturas/
-- escrituras propias. Roles Supabase: anon | authenticated | service_role. Ver docs/04 §13.5.
-- ============================================================================

-- Acceso de esquema (no expone por PostgREST — eso es config del proyecto; solo permite que
-- las policies apliquen si se expone). service_role opera el backend.
GRANT USAGE ON SCHEMA identity, world TO authenticated;
GRANT USAGE ON SCHEMA identity, world TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA identity, world TO service_role;

-- ============================ accounts ============================
ALTER TABLE identity.accounts ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON identity.accounts TO authenticated;
CREATE POLICY accounts_select_own ON identity.accounts
  FOR SELECT TO authenticated
  USING (id = auth.uid() AND deleted_at IS NULL);

-- ============================ profiles ============================
ALTER TABLE identity.profiles ENABLE ROW LEVEL SECURITY;
GRANT SELECT, UPDATE ON identity.profiles TO authenticated;
-- Lectura: dueño siempre; o member autenticado si el perfil no es privado; nunca borrados.
CREATE POLICY profiles_select ON identity.profiles
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL AND (
      account_id = auth.uid()
      OR (privacy->>'profile') IN ('public','members')
    )
  );
-- Edición: solo el dueño.
CREATE POLICY profiles_update_own ON identity.profiles
  FOR UPDATE TO authenticated
  USING (account_id = auth.uid())
  WITH CHECK (account_id = auth.uid());

-- ============================ avatars ============================
ALTER TABLE identity.avatars ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON identity.avatars TO authenticated;
CREATE POLICY avatars_rw_own ON identity.avatars
  FOR ALL TO authenticated
  USING (account_id = auth.uid())
  WITH CHECK (account_id = auth.uid());

-- ====================== email_verifications ======================
-- Service-only: ningún acceso de cliente (deny-all). apps/api lo gestiona con service_role.
ALTER TABLE identity.email_verifications ENABLE ROW LEVEL SECURITY;

-- ============================ invitations ============================
ALTER TABLE identity.invitations ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON identity.invitations TO authenticated;
-- Solo veo las invitaciones que YO emití (la creación/canje van por apps/api).
CREATE POLICY invitations_select_own ON identity.invitations
  FOR SELECT TO authenticated
  USING (inviter_account_id = auth.uid());

-- ========================= waitlist_entries =========================
-- Service-only: el alta de waitlist entra por apps/api (anti-spam + idempotencia). Deny-all.
ALTER TABLE identity.waitlist_entries ENABLE ROW LEVEL SECURITY;

-- ============================ world: worlds / zones ============================
-- Contenido de mundo: lectura pública para autenticados (solo lo `live`); escritura service.
ALTER TABLE world.worlds ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON world.worlds TO authenticated;
CREATE POLICY worlds_select_live ON world.worlds
  FOR SELECT TO authenticated
  USING (status = 'live');

ALTER TABLE world.zones ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON world.zones TO authenticated;
CREATE POLICY zones_select_live ON world.zones
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM world.worlds w WHERE w.id = world_id AND w.status = 'live'));

-- ============== world: world_instances / presence_sessions ==============
-- Service-only: el cliente recibe su instancia/presencia por el world-server, no por REST
-- (docs/04 §4.3). Deny-all para el cliente.
ALTER TABLE world.world_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE world.presence_sessions ENABLE ROW LEVEL SECURITY;
