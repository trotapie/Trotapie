-- Repara politicas creadas antes de que profiles.role dejara de ser app_role.
-- Sin esta conversion PostgreSQL intenta comparar text con app_role al guardar
-- el perfil de un empleado con un rol administrable.
-- Se conserva la funcion heredada has_role(app_role) y se agrega esta sobrecarga
-- para que las politicas convertidas resuelvan roles dinamicos de tipo text.
CREATE OR REPLACE FUNCTION public.has_role(required_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles AS profile
    WHERE profile.id = auth.uid()
      AND profile.role = required_role
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_role(text) TO authenticated;

CREATE TEMP TABLE role_policy_repair (
  statement text NOT NULL
) ON COMMIT DROP;

DO $$
DECLARE
  policy_record record;
  policy_using text;
  policy_check text;
  policy_roles text;
BEGIN
  FOR policy_record IN
    SELECT
      policy.oid,
      policy.polname,
      policy.polcmd,
      policy.polpermissive,
      policy.polroles,
      namespace.nspname,
      relation.relname,
      pg_get_expr(policy.polqual, policy.polrelid) AS using_expression,
      pg_get_expr(policy.polwithcheck, policy.polrelid) AS check_expression
    FROM pg_policy AS policy
    INNER JOIN pg_class AS relation ON relation.oid = policy.polrelid
    INNER JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
    WHERE namespace.nspname = 'public'
      AND (
        coalesce(pg_get_expr(policy.polqual, policy.polrelid), '') ~ 'app_role'
        OR coalesce(pg_get_expr(policy.polwithcheck, policy.polrelid), '') ~ 'app_role'
      )
  LOOP
    policy_using := regexp_replace(policy_record.using_expression, '::(public\.)?app_role', '::text', 'g');
    policy_check := regexp_replace(policy_record.check_expression, '::(public\.)?app_role', '::text', 'g');

    SELECT coalesce(string_agg(
      CASE WHEN role_item.role_id = 0 THEN 'PUBLIC' ELSE quote_ident(database_role.rolname) END,
      ', '
    ), 'PUBLIC')
    INTO policy_roles
    FROM unnest(policy_record.polroles) AS role_item(role_id)
    LEFT JOIN pg_roles AS database_role ON database_role.oid = role_item.role_id;

    INSERT INTO role_policy_repair (statement)
    VALUES (format(
      'CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s%s%s',
      policy_record.polname,
      policy_record.nspname,
      policy_record.relname,
      CASE WHEN policy_record.polpermissive THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
      CASE policy_record.polcmd
        WHEN 'r' THEN 'SELECT'
        WHEN 'a' THEN 'INSERT'
        WHEN 'w' THEN 'UPDATE'
        WHEN 'd' THEN 'DELETE'
        ELSE 'ALL'
      END,
      policy_roles,
      CASE WHEN policy_using IS NULL THEN '' ELSE ' USING (' || policy_using || ')' END,
      CASE WHEN policy_check IS NULL THEN '' ELSE ' WITH CHECK (' || policy_check || ')' END
    ));

    EXECUTE format('DROP POLICY %I ON %I.%I', policy_record.polname, policy_record.nspname, policy_record.relname);
  END LOOP;
END
$$;

DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN SELECT statement FROM role_policy_repair LOOP
    EXECUTE policy_record.statement;
  END LOOP;
END
$$;
