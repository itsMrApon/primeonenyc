import {
  Color,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Scene,
  type ColorRepresentation
} from "three";
import gsap from "gsap";

/**
 * Optional full-viewport color plane that can tween between brand fills
 * (lime hero → dark green body, etc.).
 */
export class BackgroundScene {
  readonly scene = new Scene();
  readonly #material: MeshBasicMaterial;
  readonly #mesh: Mesh;
  readonly #color = new Color("#d2ff00");

  constructor(initial: ColorRepresentation = "#d2ff00") {
    this.#material = new MeshBasicMaterial({
      color: initial,
      depthWrite: false,
      depthTest: false
    });
    this.#mesh = new Mesh(new PlaneGeometry(2, 2), this.#material);
    this.#mesh.frustumCulled = false;
    this.#mesh.renderOrder = -10;
    this.scene.add(this.#mesh);
    this.#color.set(initial);
  }

  setColor(color: ColorRepresentation, duration = 0.8) {
    const target = new Color(color);
    gsap.to(this.#color, {
      r: target.r,
      g: target.g,
      b: target.b,
      duration,
      ease: "power2.out",
      onUpdate: () => {
        this.#material.color.copy(this.#color);
      }
    });
  }

  dispose() {
    this.#mesh.geometry.dispose();
    this.#material.dispose();
  }
}
