const { gql } = require('graphql-request');

module.exports = async () => {
  return gql`
    query getCollection($id: ID!) {
      collection(where: { id: $id }) {
        name,
        tracks {
          id
          name
          geoJson
          gpxFileSmallUrl
          foreignKey
          maxCoords {
            latitude
            longitude
          }
          minCoords {
            latitude
            longitude
          }
          color {
            hex
          }
          distance
          totalElevationGain
          totalElevationLoss
        }
        staticImage {
          id
        }
        subCollections {
          name
          maxCoords {
            latitude
            longitude
          }
          minCoords {
            latitude
            longitude
          }
          collectionType {
            name
            slug
          }
        }
        collectionType {
          name
        }
      }
    }
  `;
};
