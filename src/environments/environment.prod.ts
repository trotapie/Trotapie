import { supabaseConfig } from './environment.generated';

export const environment = {
  production: true,
  ...supabaseConfig,
};
