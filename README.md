# React + Vite

## Supabase Auth Setup

FBPly is configured for this Supabase project:

```env
VITE_SUPABASE_URL=https://klvdaxyearifahfynhkd.supabase.co
VITE_SUPABASE_ANON_KEY=your_public_anon_key
```

Copy `.env.example` to `.env.local`, then paste the public anon key from Supabase Dashboard -> Project Settings -> API.

The app supports email login, email sign up, Google OAuth startup, persisted sessions, and sign out. If the anon key is missing, the UI keeps a safe demo fallback so local development does not break.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
