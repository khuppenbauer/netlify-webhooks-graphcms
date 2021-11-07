const dotenv = require('dotenv').config();
const geolib = require('geolib');

const mapboxToken = process.env.MAPBOX_API_ACCESS_TOKEN;
const mapboxBaseUrl = 'https://api.mapbox.com/styles/v1/';
const mapboxStyle = 'khuppenbauer/ckrd352a31ffl18qit94pozv8';
const imageSize = '320x240';

module.exports = async (coords, geoJson) => {
  const bounds = geolib.getBounds(coords);
  const center = geolib.getCenterOfBounds(coords);
  const {
    minLat, minLng, maxLat, maxLng,
  } = bounds;
  const distance = geolib.getPreciseDistance(
    { latitude: minLat, longitude: minLng},
    { latitude: maxLat, longitude: maxLng }
  );
  const zoom = distance > 200000 ? 5 : 6;
  const { latitude, longitude } = center;
  const pathParams = [
    mapboxStyle,
    'static',
    `geojson(${encodeURIComponent(JSON.stringify(geoJson))})`,
    `${longitude},${latitude},${zoom}`,
    imageSize,
  ];
  return `${mapboxBaseUrl}${pathParams.join('/')}?access_token=${mapboxToken}`;
};
