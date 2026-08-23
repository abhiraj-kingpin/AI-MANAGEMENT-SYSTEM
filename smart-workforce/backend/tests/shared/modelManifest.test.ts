import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';


const MODELS_DIR = path.join(__dirname, '..', '..', 'models');
const MANIFEST_PATH = path.join(MODELS_DIR, 'manifest.json');

interface ManifestEntry {
  file: string;
  sha256: string;
  sizeBytes: number;
}

interface Manifest {
  models: ManifestEntry[];
}

function sha256Of(filePath: string): string {
  const data = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(data).digest('hex');
}

describe('backend/models/manifest.json', () => {
  const manifest: Manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));

  it('is non-empty and every entry has the fields the integrity checks below rely on', () => {
    expect(manifest.models.length).toBeGreaterThan(0);
    for (const entry of manifest.models) {
      expect(entry.file).toEqual(expect.any(String));
      expect(entry.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(entry.sizeBytes).toBeGreaterThan(0);
    }
  });

  it.each(manifest.models.map((entry) => [entry.file, entry] as const))(
    '%s on disk matches its recorded checksum and size exactly',
    (_file, entry) => {
      const filePath = path.join(MODELS_DIR, entry.file);
      expect(fs.existsSync(filePath)).toBe(true);

      const { size } = fs.statSync(filePath);
      expect(size).toBe(entry.sizeBytes);
      expect(sha256Of(filePath)).toBe(entry.sha256);
    },
  );

  it('has no .onnx file in backend/models/ that is missing from the manifest', () => {
    const onnxFiles = fs.readdirSync(MODELS_DIR).filter((f) => f.endsWith('.onnx'));
    const manifestFiles = new Set(manifest.models.map((m) => m.file));

    const undocumented = onnxFiles.filter((f) => !manifestFiles.has(f));
    expect(undocumented).toEqual([]);
  });

  it('has no manifest entry pointing at a file that no longer exists', () => {
    const missing = manifest.models.filter((m) => !fs.existsSync(path.join(MODELS_DIR, m.file)));
    expect(missing).toEqual([]);
  });
});
