import * as THREE from 'three'

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

interface Props {
  scene: THREE.Scene
}

export default class Model {
  scene: THREE.Scene
  loader: GLTFLoader
  model: THREE.Group
  mixer: THREE.AnimationMixer | null

  constructor({ scene }: Props) {
    this.scene = scene
    this.loader = new GLTFLoader()
    this.mixer = null

    this.loadGLTF()
  }

  loadGLTF() {
    this.loader.load('/astronaut-v1/scene.gltf', (gltf) => {
      this.model = gltf.scene
      this.model.position.y = -3.3

      this.mixer = new THREE.AnimationMixer(this.model)
      this.mixer.clipAction(gltf.animations[0]).play()

      this.model.traverse((child) => {
        if ('isMesh' in child && child.isMesh) {
          const childMaterial = (child as THREE.Mesh).material as THREE.MeshStandardMaterial
          childMaterial.map = null
        }
      })

      this.scene.add(this.model)
    })
  }

  update(delta: number) {
    this.mixer?.update(delta)
  }
}
