import type { Group } from "three";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

let gltfLoader: GLTFLoader | null = null;
const cache = new Map<string, Promise<Group>>();

function getLoader() {
  if (!gltfLoader) {
    const draco = new DRACOLoader().setDecoderPath("/gl/draco/");
    gltfLoader = new GLTFLoader().setDRACOLoader(draco);
  }
  return gltfLoader;
}

/** Load a (Draco) GLB once; callers get the same scene and clone what they need. */
export function loadModel(url: string): Promise<Group> {
  let pending = cache.get(url);
  if (!pending) {
    pending = getLoader().loadAsync(url).then((gltf) => gltf.scene);
    cache.set(url, pending);
  }
  return pending;
}
