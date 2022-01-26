const dotenv = require('dotenv').config();
const axios = require('axios');
const { GraphQLClient } = require('graphql-request');
const geolib = require('geolib');
const randomColor = require('randomcolor');
const mapboxLib = require('../mapbox');
const graphcmsMutation = require('./mutation');
const graphcmsQuery = require('./query');
const messages = require('../../methods/messages');
const Track = require('../../models/track');

const url = process.env.GRAPHCMS_API_URL;
const token = process.env.GRAPHCMS_API_TOKEN;
const gpsbabelBaseUrl = process.env.GPS_BABEL_FUNCTIONS_API_BASE_URL;

const stroke = '#ff3300';
const strokeWidth = 2;
const fillOpacity = 0;

const colors = [
  '#9e0142',
  '#d53e4f',
  '#f46d43',
  '#fdae61',
  '#fee08b',
  '#e6f598',
  '#abdda4',
  '#66c2a5',
  '#3288bd',
  '#5e4fa2',
]; 

const graphcms = new GraphQLClient(
  url,
  {
    headers: {
      authorization: `Bearer ${token}`,
    },
  },
);

const getUser = async (id) => {
  const query = await graphcmsQuery.getUser();
  const queryVariables = {
    id,
  };
  const { user } = await graphcms.request(query, queryVariables);
  return user;
};

const uploadAsset = async (imageUrl) => {
  const res = await axios({
    method: 'post',
    url: `${url}/upload`,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    data: `url=${encodeURIComponent(imageUrl)}`,
  });
  const { data } = res;
  return data;
};

const updateAsset = async (id, fileName) => {
  const mutation = await graphcmsMutation.updateAsset();
  const mutationVariables = {
    id,
    fileName,
  };
  return graphcms.request(mutation, mutationVariables);
};

const publishAsset = async (id) => {
  const mutation = await graphcmsMutation.publishAsset();
  const mutationVariables = {
    id,
  };
  return graphcms.request(mutation, mutationVariables);
};

const deleteAsset = async (id) => {
  const mutation = await graphcmsMutation.deleteAsset();
  const mutationVariables = {
    id,
  };
  return graphcms.request(mutation, mutationVariables);
};

const connectAsset = async (collection, asset) => {
  const mutation = await graphcmsMutation.updateCollectionConnectAsset('staticImage');
  const mutationVariables = {
    collection,
    asset,
  };
  return graphcms.request(mutation, mutationVariables);
};

const getCollection = async (id) => {
  const query = await graphcmsQuery.getCollection();
  const queryVariables = {
    id,
  };
  const { collection } = await graphcms.request(query, queryVariables);
  return collection;
};

const getTrack = async (id) => {
  const query = await graphcmsQuery.getTrack();
  const queryVariables = {
    id,
  };
  const { track } = await graphcms.request(query, queryVariables);
  return track;
};

const updateCollection = async (id, geoJson, minCoords, maxCoords) => {
  const mutation = await graphcmsMutation.updateCollection();
  const mutationVariables = {
    id,
    geoJson,
    minCoords,
    maxCoords,
  };
  return graphcms.request(mutation, mutationVariables);
};

const publishCollection = async (id) => {
  const mutation = await graphcmsMutation.publishCollection();
  const mutationVariables = {
    id,
  };
  return graphcms.request(mutation, mutationVariables);
};

const addAssetToCollection = async (id, name, coords, staticImage, features) => {
  if (staticImage) {
    const { id: existingStaticImage } = staticImage;
    await deleteAsset(existingStaticImage);
  }
  const geoJson = {
    type: 'FeatureCollection',
    features,
  };
  const imageUrl = await mapboxLib.geoJson(coords, geoJson);
  const asset = await uploadAsset(imageUrl);
  const { id: assetId } = asset;
  await updateAsset(assetId, name);
  await publishAsset(assetId);
  await connectAsset(id, assetId);
};

const addGeoDataToCollection = async (id, features, coords) => {
  const geoJson = {
    type: 'FeatureCollection',
    features,
  };
  const bounds = geolib.getBounds(coords);
  const {
    minLat, minLng, maxLat, maxLng,
  } = bounds;
  const minCoords = {
    latitude: minLat,
    longitude: minLng,
  };
  const maxCoords = {
    latitude: maxLat,
    longitude: maxLng,
  };
  await updateCollection(id, geoJson, minCoords, maxCoords);
  return {
    minCoords,
    maxCoords
  }
};

const updateTracks = async (event, tracks) => {
  await tracks.reduce(async (lastPromise, trackItem) => {
    const accum = await lastPromise;
    const { id } = trackItem;
    const track = await getTrack(id);
    const { foreignKey, collection } = track;
    const trackCollection = collection.map((collectionItem) => {
      const { name, subCollection, collectionType } = collectionItem;
      return {
        name,
        subCollection,
        collectionType,
      };
    });
    const trackObject = {
      ...track,
      trackCollection,
      _id: foreignKey,
    };
    await Track.findByIdAndUpdate(foreignKey, trackObject);
    await messages.create(
      {
        ...event,
        body: JSON.stringify(trackObject),
      },
      {
        foreignKey,
        app: 'graphcms',
        event: 'update_track',
      }
    ); 
    return [...accum];
  }, Promise.resolve([]));
}

