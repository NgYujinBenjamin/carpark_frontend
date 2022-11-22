import {useEffect, useRef} from 'react';
import {Libraries, Loader} from '@googlemaps/js-api-loader';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader';
import {performFetchGet} from '../common/api';
import {CarparkAvailabilityData} from '../common/types';

let currentLat: number;
let currentLong: number;

currentLat = 1.304833;
currentLong = 103.831833;

let scene: THREE.Scene;
let renderer: THREE.WebGLRenderer;
let camera: THREE.PerspectiveCamera;
let loader: GLTFLoader;

const apiOptions = {
  apiKey: process.env.MAPS_API_KEY || '',
  version: 'beta',
  libraries: ['marker'] as Libraries,
};
const mapOptions = {
  tilt: 0,
  heading: 0,
  zoom: 17,
  center: {lat: currentLat, lng: currentLong},
  mapId: process.env.MAPS_ID || '',
  fullscreenControl: true, // remove the top-right button
  mapTypeControl: true, // remove the top-left buttons
  streetViewControl: false, // remove the pegman
  zoomControl: true, // remove the bottom-right buttons
  // scrollWheel: true,
  draggable: false,
  // navigationControl: true,
  // scaleControl: true,
  gestureHandling: 'cooperative',
};

async function initWebGLOverlayView(map: google.maps.Map) {
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

    const source = 'pin.gltf';
    loader.load(source, (gltf) => {
      gltf.scene.scale.set(25, 25, 25);
      gltf.scene.rotation.x = (180 * Math.PI) / 180;
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

async function retrieveMarkerData(skipValue: string): Promise<CarparkAvailabilityData> {
  const data: {
    value: {
      CarParkID: string;
      Area: string;
      Development: string;
      Location: string;
      AvailableLots: number;
      LotType: string;
      Agency: string;
    }[];
    metadata: {};
  } = await performFetchGet(`/datamall/carparkavailability`, `/${skipValue}`);
  return data;
}
function distanceBetweenLatAndLong(lat1: number, lat2: number, lon1: number, lon2: number) {
  lon1 = (lon1 * Math.PI) / 180;
  lon2 = (lon2 * Math.PI) / 180;
  lat1 = (lat1 * Math.PI) / 180;
  lat2 = (lat2 * Math.PI) / 180;

  let dlon = lon2 - lon1;
  let dlat = lat2 - lat1;
  let a = Math.pow(Math.sin(dlat / 2), 2) + Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin(dlon / 2), 2);
  let c = 2 * Math.asin(Math.sqrt(a));
  let r = 6371;

  return c * r;
}

async function placeMarkers(map: google.maps.Map, data: CarparkAvailabilityData) {
  data.value.forEach((element) => {
    const lat = Number(element.Location.split(` `)[0]);
    const long = Number(element.Location.split(` `)[1]);

    if (distanceBetweenLatAndLong(lat, currentLat, long, currentLong) < 2) {
      const pinContent = document.createElement('div');

      pinContent.className = 'pin-content';
      pinContent.textContent = element.Development + `: ` + element.AvailableLots.toString();

      const markerView = new google.maps.marker.AdvancedMarkerView({
        map,
        position: {lat, lng: long, altitude: 100} as google.maps.LatLngAltitude,
        title: element.Development,
        content: pinContent,
      });
      markerView.addListener('click', () => {
        console.log(element.Development);
        renderer.setAnimationLoop(null);
        window.open('http://www.google.com/maps/place/' + lat + ',' + long);
      });
    }
  });
}

const IndexPage = (): JSX.Element => {
  const googlemap = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // navigator.geolocation.watchPosition((position) => {
    //   currentLat = position.coords.latitude;
    //   currentLong = position.coords.longitude;
    //   mapOptions.center = {lat: currentLat, lng: currentLong}
    // });

    const loader = new Loader(apiOptions);
    let map: google.maps.Map;
    loader.load().then(async () => {
      const {google} = window;
      map = new google.maps.Map(googlemap.current as HTMLElement, mapOptions);
      await initWebGLOverlayView(map);
      const datalist = ['0', '500', '1000', '1500', '2000'];
      datalist.forEach(async (element) => {
        const data = await retrieveMarkerData(element);
        await placeMarkers(map, data);
      });
    });
  });

  return <div id="map" ref={googlemap} />;
};

export default IndexPage;
