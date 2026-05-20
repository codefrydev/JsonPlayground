import yaml from 'js-yaml';

/** Convert YAML string to JSON string. */
export function yamlToJson(yamlStr: string): { ok: true; json: string } | { ok: false; error: string } {
  try {
    const obj = yaml.load(yamlStr);
    return { ok: true, json: JSON.stringify(obj, null, 2) };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'YAML parse failed',
    };
  }
}

/** Convert JSON string to YAML string. */
export function jsonToYaml(jsonStr: string): { ok: true; yaml: string } | { ok: false; error: string } {
  try {
    const obj = JSON.parse(jsonStr) as unknown;
    const yamlStr = yaml.dump(obj, { indent: 2, lineWidth: -1 });
    return { ok: true, yaml: yamlStr };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Invalid JSON',
    };
  }
}
