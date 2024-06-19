import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import * as dat from 'dat.gui/build/dat.gui.module.js';

let scene, camera, renderer, composer, water, clock;
let drumVolumeControl;

init();
animate();

function init() {
    // Canvas
    const canvas = document.querySelector("canvas.webgl");

    // Scene
    scene = new THREE.Scene();

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(10, 40, 45);
    scene.add(camera);

    // Renderer
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Create the plane with glow effect
    const waterGeometry = new THREE.PlaneGeometry(40, 40, 512, 512);
    const waterMaterial = new THREE.ShaderMaterial({
        vertexShader: document.getElementById("vertexShader").textContent,
        fragmentShader: document.getElementById("fragmentShader").textContent,
        transparent: true,
        fog: true,
        uniforms: {
            uTime: { value: 0 },
            uBigWavesElevation: { value: 0.2 },
            uBigWavesFrequency: { value: new THREE.Vector2(4, 2) },
            uBigWaveSpeed: { value: 0.75 },
            uSmallWavesElevation: { value: 0.15 },
            uSmallWavesFrequency: { value: 3 },
            uSmallWavesSpeed: { value: 0.2 },
            uSmallWavesIterations: { value: 4 },
            uDepthColor: { value: new THREE.Color('#1e4d40') },
            uSurfaceColor: { value: new THREE.Color('#4d9aaa') },
            uColorOffset: { value: 0.08 },
            uColorMultiplier: { value: 5 },
            ...THREE.UniformsLib["fog"]
        }
    });

    water = new THREE.Mesh(waterGeometry, waterMaterial);
    water.rotation.x = -Math.PI * 0.5;
    scene.add(water);

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const pointLight = new THREE.DirectionalLight(0xffffff, 1);
    pointLight.position.set(1, 1, 1).normalize();
    scene.add(pointLight);

    // Post-processing for glow effect
    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.6,
        0.2,
        0.1
    );

    composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);

    // Controls
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;

    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);

    // Debug GUI
    const gui = new dat.GUI({ closed: false, width: 340 });
    const bigWavesFolder = gui.addFolder("Large Waves");
    const smallWavesFolder = gui.addFolder("Small Waves");
    const colorFolder = gui.addFolder("Colors");
    const debugObject = {
        waveDepthColor: "#1e4d40",
        waveSurfaceColor: "#4d9aaa",
        fogNear: 1,
        fogFar: 3,
        fogColor: "#8e99a2"
    };

    bigWavesFolder
        .add(waterMaterial.uniforms.uBigWavesElevation, "value")
        .min(0)
        .max(1)
        .step(0.001)
        .name("Elevation");
    bigWavesFolder
        .add(waterMaterial.uniforms.uBigWavesFrequency.value, "x")
        .min(0)
        .max(10)
        .step(0.001)
        .name("Frequency X");
    bigWavesFolder
        .add(waterMaterial.uniforms.uBigWavesFrequency.value, "y")
        .min(0)
        .max(10)
        .step(0.001)
        .name("Frequency Y");
    bigWavesFolder
        .add(waterMaterial.uniforms.uBigWaveSpeed, "value")
        .min(0.25)
        .max(5)
        .step(0.001)
        .name("Speed");

    smallWavesFolder
        .add(waterMaterial.uniforms.uSmallWavesElevation, "value")
        .min(0.0)
        .max(0.3)
        .step(0.001)
        .name("Elevation");
    smallWavesFolder
        .add(waterMaterial.uniforms.uSmallWavesFrequency, "value")
        .min(0)
        .max(30)
        .step(0.001)
        .name("Frequency");
    smallWavesFolder
        .add(waterMaterial.uniforms.uSmallWavesSpeed, "value")
        .min(0.0)
        .max(1)
        .step(0.001)
        .name("Speed");
    smallWavesFolder
        .add(waterMaterial.uniforms.uSmallWavesIterations, "value")
        .min(0)
        .max(10)
        .step(1)
        .name("Iterations");

    colorFolder
        .add(waterMaterial.uniforms.uColorOffset, "value")
        .min(0)
        .max(0.15)
        .step(0.0001)
        .name("Color Offset");
    colorFolder
        .add(waterMaterial.uniforms.uColorMultiplier, "value")
        .min(0.0)
        .max(10.0)
        .step(0.001)
        .name("Color multiplier");
    colorFolder
        .addColor(debugObject, "waveDepthColor")
        .name("Wave depth color")
        .onChange(() => {
            waterMaterial.uniforms.uDepthColor.value.set(debugObject.waveDepthColor);
        });
    colorFolder
        .addColor(debugObject, "waveSurfaceColor")
        .name("Wave surface color")
        .onChange(() => {
            waterMaterial.uniforms.uSurfaceColor.value.set(debugObject.waveSurfaceColor);
        });
    colorFolder
        .addColor(debugObject, "fogColor")
        .name("Fog Color")
        .onChange(() => {
            waterMaterial.uniforms.fogColor.value.set(debugObject.fogColor);
            scene.background.set(debugObject.fogColor);
            scene.fog = new THREE.Fog(
                debugObject.fogColor,
                debugObject.fogNear,
                debugObject.fogFar
            );
        });

    // Audio setup
    setupAudio();
}

