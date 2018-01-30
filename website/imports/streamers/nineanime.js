import ScrapingHelpers from "./_scrapingHelpers";

function cleanName(name) {
  return name.replace(/ \(Dub\)$/, '').replace(/ \(Sub\)$/, '');
}

function getTypeFromName(name) {
  return name.endsWith(' (Dub)') ? 'dub' : 'sub';
}

export let nineanime = {
  // General data
  id: 'nineanime',
  name: '9anime',
  homepage: 'https://9anime.ch',

  isInvalidPage(page) {
    return false;
  },

  // Search page data
  search: {
    createUrl: function(query) {
      return nineanime.homepage + '/search?keyword=' + encodeURIComponentReplaceSpaces(query, '+');
    },
    rowSelector: 'div.film-list div.item',
    rowSkips: 0,

    // Search page attribute data
    attributes: {
      streamerUrls: function(partial, full) {
        return [{
          type: getTypeFromName(partial.find('a.name').text()),
          url: partial.find('a.name').attr('href')
        }];
      },
      name: function(partial, full) {
        return cleanName(partial.find('a.name').text());
      },
      type: function(partial, full) {
        let types = ['OVA', 'Movie', 'Special', 'ONA'];
        let found = undefined;

        partial.find('a.poster div.status div').each((index, element) => {
          if (!found && types.includes(partial.find(element).text())) {
            found = partial.find(element).text();
          }
        });

        return found;
      },
    },
  },

  // Show page data
  show: {
    checkIfPage: function (page) {
      return page('title').text().cleanWhitespace().match(/^Watch .* on 9anime.to$/);
    },

    // Show page attribute data
    attributes: {
      streamerUrls: function(partial, full) {
        return [{
          type: getTypeFromName(partial.find('div.widget.player div.widget-title h1.title').text()),
          url: partial.find('head link').attr('href')
        }];
      },
      name: function(partial, full) {
        return cleanName(partial.find('div.widget.player div.widget-title h1.title').text());
      },
      altNames: function(partial, full) {
        return partial.find('div.info div.head div.c1 p.alias').text().split('; ');
      },
      description: function(partial, full) {
        return partial.find('div.info div.desc').text()
      },
      type: function(partial, full) {
        return partial.find('div.info div.row dl:first-of-type dd:first-of-type').text().split(' ')[0]
      },
    },
  },

  // Related shows data
  showRelated: {
    rowSelector: 'div.widget.simple-film-list div.widget-body div.item',
    rowIgnore: function(partial) {
      return false;
    },

    // Related shows attribute data
    attributes: {
      streamerUrls: function(partial, full) {
        return [{
          type: getTypeFromName(partial.find('div.info a.name').text()),
          url: partial.find('div.info a.name').attr('href')
        }];
      },
      name: function(partial, full) {
        return cleanName(partial.find('div.info a.name').text());
      },
    },
  },

  // Episode list data
  showEpisodes: {
    rowSelector: 'div.widget.servers div.widget-body div.server.active ul li a',
    rowSkips: 0,
    cannotCount: false,

    // Episode list attribute data
    attributes: {
      episodeNum: function(partial, full) {
        return ScrapingHelpers.processEpisodeNumber(partial.text());
      },
      translationType: function(partial, full) {
        return getTypeFromName(full.find('div.widget.player div.widget-title h1.title').text());
      },
      sourceUrl: function(partial, full) {
        return nineanime.homepage + partial.attr('href');
      },
      sources: function(partial, full) {
        let episodeNum = partial.text();
        let found = [];

        let tabs = [];
        full.find('div.widget.servers div.widget-title span.tabs span.tab').each((index, element) => {
          let tab = full.find(element);
          tabs.push({
            data: tab.attr('data-name'),
            name: tab.text()
          });
        });

        full.find('div.widget.servers div.widget-body div.server').each((index, element) => {
          let server = full.find(element);
          let name = tabs.getPartialObjects({data: server.attr('data-name')})[0].name;

          server.find('ul li a').each((index, element) => {
            if (full.find(element).text() === episodeNum) {
              found.push({
                name: name,
                url: nineanime.homepage + full.find(element).attr('href')
              });
            }
          });
        });

        return found;
      },
    },
  },
};