const dotenv = require('dotenv').config();
const algoliasearch = require('algoliasearch');

const applicationID = process.env.ALGOLIA_APPLICATION_ID;
const adminAPIKey = process.env.ALGOLIA_ADMIN_API_KEY;
const indexName = 'cache';

module.exports = async (data) => {
  const client = algoliasearch(applicationID, adminAPIKey);
  const index = client.initIndex(indexName);
  const { id, name, type, feature, geoJson, minCoords, maxCoords } = data;
  const { lat: minLat, lon: minLng } = minCoords;
  const { lat: maxLat, lon: maxLng } = maxCoords;
  const _geoloc = [
    { lat: minLat, lng: minLng },
    { lat: minLat, lng: maxLng },
    { lat: maxLat, lng: minLng },
    { lat: maxLat, lng: maxLng },
  ];
  const object = {
    objectID: id,  
    name,
    type,
    feature,
    geoJson,
    _geoloc,
  };
  await index
    .setSettings({
      attributesForFaceting: [
        'searchable(type)',
        'searchable(feature)',
      ],
      searchableAttributes: [
        'type',
        'feature',
      ],
    })
    .catch((err) => {
      console.log([name, err]);
    });
  await index
    .saveObject({
      ...object,
    })
    .then(({ objectID }) => {
      console.log(objectID);
    })
    .catch((err) => {
      console.log([name, err]);
    });
  return true;
};
