import * as THREE from 'three'
import { Dimensions, Size } from '../types/types'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import GUI from 'lil-gui'
import Model from './model'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js'
import { fragmentShader } from '../shaders/blur-shader/blur-shader'

export default class Canvas {
  element: HTMLCanvasElement
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  sizes: Size
  dimensions: Dimensions
  time: number
  clock: THREE.Clock
  raycaster: THREE.Raycaster
  mouse: THREE.Vector2
  orbitControls: OrbitControls
  model: Model
  debug: GUI
  rgbeLoader: RGBELoader
  cubeCamera: THREE.CubeCamera
  torus: THREE.Mesh
  composer: EffectComposer
  renderTarget: THREE.WebGLRenderTarget
  plane: THREE.Mesh
  envMapShader: THREE.ShaderMaterial
  debugPlane: THREE.Mesh
  orthoCamera: THREE.OrthographicCamera

  constructor() {
    this.element = document.getElementById('webgl') as HTMLCanvasElement
    this.time = 0

    this.mouse = new THREE.Vector2()

    this.createClock()
    this.createScene()
    this.createCamera()
    this.createRenderer()
    this.setSizes()
    this.createOrbitControls()
    this.addEventListeners()
    this.createDebug()
    this.createEnvMapShader()
    this.setupEnvironementMap()
    this.createModel()
    this.createComposer()
    this.createBackgroundBufferTexture()
    this.render()
  }

  createScene() {
    this.scene = new THREE.Scene()
  }

