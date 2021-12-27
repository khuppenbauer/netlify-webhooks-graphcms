const dotenv = require('dotenv').config();
const algoliasearch = require('algoliasearch');

const applicationID = process.env.ALGOLIA_APPLICATION_ID;
const adminAPIKey = process.env.ALGOLIA_ADMIN_API_KEY;
const indexName = 'tracks';

module.exports = async (data) => {
  const {
    name,
    date,
    distance,
    totalElevationGain,
    totalElevationLoss,
    elevLow,
    elevHigh,
    startElevation,
    endElevation,
    foreignKey,
    startCity,
    startCountry,
    startState,
    endCity,
    endState,
    endCountry,
    previewImageUrl,
    overviewImageUrl,
    geoJson,
    collection,
    difficulty,
    fitness,
    experience,
  } = data;
  const { geometry } = geoJson.features[0];
  const { coordinates, type: geoJsonType } = geometry;
  const geoLoc = coordinates.map((coordinate) => ({ lat: coordinate[1], lng: coordinate[0] }));
  const client = algoliasearch(applicationID, adminAPIKey);
  const index = client.initIndex(indexName);
  const object = {
    objectID: foreignKey,
    name,
    date: new Date(date).getTime() / 1000,
    distance,
    totalElevationGain,
    totalElevationLoss,
    elevLow,
    elevHigh,
    startElevation,
    endElevation,
    startCity,
    startCountry,
    startState,
    endCity,
    endState,
    endCountry,
    previewImageUrl,
    overviewImageUrl,
    _geoloc: geoLoc,
    difficulty,
    fitness,
    experience,
  };
  let hierarchicalCategories = {};
  if (startCity && startState && startCountry && endCity && endCountry && endState) {
    hierarchicalCategories = {
      'hierarchicalCategories.lvl0': [
        startCountry,
        endCountry,
      ],
      'hierarchicalCategories.lvl1': [
        `${startCountry} > ${startState}`,
        `${endCountry} > ${endState}`,
      ],
      'hierarchicalCategories.lvl2': [
        `${startCountry} > ${startState} > ${startCity}`,
        `${endCountry} > ${endState} > ${endCity}`,
      ],
    };
  }
  let collectionCategories = {};
  const collectionLvl0 = [];
  const collectionLvl1 = [];
  if (collection.length > 0) {
    collection.forEach((collectionItem) => {
      const { name, collectionType, subCollection } = collectionItem;
      collectionLvl0.push(collectionType.name);
      collectionLvl1.push(`${collectionType.name} > ${name}`);
      if (subCollection.length > 0) {
        subCollection.forEach((subcollectionItem) => {
          const { name: subCollectionName, collectionType: subCollectionType } = subcollectionItem;
            collectionLvl0.push(subCollectionType.name);
            collectionLvl1.push(`${subCollectionType.name} > ${subCollectionName}`);
        });
      }
    });
    collectionCategories = {
      'collections.lvl0': collectionLvl0,
      'collections.lvl1': collectionLvl1,
    };
  }
  await index
    .setSettings({
      attributesForFaceting: [
        'searchable(collections)',
        'searchable(collections.lvl0)',
        'searchable(collections.lvl1)',
        'searchable(date)',
        'searchable(distance)',
        'searchable(totalElevationGain)',
        'searchable(totalElevationLoss)',
        'searchable(hierarchicalCategories)',
        'searchable(hierarchicalCategories.lvl0)',
        'searchable(hierarchicalCategories.lvl1)',
        'searchable(hierarchicalCategories.lvl2)',
        'searchable(difficulty)',
        'searchable(fitness)',
        'searchable(experience)',
      ],
    })
    .catch((err) => {
      console.log([name, err]);
    });
  await index
    .saveObject({
      ...object,
      ...hierarchicalCategories,
      ...collectionCategories,
    })
    .then(({ objectID }) => {
      console.log(objectID);
    })
    .catch((err) => {
      console.log(err);
    });
  return true;
};
