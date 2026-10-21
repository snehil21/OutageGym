import assert from "node:assert/strict";
import test from "node:test";

import {
  createLocalAwsCredentials,
  readBoolean,
  readInteger,
  readLocalUrl,
  readRequired,
} from "../dist/index.js";

test("configuration readers accept valid local values", () => {
  const env = {
    ENABLED: "true",
    ENDPOINT: "http://floci:4566",
    PORT: "3000",
    REQUIRED: "value",
  };

  assert.equal(readBoolean(env, "ENABLED"), true);
  assert.equal(readInteger(env, "PORT", 1, 1, 65_535), 3_000);
  assert.equal(
    readLocalUrl(env, "ENDPOINT", new Set(["floci"]), "4566", "Floci"),
    env.ENDPOINT,
  );
  assert.equal(readRequired(env, "REQUIRED"), "value");
});

test("configuration readers reject unsafe or invalid values", () => {
  assert.throws(() => readBoolean({ ENABLED: "yes" }, "ENABLED"));
  assert.throws(() => readInteger({ PORT: "0" }, "PORT", 3_000, 1, 65_535));
  assert.throws(() =>
    readLocalUrl(
      { ENDPOINT: "https://sqs.us-east-1.amazonaws.com" },
      "ENDPOINT",
      new Set(["floci"]),
      "4566",
      "Floci",
    ),
  );
  assert.throws(() => readRequired({}, "REQUIRED"));
});

test("local AWS credentials are isolated per client", () => {
  const first = createLocalAwsCredentials();
  const second = createLocalAwsCredentials();

  assert.deepEqual(first, second);
  assert.notEqual(first, second);
});
