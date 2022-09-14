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
        foreignKey
      }
    }
  `;
};
