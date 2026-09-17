BEGIN;

-- The lock closes the gap between the preflight and index creation.
-- It waits for in-flight projection updates and blocks new ones until COMMIT.
LOCK TABLE business_profiles IN ACCESS EXCLUSIVE MODE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM business_profiles
    WHERE publication_status = 'PUBLISHED'
    GROUP BY organization_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'published business profile uniqueness preflight failed';
  END IF;
END;
$$;

CREATE UNIQUE INDEX business_profile_one_published_per_organization_unique
  ON business_profiles (organization_id)
  WHERE publication_status = 'PUBLISHED';

COMMIT;
