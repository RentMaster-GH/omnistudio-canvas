/// <reference types="vite/client" />

declare module '*.css';

declare namespace NodeJS {
  interface ProcessEnv {
    REACT_APP_SUPABASE_URL?: string;
    REACT_APP_SUPABASE_ANON_KEY?: string;
  }
}
declare const process: {
  env: {
    [key: string]: string | undefined;
  };
};