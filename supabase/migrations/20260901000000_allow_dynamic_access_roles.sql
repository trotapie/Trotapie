-- Los roles de acceso son administrables desde la aplicacion, por lo que no
-- pueden depender del enum app_role con valores cerrados. Algunas politicas
-- RLS dependen de profiles.role; se respaldan y recrean durante la conversion.
CREATE TEMP TABLE role_policy_backup (
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
    SELECT DISTINCT ON (policy.oid)
      policy.oid,
      policy.polname,
      policy.polcmd,
      policy.polpermissive,
      policy.polroles,
      policy.polrelid,
      namespace.nspname,
      relation.relname,
      pg_get_expr(policy.polqual, policy.polrelid) AS using_expression,
      pg_get_expr(policy.polwithcheck, policy.polrelid) AS check_expression
    FROM pg_policy AS policy
    INNER JOIN pg_class AS relation ON relation.oid = policy.polrelid
    INNER JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
    INNER JOIN pg_depend AS dependency ON dependency.objid = policy.oid
    WHERE dependency.classid = 'pg_policy'::regclass
      AND dependency.refobjid = 'public.profiles'::regclass
      AND dependency.refobjsubid = (
        SELECT attnum
        FROM pg_attribute
        WHERE attrelid = 'public.profiles'::regclass
          AND attname = 'role'
          AND NOT attisdropped
      )
    ORDER BY policy.oid
  LOOP
    policy_using := replace(replace(policy_record.using_expression, '::public.app_role', '::text'), '::app_role', '::text');
    policy_check := replace(replace(policy_record.check_expression, '::public.app_role', '::text'), '::app_role', '::text');
    SELECT coalesce(string_agg(
      CASE WHEN role_item.role_id = 0 THEN 'PUBLIC' ELSE quote_ident(database_role.rolname) END,
      ', '
    ), 'PUBLIC')
    INTO policy_roles
    FROM unnest(policy_record.polroles) AS role_item(role_id)
    LEFT JOIN pg_roles AS database_role ON database_role.oid = role_item.role_id;

    INSERT INTO role_policy_backup (statement)
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

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'roles'
      AND column_name = 'key'
      AND udt_name = 'app_role'
  ) THEN
    ALTER TABLE public.roles
      ALTER COLUMN key DROP DEFAULT,
      ALTER COLUMN key TYPE text USING key::text;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'role'
      AND udt_name = 'app_role'
  ) THEN
    ALTER TABLE public.profiles ALTER COLUMN role DROP DEFAULT;
    ALTER TABLE public.profiles ALTER COLUMN role TYPE text USING role::text;
    ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'empleado';
  END IF;
END
$$;

DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN SELECT statement FROM role_policy_backup LOOP
    EXECUTE policy_record.statement;
  END LOOP;
END
$$;
