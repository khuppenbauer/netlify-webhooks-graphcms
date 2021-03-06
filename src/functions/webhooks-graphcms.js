const messages = require('./methods/messages');

exports.handler = async (event) => {
  if (event.httpMethod === 'POST') {
    const body = JSON.parse(event.body);
    const { data } = body;
    const { name, __typename: type, stage, id, publishedBy, updatedBy } = data;
    const messageBody = {
      ...body,
      data: {
        id,
        publishedBy,
        updatedBy,
      },
    };
    event.body = JSON.stringify(messageBody);
    return messages.create(event, { foreignKey: name, app: 'graphcms', event: `${type}_${stage}` });
  }
  return {
    statusCode: 405,
    body: 'Method Not Allowed',
  };
};
