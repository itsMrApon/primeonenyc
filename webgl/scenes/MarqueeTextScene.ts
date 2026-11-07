import { Group, Mesh, PerspectiveCamera, Scene, TextureLoader, type Texture } from "three";
import { MSDFTextGeometry, MSDFTextMaterial } from "three-msdf-text-utils";

import { raw } from "../passes/colors";

/**
 * Two endless MSDF text rows behind the hero card (reference "carouselScene"):
 *   top    Brier, #B2C73A, scale 0.0115, y 0.1355, drifting left
 *   bottom Mona,  #DDE1D2, scale 0.02,   y −0.62,  drifting right, group x-scale 0.9
 * Each row is two copies one period apart; the group wraps every period.
 * Camera: perspective 75°, z 4.5 (fitted to the reference frames).
 */
const DRIFT = 1.4; // world units per second (traced, constant)

interface RowSpec {
  text: string;
  font: string;
  color: string;
  scale: number;
  y: number;
  halfPeriod: number; // mesh x offset (traced): copies at ±halfPeriod
  groupScaleX: number;
  direction: -1 | 1;
  letterSpacing: number; // font units; from the reference geometry widths (1372 / 1073)
}

const ROWS: RowSpec[] = [
  { text: "WE DID IT AT HOME WE DID IT AT HOME", font: "Brier-Bold", color: "#b2c73a", scale: 0.0115, y: 0.1355, halfPeriod: 7.933, groupScaleX: 1, direction: -1, letterSpacing: -2 },
  { text: "A BRITISH GP WEEKEND I WILL REMEMBER FOREVER", font: "MonaSans-Bold", color: "#dde1d2", scale: 0.02, y: -0.62, halfPeriod: 10.77, groupScaleX: 0.9, direction: 1, letterSpacing: -1 }
];

export class MarqueeTextScene {
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(75, 1, 0.1, 1000);
  readonly #rows: { group: Group; period: number; direction: number }[] = [];

  constructor() {
    this.camera.position.z = 4.5;
  }

  async load() {
    const loader = new TextureLoader();
    const fonts = new Map<string, { json: unknown; atlas: Texture }>();
    for (const name of new Set(ROWS.map((r) => r.font))) {
      const [json, atlas] = await Promise.all([
        fetch(`/gl/fonts/${name}-msdf.json`).then((r) => r.json()),
        loader.loadAsync(`/gl/fonts/${name}-02.webp`)
      ]);
      fonts.set(name, { json, atlas });
    }

    for (const row of ROWS) {
      const font = fonts.get(row.font)!;
      const group = new Group();
      group.scale.x = row.groupScaleX;
      const geometry = new MSDFTextGeometry({ text: row.text, font: font.json, letterSpacing: row.letterSpacing });
      const material = new MSDFTextMaterial();
      material.uniforms.uMap.value = font.atlas;
      material.uniforms.uColor.value = raw(row.color);
      material.uniforms.uThreshold.value = 0.05;
      for (const side of [-1, 1]) {
        const mesh = new Mesh(geometry, material);
        mesh.scale.set(row.scale, -row.scale, -row.scale);
        mesh.position.set(side * row.halfPeriod, row.y, 0);
        group.add(mesh);
      }
      const period = row.halfPeriod * 2 * row.groupScaleX;
      group.position.x = row.direction > 0 ? -period : 0; // reference start positions
      this.scene.add(group);
      this.#rows.push({ group, period, direction: row.direction });
    }
  }

  /** Reference responsive(): px the text layer sits below its desktop place (0 above 768). */
  topMobile = 0;

  resize(width: number, height: number) {
    this.camera.aspect = width / Math.max(height, 1);
    this.camera.updateProjectionMatrix();
    // Reference responsive(): phones pull the camera back (smaller text) and drop the
    // whole text layer 35 % of the screen height, so the rows run below the card.
    const lerp = (a: number, b: number, t: number) => a + (b - a) * Math.min(Math.max(t, 0), 1);
    if (width > 768) this.camera.position.z = 4.5;
    else if (width >= 480) this.camera.position.z = lerp(11, 6.5, (width - 480) / 288);
    else this.camera.position.z = lerp(14, 9.5, (width - 320) / 160);
    this.topMobile = width > 768 ? 0 : height * 0.35;
  }

  update(dt: number) {
    for (const row of this.#rows) {
      let x = row.group.position.x + row.direction * DRIFT * dt;
      if (x <= -row.period) x += row.period;
      if (x > 0) x -= row.period;
      row.group.position.x = x;
    }
  }

  dispose() {
    this.scene.traverse((o) => {
      const m = o as Mesh;
      if (!m.isMesh) return;
      m.geometry.dispose();
      const mat = m.material as MSDFTextMaterial;
      mat.uniforms.uMap.value?.dispose();
      mat.dispose();
    });
  }
}
