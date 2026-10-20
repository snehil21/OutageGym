import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { parse } from "yaml";

const repositoryRoot = "/workspace";
const scenariosRoot = path.join(repositoryRoot, "scenarios");
const schemaPath = path.join(
  repositoryRoot,
  "schemas",
  "scenario-manifest.schema.json",
);

const schema = JSON.parse(await readFile(schemaPath, "utf8"));
const ajv = new Ajv2020({ allErrors: true });
addFormats(ajv);
const validate = ajv.compile(schema);

const validateIncident = async (incidentId) => {
  const scenarioDirectory = path.join(scenariosRoot, incidentId);
  const manifestPath = path.join(scenarioDirectory, "manifest.yaml");
  const manifest = parse(await readFile(manifestPath, "utf8"));

  if (!validate(manifest)) {
    const details = validate.errors
      .map((error) => `${error.instancePath || "/"} ${error.message}`)
      .join("\n");

    throw new Error(`Invalid scenario manifest for ${incidentId}:\n${details}`);
  }

  if (manifest.id !== incidentId) {
    throw new Error(
      `Scenario directory ${incidentId} contains manifest ID ${manifest.id}`,
    );
  }

  await Promise.all(
    Object.values(manifest.documents).map(async (relativePath) => {
      await access(path.join(scenarioDirectory, relativePath));
    }),
  );

  console.log(`Scenario manifest is valid: ${incidentId}`);
};

const target = process.argv[2];

if (target === "--all") {
  const entries = await readdir(scenariosRoot, { withFileTypes: true });
  const incidentIds = entries
    .filter((entry) => entry.isDirectory() && /^inc-[0-9]{3}$/.test(entry.name))
    .map((entry) => entry.name)
    .sort();

  if (incidentIds.length === 0) {
    throw new Error("No scenario manifests were found");
  }

  for (const incidentId of incidentIds) {
    await validateIncident(incidentId);
  }
} else {
  if (target === undefined || !/^inc-[0-9]{3}$/.test(target)) {
    throw new Error("Usage: validate.mjs inc-NNN|--all");
  }

  await validateIncident(target);
}
