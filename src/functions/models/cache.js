// cache.js
const mongoose = require('mongoose');

const schemaOptions = {
  timestamps: true,
};
// Set Cache Schema
const schema = new mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  name: {
    type: String,
  },
  type: {
    type: String,
  },
  feature: {
    type: String,  
  },
  minCoords: {
    type: Object,
  },
  maxCoords: {
    type: Object,
  },
  geoJson: {
    type: Object,
  },
}, schemaOptions);
const Cache = mongoose.model('cache', schema);

module.exports = Cache;
