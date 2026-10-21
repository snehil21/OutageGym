export const readRequired = (env: NodeJS.ProcessEnv, name: string): string => {
  const value = env[name];

  if (value === undefined || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

export const readInteger = (
  env: NodeJS.ProcessEnv,
  name: string,
  fallback: number,
  minimum: number,
  maximum: number,
): number => {
  const value = env[name] ?? String(fallback);
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${name} must be an integer from ${minimum} to ${maximum}`);
  }

  return parsed;
};

export const readBoolean = (env: NodeJS.ProcessEnv, name: string): boolean => {
  const value = readRequired(env, name);

  if (value !== "true" && value !== "false") {
    throw new Error(`${name} must be true or false`);
  }

  return value === "true";
};

export const readLocalUrl = (
  env: NodeJS.ProcessEnv,
  name: string,
  allowedHosts: ReadonlySet<string>,
  expectedPort: string,
  serviceName: string,
): string => {
  const value = readRequired(env, name);
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid URL`);
  }

  if (
    url.protocol !== "http:" ||
    !allowedHosts.has(url.hostname) ||
    url.port !== expectedPort
  ) {
    throw new Error(
      `${name} must target the local ${serviceName} endpoint on port ${expectedPort}`,
    );
  }

  return value;
};
