import * as THREE from "three";

import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { MTLLoader } from "three/addons/loaders/MTLLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export async function load_assets() {
    const objs = {
        xmas: null,
        pengos: [],
        conrad: {
            model: null,
            a: 0,
            distance: 40,
        },
        prez: [],
    };

    return new Promise((res, rej) => {
        const assets = new THREE.LoadingManager();
        assets.onStart = (url, itemsLoaded, itemsTotal) => {
            console.log(
                `Started loading file: ${url}.\nLoaded ${itemsLoaded} of ${itemsTotal} files.`,
            );
        };

        assets.onLoad = () => {
            console.log("Loading complete!");
            res(objs);
        };

        assets.onProgress = (url, itemsLoaded, itemsTotal) => {
            console.log(
                `Loading file: ${url}.\nLoaded ${itemsLoaded} of ${itemsTotal} files.`,
            );
        };

        const loader = new GLTFLoader(assets).setPath("assets/");

        loader.load("conrad.glb", async function (gltf) {
            const model = gltf.scene;
            model.scale.set(20, 20, 20);
            objs.conrad.model = model;
        });

        loader.load("peng.glb", async function (gltf) {
            const model = gltf.scene;
            model.scale.set(20, 20, 20);
            model.position.set(-4, 0, -8);
            objs.pengos[0] = model;
            objs.pengos[1] = model.clone();
            objs.pengos[1].position.set(4, 0, -8);
        });

        loader.load("prez.glb", async function (gltf) {
            const model = gltf.scene;
            model.scale.set(5, 5, 5);
            model.position.set(-2, 0, -3);
            model.rotation.set(0, 0.5, 0);
            objs.prez[0] = model;

            objs.prez[1] = model.clone();
            objs.prez[1].position.set(2, 0, -3);
        });

        const mtlLoader = new MTLLoader(assets);
        mtlLoader.load("assets/xmas.mtl", (materials) => {
            //materials.preload();
            const loader = new OBJLoader(assets);
            loader.setMaterials(materials);
            loader.load(
                "assets/xmas.obj",
                (obj) => {
                    obj.position.set(0, 0, -8);
                    objs.xmas = obj;
                },
                () => {},
                console.error,
            );
        });
    });
}
