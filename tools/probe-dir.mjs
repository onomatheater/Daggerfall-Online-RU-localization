// Общий дефолт дерева пробы для CLI-гвардов: аргумент -> DFJS_SRC ->
// песочница этой машины (§0.1 AGENTS.md, в CI передавать явно).
export const SANDBOX_DFJS_SRC = 'C:/Users/kblue/AppData/Local/Temp/opencode/dfjs/src';

export function resolveProbeDir(cliArg, env = process.env) {
  if (typeof cliArg === 'string' && cliArg.length > 0) return cliArg;
  const fromEnv = env?.DFJS_SRC;
  if (typeof fromEnv === 'string' && fromEnv.length > 0) return fromEnv;
  return SANDBOX_DFJS_SRC;
}
