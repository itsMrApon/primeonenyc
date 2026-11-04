import {
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  type ShaderMaterial,
  type WebGLRenderer,
  type WebGLRenderTarget
} from "three";

const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
const geometry = new PlaneGeometry(2, 2);

/** One full-screen quad drawn with a ShaderMaterial, to a target or the screen. */
export class FullscreenPass<M extends ShaderMaterial = ShaderMaterial> {
  readonly scene = new Scene();
  readonly mesh: Mesh<PlaneGeometry, M>;

  constructor(readonly material: M) {
    this.mesh = new Mesh(geometry, material);
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);
  }

  render(renderer: WebGLRenderer, target: WebGLRenderTarget | null) {
    renderer.setRenderTarget(target);
    renderer.render(this.scene, camera);
  }

  dispose() {
    this.material.dispose();
  }
}
