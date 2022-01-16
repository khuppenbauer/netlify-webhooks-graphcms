const dotenv = require('dotenv').config();
const { GraphQLClient } = require('graphql-request');
const mongoose = require('mongoose');
const db = require('../../database/mongodb');
const messages = require('../../methods/messages');
const Track = require('../../models/track');
const Feature = require('../../models/feature');
const graphcmsMutation = require('./mutation');
const graphcmsQuery = require('./query');

const url = process.env.GRAPHCMS_API_URL;
const token = process.env.GRAPHCMS_API_TOKEN;
const cdnUrl = process.env.GRAPHCMS_CDN_URL;
const cdnToken = process.env.GRAPHCMS_CDN_TOKEN;

const graphcms = new GraphQLClient(
  url,
  {
    headers: {
      authorization: `Bearer ${token}`,
    },
  },
);

let cdn;
if (cdnUrl && cdnToken) {
  cdn = new GraphQLClient(
    cdnUrl,
    {
      headers: {
        authorization: `Bearer ${cdnToken}`,
      },
    },
  );
}

const addTrack = async (record) => {
  const {
    minCoords,
    maxCoords,
    startCoords,
    endCoords,
    name,
    _id: foreignKey,
    gpxFileUrl,
    gpxFileSmallUrl,
    geoJsonFileUrl,
    overviewImageUrl,
    previewImageUrl,
  } = record;
  const query = await graphcmsQuery.getAssets('fileName_starts_with');
  const queryVariables = {
    value: name,
  };
  const mutation = await graphcmsMutation.upsertTrack();
  const mutationVariables = {
    ...record._doc,
    minCoords: {
      latitude: minCoords.lat,
      longitude: minCoords.lon,
    },
    maxCoords: {
      latitude: maxCoords.lat,
      longitude: maxCoords.lon,
    },
    startCoords: {
      latitude: startCoords.lat,
      longitude: startCoords.lon,
    },
    endCoords: {
      latitude: endCoords.lat,
      longitude: endCoords.lon,
    },
    gpxFileUrl,
    gpxFileSmallUrl,
    geoJsonFileUrl,
    overviewImageUrl,
    previewImageUrl,
    foreignKey,
  };
  return graphcms.request(mutation, mutationVariables);
};

const publishTrack = async (track) => {
  const mutation = await graphcmsMutation.publishTrack();
  const mutationVariables = {
    foreignKey: track,
  };
  return graphcms.request(mutation, mutationVariables);
};

const getUser = async (id) => {
  const query = await graphcmsQuery.getUser();
  const queryVariables = {
    id,
  };
  const { user } = await graphcms.request(query, queryVariables);
  return user;
};

const getTrack = async (id) => {
  const query = await graphcmsQuery.getTrack();
  const queryVariables = {
    id,
  };
  const { track } = await graphcms.request(query, queryVariables);
  return track;
};

const updateTrack = async (event, data) => {
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
  const track = await getTrack(id);
  const {
    name,
    foreignKey,
  } = track;
  await Track.findByIdAndUpdate(foreignKey, track);
  const trackObject = {
    ...track,
    _id: foreignKey,
  }
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

  const feature = {
    name
  };
  const featureFilter = {
    type: 'track',
    foreignKey,
  };
  const featureObject = await Feature.findOneAndUpdate(featureFilter, feature);
  await messages.create(
    {
      ...event,
      body: JSON.stringify(featureObject),
    },
    {
      foreignKey: featureObject._id,
      app: 'graphcms',
      event: 'update_gpx_track_feature',
    }
  );
}

module.exports = async (event, data, action) => {
  if (action === 'add') {
    const { track } = data;
    const record = await Track.findById(track);
    return addTrack(record);
  }
  if (action === 'publish') {
    const { track } = data;
    return publishTrack(track);
  }
  if (action === 'update') {
    return updateTrack(event, data);
  }
  return null;
};
