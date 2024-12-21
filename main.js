import * as THREE from "three";

import { BoxLineGeometry } from "three/addons/geometries/BoxLineGeometry.js";
import { XRButton } from "three/addons/webxr/XRButton.js";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";
import { RapierPhysics } from "three/addons/physics/RapierPhysics.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import { load_assets } from "./load_assets.js";

let camera, scene, renderer;
let controller1, controller2;
let controllerGrip1, controllerGrip2;

let room, spheres, physics;
const velocity = new THREE.Vector3();

let count = 0;
let last_time = 0;

const objs = await load_assets();
init();
await initPhysics();

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x505050);

    camera = new THREE.PerspectiveCamera(
        50,
        window.innerWidth / window.innerHeight,
        0.1,
        50,
    );
    camera.position.set(0, 1.6, 3);

    room = new THREE.LineSegments(
        new BoxLineGeometry(6, 6, 6, 10, 10, 10),
        new THREE.LineBasicMaterial({ color: 0x808080 }),
    );
    room.geometry.translate(0, 3, 0);
    //scene.add(room);

    scene.add(new THREE.HemisphereLight(0xbbbbbb, 0x888888, 3));

    const light = new THREE.DirectionalLight(0xffffff, 3);
    light.position.set(1, 1, 1).normalize();
    scene.add(light);

    //

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setAnimationLoop(animate);
    renderer.xr.enabled = true;
    document.body.appendChild(renderer.domElement);

    //

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.maxDistance = 10;
    controls.target.y = 1.6;
    controls.update();

    scene.add(objs.xmas);
    scene.add(objs.conrad.model);
    scene.add(objs.prez[0]);
    scene.add(objs.prez[1]);
    scene.add(objs.pengos[0]);
    scene.add(objs.pengos[1]);

    document.body.appendChild(
        XRButton.createButton(renderer, {
            optionalFeatures: ["depth-sensing"],
            depthSensing: {
                usagePreference: ["gpu-optimized"],
                dataFormatPreference: [],
            },
        }),
    );

    // controllers

    function onSelectStart() {
        this.userData.isSelecting = true;
    }

    function onSelectEnd() {
        this.userData.isSelecting = false;
    }

    controller1 = renderer.xr.getController(0);
    controller1.addEventListener("selectstart", onSelectStart);
    controller1.addEventListener("selectend", onSelectEnd);
    controller1.addEventListener("connected", function (event) {
        this.add(buildController(event.data));
    });
    controller1.addEventListener("disconnected", function () {
        this.remove(this.children[0]);
    });
    scene.add(controller1);

    controller2 = renderer.xr.getController(1);
    controller2.addEventListener("selectstart", onSelectStart);
    controller2.addEventListener("selectend", onSelectEnd);
    controller2.addEventListener("connected", function (event) {
        this.add(buildController(event.data));
    });
    controller2.addEventListener("disconnected", function () {
        this.remove(this.children[0]);
    });
    scene.add(controller2);

    // The XRControllerModelFactory will automatically fetch controller models
    // that match what the user is holding as closely as possible. The models
    // should be attached to the object returned from getControllerGrip in
    // order to match the orientation of the held device.

    const controllerModelFactory = new XRControllerModelFactory();

    controllerGrip1 = renderer.xr.getControllerGrip(0);
    controllerGrip1.add(
        controllerModelFactory.createControllerModel(controllerGrip1),
    );
    scene.add(controllerGrip1);

    controllerGrip2 = renderer.xr.getControllerGrip(1);
    controllerGrip2.add(
        controllerModelFactory.createControllerModel(controllerGrip2),
    );
    scene.add(controllerGrip2);

    //

    window.addEventListener("resize", onWindowResize);
}

function buildController(data) {
    let geometry, material;

    switch (data.targetRayMode) {
        case "tracked-pointer":
            geometry = new THREE.BufferGeometry();
            geometry.setAttribute(
                "position",
                new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, -1], 3),
            );
            geometry.setAttribute(
                "color",
                new THREE.Float32BufferAttribute([0.5, 0.5, 0.5, 0, 0, 0], 3),
            );

            material = new THREE.LineBasicMaterial({
                vertexColors: true,
                blending: THREE.AdditiveBlending,
            });

            return new THREE.Line(geometry, material);

        case "gaze":
            geometry = new THREE.RingGeometry(0.02, 0.04, 32).translate(
                0,
                0,
                -1,
            );
            material = new THREE.MeshBasicMaterial({
                opacity: 0.5,
                transparent: true,
            });
            return new THREE.Mesh(geometry, material);
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
}

