const { gql } = require('graphql-request');

module.exports = async () => {
  return gql`
    query gettrackwithcollectiondata($id: ID!) {
      track(where: { id: $id }) {
        collection {
          id
          name
          geoJson
          maxCoords {
            latitude
            longitude
          }
          minCoords {
            latitude
            longitude
          }
          subCollection {
            name
            collectionType {
              name
            }
          }
          collectionType {
            name
          }
          tracks {
            name
          }
        }
        date
        difficulty
        distance
        downloadGpx
        elevHigh
        elevLow
        endCity
        endCountry
        endElevation
        endState
        experience
        fitness
        foreignKey
        geoJson
        name
        title
        overviewImageUrl
        previewImageUrl
        private
        slug
        startCity
        startCountry
        startElevation
        startState
        subtitle
        totalElevationGain
        totalElevationLoss
        startTime
        id
        endTime
        description
        abstract
        endCoords {
          latitude
          longitude
        }
        startCoords {
          latitude
          longitude
        }
      }
    }
  `;
};
