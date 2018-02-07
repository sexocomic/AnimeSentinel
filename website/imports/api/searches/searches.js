import SimpleSchema from 'simpl-schema';
import Streamers from "../../streamers/streamers";
import {Shows} from "../shows/shows";

// Collection
export const Searches = new Mongo.Collection('searches');

// Schema
Schemas.Search = new SimpleSchema({
  _id: {
    type: String,
    optional: true
  },
  lastSearchStart: {
    type: Date,
    optional: true
  },
  lastSearchEnd: {
    type: Date,
    optional: true
  },
  query: {
    type: String,
    index: true
  }
}, { tracker: Tracker });

Searches.attachSchema(Schemas.Search);

// Constants
Searches.timeUntilRecache = 86400000; // 1 day
Searches.maxSearchTime = 60000; // 1 minute

if (Meteor.isDevelopment) {
  Searches.timeUntilRecache = 10000;
  Searches.maxSearchTime = 30000;
}

// Helpers
Searches.helpers({
  expired() {
    let now = moment();
    return (!this.busy() && (!this.lastSearchStart || moment(this.lastSearchEnd).add(Searches.timeUntilRecache) < now)) ||
            (this.busy() && moment(this.lastSearchStart).add(Searches.maxSearchTime) < now);
  },

  busy() {
    return this.lastSearchStart && (!this.lastSearchEnd || this.lastSearchStart > this.lastSearchEnd);
  },

  doSearch(query) {
    // Mark search as started
    this.lastSearchStart = moment().toDate();
    Searches.update(this._id, {
      $set: {
        lastSearchStart: this.lastSearchStart
      }
    });

    Streamers.doSearch(query, () => {

      // When done
      this.lastSearchEnd = moment().toDate();
      Searches.update(this._id, {
        $set: {
          lastSearchEnd: this.lastSearchEnd
        }
      });

    }, (partial, episodes) => {

      // For each search result
      Shows.addPartialShow(partial, episodes);

    });
  }
});

Searches.startSearch = function(query) {
  // Clean and validate query
  if (query) {
    query = query.cleanQuery();
  }
  Schemas.animeSearch.validate({query});

  if (query) {
    let search = Searches.findOne({
      query: query
    });

    if (!search) {
      search = Searches.findOne(
        Searches.insert({
          query: query
        })
      );
    }

    if (search.expired()) {
      search.doSearch(query);
    }
  }
};

// Methods
Meteor.methods({
  'searches.startSearch'(query) {
    Searches.startSearch(query);
  }
});

// Queries
Searches.queryWithQuery = function(query) {
  // Validate
  Schemas.animeSearch.validate({query});

  // Return results cursor
  return Searches.find({
    query: query
  });
};