async function initPhysics() {
    const physics = await RapierPhysics();

    {
        // Floor

        const geometry = new THREE.BoxGeometry(6, 2, 6);
        const material = new THREE.MeshNormalMaterial({
            visible: false,
        });

        const floor = new THREE.Mesh(geometry, material);
        floor.position.y = -1;
        floor.userData.physics = { mass: 0 };
        scene.add(floor);

        // Walls

        const wallPX = new THREE.Mesh(geometry, material);
        wallPX.position.set(4, 3, 0);
        wallPX.rotation.z = Math.PI / 2;
        wallPX.userData.physics = { mass: 0 };
        scene.add(wallPX);

        const wallNX = new THREE.Mesh(geometry, material);
        wallNX.position.set(-4, 3, 0);
        wallNX.rotation.z = Math.PI / 2;
        wallNX.userData.physics = { mass: 0 };
        scene.add(wallNX);

        const wallPZ = new THREE.Mesh(geometry, material);
        wallPZ.position.set(0, 3, 4);
        wallPZ.rotation.x = Math.PI / 2;
        wallPZ.userData.physics = { mass: 0 };
        scene.add(wallPZ);

        const wallNZ = new THREE.Mesh(geometry, material);
        wallNZ.position.set(0, 3, -4);
        wallNZ.rotation.x = Math.PI / 2;
        wallNZ.userData.physics = { mass: 0 };
        scene.add(wallNZ);
    }

    // Spheres

    const geometry = new THREE.IcosahedronGeometry(0.08, 3);
    const material = new THREE.MeshPhongMaterial({
        emissive: 0x000000,
        specular: 0x050505,
        shininess: 1000,
    });

    spheres = new THREE.InstancedMesh(geometry, material, 800);
    spheres.instanceMatrix.setUsage(THREE.DynamicDrawUsage); // will be updated every frame
    spheres.userData.physics = { mass: 1, restitution: 1.1 };
    scene.add(spheres);

    const matrix = new THREE.Matrix4();
    const color = new THREE.Color();

    for (let i = 0; i < spheres.count; i++) {
        const x = Math.random() * 4 - 2;
        const y = Math.random() * 4;
        const z = Math.random() * 4 - 2;

        matrix.setPosition(x, y, z);
        spheres.setMatrixAt(i, matrix);
        spheres.setColorAt(
            i,
            color.setHex(
                [0xd90429, 0x003e1f, 0x73ba9b, 0xd5f2e3, 0xef233c][
                    (Math.random() * 4) | 0
                ],
            ),
        );
    }

    physics.addScene(scene);
}

//

function handleController(controller) {
    if (controller.userData.isSelecting) {
        physics.setMeshPosition(spheres, controller.position, count);

        velocity.x = (Math.random() - 0.5) * 2;
        velocity.y = (Math.random() - 0.5) * 2;
        velocity.z = Math.random() - 9;
        velocity.applyQuaternion(controller.quaternion);

        physics.setMeshVelocity(spheres, velocity, count);

        if (++count === spheres.count) count = 0;
    }
}

function animate(time) {
    const { pengos, conrad } = objs;

    const dt = Math.min(0.1, (time - last_time) / 1000);
    last_time = time;
    const now = Date.now();

    handleController(controller1);
    handleController(controller2);

    if (pengos[0]) {
        pengos[0].rotation.set(0, Math.sin(now * 0.001), 0);
    }
    if (pengos[1]) {
        pengos[1].rotation.set(0, Math.cos(now * 0.0013), 0);
    }
    if (conrad.model) {
        conrad.a = (conrad.a + 0.5 * dt) % (Math.PI * 2);
        conrad.model.position.set(
            Math.sin(conrad.a) * conrad.distance,
            Math.sin(now * 0.01),
            Math.cos(conrad.a) * conrad.distance,
        );
        conrad.model.rotation.set(0, conrad.a, Math.cos(now * 0.0013));
    }

    renderer.render(scene, camera);
}
