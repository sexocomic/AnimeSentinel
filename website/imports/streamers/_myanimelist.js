import ScrapingHelpers from "./scrapingHelpers";

function getMalIdFromUrl(url) {
  return url.replace(/^.*\/(\d+)\/.*$/, '$1');
}

export let myanimelist = {
  // General data
  id: 'myanimelist',
  name: 'MyAnimeList',
  homepage: 'https://myanimelist.net',
  minimalPageTypes: ['details'],

  isInvalidPage(page) {
    return page.text() === 'Too Many Requests';
  },

  // Search page data
  search: {
    createUrl: function(query) {
      return myanimelist.homepage + '/anime.php?q=' + encodeURIComponentReplaceSpaces(query, '+') + '&type=0&score=0&status=0&p=0&r=0&sm=0&sd=0&sy=0&em=0&ed=0&ey=0&c[]=a&c[]=b&c[]=c&c[]=d&c[]=e&c[]=f&c[]=g&gx=1&genre[]=12';
    },
    rowSelector: '.js-block-list.list table tbody tr',
    rowSkips: 1,

    // Search page attribute data
    attributes: {
      streamerUrls: function(partial, full) {
        return [{
          type: 'details',
          url: partial.find('td a.hoverinfo_trigger').attr('href')
        }, {
          type: 'pictures',
          url: partial.find('td a.hoverinfo_trigger').attr('href') + '/pics'
        }];
      },
      name: function(partial, full) {
        return partial.find('td a.hoverinfo_trigger strong').text();
      },
      description: function(partial, full) {
        return ScrapingHelpers.replaceDescriptionCutoff(partial.find('td div.pt4').text(), '...read more.');
      },
      type: function(partial, full) {
        return partial.find('td[width=45]').text().replace(/Unknown/g, '');
      },
      malId: function(partial, full) {
        return getMalIdFromUrl(partial.find('td a.hoverinfo_trigger').attr('href'));
      },
    },
  },

  // Show page data
  show: {
    checkIfPage: function(page) {
      return page('meta[property="og:url"]').attr('content').match(/^https*:\/\/myanimelist.net\/anime\/[0-9]+\/.*$/);
    },

    // Show page attribute data
    attributes: {
      streamerUrls: function(partial, full) {
        let urls = [{
          type: 'details',
          url: partial.find('div#horiznav_nav ul li:first-of-type a').attr('href')
        }, {
          type: 'pictures',
          url: partial.find('div#horiznav_nav ul li:first-of-type a').attr('href') + '/pics'
        }];

        if (partial.find('div#horiznav_nav ul li a').text().includes('Episodes')) {
          urls.push({
            type: 'episodes-0',
            url: partial.find('div#horiznav_nav ul li:first-of-type a').attr('href') + '/episode'
          });

          partial.find('div.pagination a.link').each((index, element) => {
            let link = partial.find(element).attr('href');
            let offset = link.replace(/^.*offset=/, '');
            if (offset !== '0') {
              urls.push({
                type: 'episodes-' + offset,
                url: link
              });
            }
          });
        }

        return urls;
      },
      name: function(partial, full) {
        return partial.find('div#contentWrapper div:first-of-type h1 span').text();
      },
      altNames: function(partial, full) {
        return partial.find('td.borderClass div.js-scrollfix-bottom').find('div.spaceit_pad').map((index, element) => {
          let altNames = partial.find(element);
          altNames.find('span').remove();
          return altNames.text().split(', ');
        }).get();
      },
      description: function(partial, full) {
        return partial.find('td span[itemprop=description]').html();
      },
      type: function(partial, full) {
        let type = undefined;
        partial.find('td.borderClass div.js-scrollfix-bottom div').each((index, element) => {
          let row = partial.find(element);
          if (row.find('span').text() === 'Type:') {
            row.find('span').remove();
            type = row.text().replace(/Unknown/g, '');
          }
        });
        return type;
      },
      malId: function(partial, full) {
        return getMalIdFromUrl(partial.find('div#horiznav_nav ul li:first-of-type a').attr('href'));
      },
    },
  },

  // Related shows data
  showRelated: {
    rowSelector: 'table.anime_detail_related_anime tbody a',
    rowIgnore: function(partial) {
      return partial.attr('href').startsWith('/manga/');
    },

    // Related shows attribute data
    attributes: {
      streamerUrls: function(partial, full) {
        return [{
          type: 'details',
          url: myanimelist.homepage + partial.attr('href')
        }, {
          type: 'pictures',
          url: myanimelist.homepage + partial.attr('href') + '/pics'
        }];
      },
      name: function(partial, full) {
        return partial.text();
      },
      malId: function(partial, full) {
        return getMalIdFromUrl(partial.attr('href'));
      },
    },
  },

  // Episode list data
  showEpisodes: {
    rowSelector: 'table.episode_list.ascend tbody tr',
    rowSkips: 1,
    cannotCount: false,

    // Episode list attribute data
    attributes: {
      episodeNumStart: function(partial, full) {
        return partial.find('td.episode-number').text();
      },
      episodeNumEnd: function(partial, full) {
        return partial.find('td.episode-number').text();
      },
      translationType: function(partial, full) {
        return 'sub';
      },
      sourceUrl: function(partial, full) {
        return partial.find('td.episode-title a').attr('href');
      },
      sources: function(partial, full) {
        return [{
          name: 'Crunchyroll',
          url: partial.find('td.episode-title a').attr('href') + '?provider_id=1',
          flags: ['flash']
        }];
      },
    },
  },
};