const getGeoJson = async (gpxFile) => {
  const outtype = 'geojson';
  const count = 100;

  const params = [
    `infile=${gpxFile}`,
    `outtype=${outtype}`,
    `count=${count}`,
    'intype=gpx',
  ];
  const query = params.join('&');
  const url = `${gpsbabelBaseUrl}gpsbabel?${query}`;
  let res;
  try {
    res = await axios({
      method: 'get',
      url,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    return null;
  }
  if (res.status !== 200) {
    return null;
  }
  return res.data;
};

const parseTracks = async (tracks) => {
  const features = [];
  const coords = [];
  await tracks.reduce(async (lastPromise, track, index) => {
    const accum = await lastPromise;
    const {
      id, geoJson: json, minCoords, maxCoords, color, name,
      distance, totalElevationGain, totalElevationLoss,
      gpxFileSmallUrl,
    } = track;
    const featureItem = json.features.reduce((prev, current, index) => {
      current.index = index;
      const prevDistance = prev ? (prev.properties.distance) : 0;
      const currentDistance = current ? (current.properties.distance) : 0;
      return (prevDistance > currentDistance) ? prev : current;
    });
    const geoJsonObject = await getGeoJson(gpxFileSmallUrl);
    if (geoJsonObject) {
      const geoJsonFeature = geoJsonObject.features
        .filter((feature) => feature.geometry.type === 'LineString')
        .reduce((prev, current) => {
          const prevDistance = prev ? geolib.getPathLength(prev.geometry.coordinates) : 0;
          const currentDistance = current ? geolib.getPathLength(current.geometry.coordinates) : 0;
          return (prevDistance > currentDistance) ? prev : current;
      });
      featureItem.geometry = geoJsonFeature.geometry;
    }

    featureItem.properties = {
      ...featureItem.properties,
      id,
      name,
      distance,
      totalElevationGain,
      totalElevationLoss,
    };
    featureItem.properties.color = colors[index] ? colors[index]: randomColor();
    if (color) {
      const { hex } = color;
      featureItem.properties.color = hex;
    }
    delete featureItem.properties.coordTimes;
    features.push(featureItem);
    coords.push(minCoords);
    coords.push(maxCoords);
    return [...accum];
  }, Promise.resolve([]));
  return {
    features,
    coords,
  };
};

const parseSubcollections = async (subCollections) => {
  const features = [];
  const coords = [];
  subCollections.reduce((acc, subCollection) => {
    const {
      name, minCoords, maxCoords, collectionType,
    } = subCollection;
    const { latitude: minLat, longitude: minLng } = minCoords;
    const { latitude: maxLat, longitude: maxLng } = maxCoords;
    const feature = {
      type: 'Feature',
      properties: {
        name,
        type: collectionType.slug,
        color: stroke,
        stroke,
        'stroke-width': strokeWidth,
        'fill-opacity': fillOpacity,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [minLng, minLat],
            [maxLng, minLat],
            [maxLng, maxLat],
            [minLng, maxLat],
            [minLng, minLat],
          ],
        ],
      },
    };
    features.push(feature);
    coords.push(minCoords);
    coords.push(maxCoords);
    return acc;
  }, []);
  return {
    features,
    coords,
  };
};

module.exports = async (event, data) => {
  const { data: item } = data;
  const { id, publishedBy } = item;
  if (!publishedBy) {
    return null;
  }
  const { id: userId } = publishedBy;
  const user = await getUser(userId);
  const { kind } = user;
  if (kind !== 'MEMBER') {
    return null;
  }

  const collection = await getCollection(id);
  const { tracks, subCollections, name, staticImage } = collection;
  if (tracks.length > 0) {
    await updateTracks(event, tracks);
    const { features, coords } = await parseTracks(tracks);
    const { minCoords, maxCoords } = await addGeoDataToCollection(id, features, coords);
    const { latitude: minLat, longitude: minLng } = minCoords;
    const { latitude: maxLat, longitude: maxLng } = maxCoords;
    const feature = {
      type: 'Feature',
      properties: {
        stroke,
        'stroke-width': strokeWidth,
        'fill-opacity': fillOpacity,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [minLng, minLat],
            [maxLng, minLat],
            [maxLng, maxLat],
            [minLng, maxLat],
            [minLng, minLat],
          ],
        ],
      },
    };
    await addAssetToCollection(id, name, coords, staticImage, [feature]);
  }
  if (subCollections.length > 0) {
    const { features, coords } = await parseSubcollections(subCollections);
    await addGeoDataToCollection(id, features, coords);
    await addAssetToCollection(id, name, coords, staticImage, features);
  }
  await publishCollection(id);
  return data;
};
