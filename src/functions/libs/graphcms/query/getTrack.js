const { gql } = require('graphql-request');

module.exports = async () => {
  return gql`
    query gettrack($id: ID!) {
      track(where: { id: $id }) {
        collection {
          name
          subCollection {
            name
            collectionTypes {
              name
            }
          }
          collectionTypes {
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
      }
    }
  `;
};
