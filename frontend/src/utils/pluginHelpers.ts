/**
 * Returns a formatted display name for a plugin with version if available
 * @param name - The plugin name
 * @param version - The optional plugin version
 *
 * @returns Formatted string like "PluginName (v1.2.3)" or just "PluginName" if version is undefined
 */
export function getPluginDisplayName(name: string, version?: string): string {
  if (version) {
    return `${name} (v${version})`;
  }

  return name;
}
