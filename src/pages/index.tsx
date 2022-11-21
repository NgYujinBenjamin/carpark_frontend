import {useEffect, useRef} from 'react';
import {Libraries, Loader} from '@googlemaps/js-api-loader';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader';
import {performFetchGet} from '../common/api';
import {CarparkAvailabilityData} from '../common/types';

let currentLat: number;
let currentLong: number;
const apiOptions = {
  apiKey: process.env.MAPS_API_KEY || '',
  version: 'beta',
  libraries: ['marker'] as Libraries,
};
const mapOptions = {
  tilt: 0,
  heading: 0,
  zoom: 12,
  center: {lat: 1.304833, lng: 103.831833},
  mapId: process.env.MAPS_ID || '',
  fullscreenControl: true, // remove the top-right button
  mapTypeControl: true, // remove the top-left buttons
  streetViewControl: true, // remove the pegman
  zoomControl: true, // remove the bottom-right buttons
  scrollWheel: true,
  draggable: true,
  navigationControl: true,
  scaleControl: true,
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

async function retrieveMarkerData(skipValue: string): Promise<CarparkAvailabilityData> {
  const data: {
    value: {
      CarParkID: string;
      Area: string;
      Development: string;
      Location: string;
      AvailableLots: number;
      LotType: string; // C
      Agency: string;
    }[];
    metadata: {};
  } = await performFetchGet(`/datamall/carparkavailability`, `/${skipValue}`);
  return data;
}

async function placeMarkers(map: google.maps.Map, data: CarparkAvailabilityData) {
  data.value.forEach((element) => {
    const pinContent = document.createElement('div');
    pinContent.className = 'pin-content';
    pinContent.textContent = element.AvailableLots.toString();

    const lat = Number(element.Location.split(` `)[0]);
    const long = Number(element.Location.split(` `)[1]);

    const markerView = new google.maps.marker.AdvancedMarkerView({
      map,
      position: {lat, lng: long, altitude: 100} as google.maps.LatLngAltitude,
      title: element.Development,
      content: pinContent,
    });
  });

  // const pinContent = document.createElement('div');
  // pinContent.className = 'pin-content';
  // pinContent.textContent = 'Here'

  // const markerView = new google.maps.marker.AdvancedMarkerView({
  //   map,
  //   position: {lat: currentLat, lng: currentLong, altitude: 100} as google.maps.LatLngAltitude,
  //   // position: {lat: 1.304833, lng: 103.831833, altitude: 100} as google.maps.LatLngAltitude,
  //   title: 'Hello world',
  //   content: pinContent
  // });
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
      map = new google.maps.Map(
        googlemap.current as HTMLElement,
        mapOptions,
      );
      await initWebGLOverlayView(map);
      const data = await retrieveMarkerData('0');
      const data2 = await retrieveMarkerData('500');
      const data3 = await retrieveMarkerData('1000');
      const data4 = await retrieveMarkerData('1500');
      const data5 = await retrieveMarkerData('2000');

      await placeMarkers(map, data);
      await placeMarkers(map, data2);
      await placeMarkers(map, data3);
      await placeMarkers(map, data4);
      await placeMarkers(map, data5);
    });
  });

  return <div id="map" ref={googlemap} />;
};

export default IndexPage;
