import {useEffect, useRef} from 'react';
import {Libraries, Loader} from '@googlemaps/js-api-loader';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader';

let currentLat: number;
let currentLong: number;
const apiOptions = {
  apiKey: process.env.MAPS_API_KEY || '',
  version: 'beta',
  libraries: ['marker'] as Libraries
};
const mapOptions = {
  tilt: 0,
  heading: 0,
  zoom: 17,
  center: {lat: 1.304833, lng: 103.831833},
  mapId: process.env.MAPS_ID || '',
  fullscreenControl: false, // remove the top-right button
  mapTypeControl: false, // remove the top-left buttons
  streetViewControl: false, // remove the pegman
  zoomControl: false, // remove the bottom-right buttons
  scrollWheel: false,
  draggable: false,
  navigationControl: false,
  scaleControl: false,
};

async function initWebGLOverlayView(map: google.maps.Map) {
  let scene: THREE.Scene;
  let renderer: THREE.WebGLRenderer;
  let camera: THREE.PerspectiveCamera;
  let loader: GLTFLoader;
  const webGLOverlayView = new google.maps.WebGLOverlayView();
  webGLOverlayView.onAdd = () => {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera();
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.25);
    directionalLight.position.set(0.5, -1, 0.5);
    scene.add(directionalLight);

    loader = new GLTFLoader();

    // loader.load()
    const source = './pin.gltf';
    loader.load(source, (gltf) => {
      // gltf.scene.scale.set(25,25,25);
      // gltf.scene.rotation.x = 180 * Math.PI/180;
      scene.add(gltf.scene);
    });
  };
  webGLOverlayView.onContextRestored = ({gl}) => {
    renderer = new THREE.WebGLRenderer({
      canvas: gl.canvas,
      context: gl,
      ...gl.getContextAttributes(),
    });

    renderer.autoClear = false;

    loader.manager.onLoad = () => {
      renderer.setAnimationLoop(() => {
        map.moveCamera({
          tilt: mapOptions.tilt,
          heading: mapOptions.heading,
          zoom: mapOptions.zoom,
        });

        if (mapOptions.tilt < 20) {
          mapOptions.tilt += 0.15;
        } else if (mapOptions.tilt < 40) {
          mapOptions.tilt += 0.1;
        } else if (mapOptions.tilt < 50) {
          mapOptions.tilt += 0.08;
        } else if (mapOptions.tilt < 62) {
          mapOptions.tilt += 0.05;
        } else if (mapOptions.tilt < 65.5) {
          mapOptions.tilt += 0.03;
        } else if (mapOptions.tilt < 67.5) {
          mapOptions.tilt += 0.01;
        }
        if (mapOptions.heading <= 360) {
          mapOptions.heading += 0.02;
        } else {
          mapOptions.heading = 0;
          // renderer.setAnimationLoop(null)
        }
      });
    };
  };
  webGLOverlayView.onDraw = ({transformer}) => {
    const latLngAltitudeLiteral = {
      lat: mapOptions.center.lat,
      lng: mapOptions.center.lng,
      altitude: 100,
    };

    const matrix = transformer.fromLatLngAltitude(latLngAltitudeLiteral);
    camera.projectionMatrix = new THREE.Matrix4().fromArray(matrix);

    webGLOverlayView.requestRedraw();
    renderer.render(scene, camera);
    renderer.resetState();
  };
  webGLOverlayView.setMap(map);
}

async function retrieveMarkerData() {
}

async function placeMarkers(map: google.maps.Map, data: void) {
  const pinContent = document.createElement('div');
  pinContent.className = 'pin-content';
  pinContent.textContent = 'Here'

  const markerView = new google.maps.marker.AdvancedMarkerView({
    map,
    position: {lat: currentLat, lng: currentLong, altitude: 100} as google.maps.LatLngAltitude,
    // position: {lat: 1.304833, lng: 103.831833, altitude: 100} as google.maps.LatLngAltitude,
    title: 'Hello world',
    content: pinContent
  });
}

const IndexPage = (): JSX.Element => {
  const googlemap = useRef<HTMLDivElement>(null);
  useEffect(() => {

    navigator.geolocation.watchPosition((position) => {
      currentLat = position.coords.latitude;
      currentLong = position.coords.longitude;
    });


      const loader = new Loader(apiOptions);
      let map;
      loader.load().then(async () => {
        const {google} = window;
        map = new google.maps.Map(googlemap.current as HTMLElement, {
          tilt: 0,
          heading: 0,
          zoom: 17,
          // center: {lat: 1.304833, lng: 103.831833},
          center: {lat: currentLat, lng: currentLong},
          mapId: process.env.MAPS_ID || '',
          fullscreenControl: true, // remove the top-right button
          mapTypeControl: false, // remove the top-left buttons
          streetViewControl: false, // remove the pegman
          zoomControl: false, // remove the bottom-right buttons
          scrollwheel: false,
          draggable: false,
          scaleControl: false,
        });
        await initWebGLOverlayView(map);
        const data= await retrieveMarkerData();
        await placeMarkers(map, data);
      });
      
  });

  return <div id="map" ref={googlemap} />;
};

export default IndexPage;
