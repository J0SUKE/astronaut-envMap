import * as THREE from 'three'
import CustomShaderMaterial from 'three-custom-shader-material/vanilla'
import fragmentShader from '../shaders/fragment.glsl'

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

interface Props {
  scene: THREE.Scene
}

export default class Model {
  scene: THREE.Scene
  loader: GLTFLoader
  model: THREE.Group
  mixer: THREE.AnimationMixer | null
  material: CustomShaderMaterial

  constructor({ scene }: Props) {
    this.scene = scene
    this.loader = new GLTFLoader()
    this.mixer = null

    this.loadGLTF()
  }

  createMaterial(metalness: number, roughness: number) {
    return new CustomShaderMaterial({
      baseMaterial: THREE.MeshStandardMaterial,
      vertexShader: /* glsl */ ``,
      fragmentShader,
      silent: true, // Disables the default warning if true
      metalness,
      roughness,
      uniforms: {
        uTime: {
          value: 0,
        },
      },
      color: 'black',
    })
  }

  onMouseMove(mouse: THREE.Vector2) {
    if (!this.model) return
    //this.model.rotation.y = (mouse.x * Math.PI) / 4
    //this.model.rotation.x = (-mouse.y * Math.PI) / 30
  }

  loadGLTF() {
    this.loader.load('/astronaut-v1/scene.gltf', (gltf) => {
      this.model = gltf.scene
      this.model.position.y = -3.3

      this.mixer = new THREE.AnimationMixer(this.model)
      this.mixer.clipAction(gltf.animations[0]).play()

      this.model.traverse((child) => {
        if ('isMesh' in child && child.isMesh) {
          const childMesh = child as THREE.Mesh
          const childMaterial = childMesh.material as THREE.MeshStandardMaterial
          childMaterial.metalness
          childMesh.material = this.createMaterial(1, 0)
        }
      })

      this.scene.add(this.model)
    })
  }

  update(delta: number) {
    this.mixer?.update(delta)
  }
}