  createCamera() {
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100)
    this.scene.add(this.camera)
    this.camera.position.z = 1
    this.camera.position.y = 0.4
    this.camera.position.x = 0.15
  }

  createOrbitControls() {
    this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement)
  }

  createRenderer() {
    this.dimensions = {
      width: window.innerWidth,
      height: window.innerHeight,
      pixelRatio: Math.min(2, window.devicePixelRatio),
    }

    this.renderer = new THREE.WebGLRenderer({ canvas: this.element, alpha: true })
    this.renderer.setSize(this.dimensions.width, this.dimensions.height)
    this.renderer.render(this.scene, this.camera)
    this.renderer.setClearColor(0x000000)
    this.renderer.setPixelRatio(this.dimensions.pixelRatio)
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 3
  }

  createComposer() {
    const params = {
      threshold: 0,
      strength: 0.7,
      radius: 0.6,
      exposure: 0.7,
    }

    const renderScene = new RenderPass(this.scene, this.camera)
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85)
    bloomPass.threshold = params.threshold
    bloomPass.strength = params.strength
    bloomPass.radius = params.radius

    const outputPass = new OutputPass()

    this.composer = new EffectComposer(this.renderer)
    this.composer.addPass(renderScene)
    this.composer.addPass(bloomPass)
    this.composer.addPass(outputPass)
  }

  createDebug() {
    this.debug = new GUI()
  }

  setSizes() {
    let fov = this.camera.fov * (Math.PI / 180)
    let height = this.camera.position.z * Math.tan(fov / 2) * 2
    let width = height * this.camera.aspect

    this.sizes = {
      width: width,
      height: height,
    }
  }

  createClock() {
    this.clock = new THREE.Clock()
  }

  onMouseMove(event: MouseEvent) {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1

    this.model.onMouseMove(this.mouse)
  }

  addEventListeners() {
    window.addEventListener('mousemove', this.onMouseMove.bind(this))
    window.addEventListener('resize', this.onResize.bind(this))
  }

  onResize() {
    this.dimensions = {
      width: window.innerWidth,
      height: window.innerHeight,
      pixelRatio: Math.min(2, window.devicePixelRatio),
    }

    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.setSizes()

    this.renderer.setPixelRatio(this.dimensions.pixelRatio)
    this.renderer.setSize(this.dimensions.width, this.dimensions.height)
  }

  createEnvMapShader() {
    this.envMapShader = new THREE.ShaderMaterial({
      uniforms: {
        uMap: new THREE.Uniform(
          new THREE.TextureLoader().load('/512.png', (tex) => {
            tex.mapping = THREE.EquirectangularReflectionMapping
            this.scene.background = tex
            this.scene.backgroundIntensity = 0.001
            this.scene.backgroundBlurriness = 0.3
          })
        ),
        uBluriness: {
          value: 10,
        },
        uDirection: {
          value: new THREE.Vector2(5, 5),
        },
        uResolution: {
          value: new THREE.Vector2(window.innerWidth, window.innerHeight),
        },
      },
      vertexShader: `
      varying vec2 vUv;
      void main()
      {
          vec4 modelPosition = modelMatrix * vec4(position, 1.0);
          vec4 viewPosition = viewMatrix * modelPosition;
          vec4 projectedPosition = projectionMatrix * viewPosition;
          gl_Position = projectedPosition;

          vUv=uv;
      }
    `,
      fragmentShader: `
      varying vec2 vUv;
      uniform sampler2D uMap;

      ${fragmentShader}

      void main()
      {
        vec2 uv = vUv;

        vec4 texel = texture2D(uMap,uv);
        //vec4 texel = vec4(vec2(vUv),1.,1.);

        //texel = blur(uMap, vUv, uResolution, uBluriness * uDirection);

        texel.b=max(texel.b,smoothstep(0.3,1.,texel.r)*10.);
        texel.r=min(texel.r,smoothstep(0.,0.3,texel.b)*3.);
        texel.g=min(texel.g,smoothstep(0.,0.3,texel.b)*3.); 

        gl_FragColor = texel;
      }
    `,
    })
  }

  setupEnvironementMap() {
    const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256, {
      type: THREE.HalfFloatType,
    })
    this.cubeCamera = new THREE.CubeCamera(0.1, 100, cubeRenderTarget)
    this.cubeCamera.layers.set(1)
    this.scene.environment = cubeRenderTarget.texture

    this.torus = new THREE.Mesh(new THREE.TorusGeometry(4, 1), this.envMapShader)

    this.torus.position.y = -1
    this.torus.layers.enable(1)
    this.torus.layers.disable(0)
    this.scene.add(this.torus)
  }

  createBackgroundBufferTexture() {
    this.renderTarget = new THREE.WebGLRenderTarget(1000, 1000, {
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
    })

    const width = 512
    const height = 128

    this.orthoCamera = new THREE.OrthographicCamera(-width / 2, width / 2, height / 2, -height / 2, 0, width / 2)
    this.orthoCamera.position.set(0, width / 4, 0)
    this.orthoCamera.lookAt(0, 0, 0)

    this.plane = new THREE.Mesh(new THREE.PlaneGeometry(width, height), this.envMapShader)
    this.plane.rotateX(-Math.PI / 2)

    this.debugPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(4, 2),
      new THREE.MeshBasicMaterial({
        map: null,
      })
    )

    //this.scene.add(this.debugPlane)
  }

  createModel() {
    this.model = new Model({ scene: this.scene })
  }

  render() {
    const time = this.clock.getElapsedTime()
    const delta = time - this.time

    this.time = this.clock.getElapsedTime()

    if (this.torus) this.torus.rotation.z = time * 0.3
    this.scene.backgroundRotation.y = time * 0.1

    this.orbitControls.update()

    this.model.update(delta)
    this.cubeCamera?.update(this.renderer, this.scene)

    this.renderer.setRenderTarget(this.renderTarget)
    this.renderer.render(this.plane, this.orthoCamera)

    const tex = this.renderTarget.texture
    tex.mapping = THREE.EquirectangularReflectionMapping
    this.scene.background = tex

    const m = this.debugPlane.material as THREE.MeshBasicMaterial
    m.map = tex

    this.renderer.setRenderTarget(null)

    this.composer.render()
  }
}
