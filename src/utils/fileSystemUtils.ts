/**
 * File System utility to save files using native File System Access API
 * allowing users to choose the destination folder on their computer.
 */

export async function saveProjectToComputer(
  data: Record<string, unknown>,
  suggestedFileName: string
): Promise<boolean> {
  const fileName = suggestedFileName.endsWith('.json')
    ? suggestedFileName
    : `${suggestedFileName.replace(/[^a-z0-9_-]/gi, '_')}.json`;

  // Use modern File System Access API if supported (prompts user for folder & file name)
  if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: fileName,
        types: [
          {
            description: 'Master Orchestrator Project (.json)',
            accept: { 'application/json': ['.json'] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(JSON.stringify(data, null, 2));
      await writable.close();
      return true;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // User voluntarily cancelled the Save As dialog
        return false;
      }
      console.warn('Native showSaveFilePicker failed, falling back to download link:', err);
    }
  }

  // Standard fallback using browser download mechanism
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return true;
}