function onWindowResize() {
    const sizes = {
        width: window.innerWidth,
        height: window.innerHeight
    };

    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    composer.setSize(sizes.width, sizes.height);
}

function animate() {
    requestAnimationFrame(animate);

    const elapsedTime = clock.getElapsedTime();
    water.material.uniforms.uTime.value = elapsedTime;

    composer.render();
}

function setupAudio() {
    const audioSources = [
        'supernova/Supernova_bass.mp3',
        'supernova/Supernova_drum.mp3',
        'supernova/Supernova_vocal.mp3',
        'supernova/Supernova_other_inst.mp3'
    ];

    let audioContext;
    const audioElements = audioSources.map(src => {
        const audio = new Audio(src);
        audio.crossOrigin = "anonymous";
        audio.loop = true;
        return audio;
    });

    document.body.addEventListener('click', () => {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();

            audioElements.forEach(audio => audio.play());

            // Setup distortion and volume controls
            setupDistortionAndVolume(audioContext, audioElements);
        }
    }, { once: true });
}

function setupDistortionAndVolume(audioContext, audioElements) {
    const gainNodes = [];
    const distortionNodes = [];
    drumVolumeControl = document.getElementById('volume2');

    function createDistortionCurve(amount) {
        const k = typeof amount === 'number' ? amount : 50;
        const n_samples = 44100;
        const curve = new Float32Array(n_samples);
        const deg = Math.PI / 180;
        for (let i = 0; i < n_samples; ++i) {
            const x = i * 2 / n_samples - 1;
            curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
        }
        return curve;
    }

    function setDistortion(audioElement, volumeControl, index) {
        const source = audioContext.createMediaElementSource(audioElement);
        const gainNode = audioContext.createGain();
        const distortion = audioContext.createWaveShaper();

        distortion.curve = createDistortionCurve(50);
        distortion.oversample = '2x';

        source.connect(gainNode);
        gainNode.connect(distortion);
        distortion.connect(audioContext.destination);

        gainNode.gain.value = 0;

        gainNodes[index] = gainNode;

        volumeControl.addEventListener('input', event => {
            const volume = event.target.value;
            gainNode.gain.value = volume * 0.5;
            if (volume > 0.8) {
                gainNode.disconnect();
                gainNode.connect(distortion);
            } else {
                gainNode.disconnect();
                gainNode.connect(audioContext.destination);
            }
        });
    }

    setDistortion(audioElements[0], document.getElementById('volume1'), 0);
    setDistortion(audioElements[1], document.getElementById('volume2'), 1);
    setDistortion(audioElements[2], document.getElementById('volume3'), 2);
    setDistortion(audioElements[3], document.getElementById('volume4'), 3);
}
