/* Collectible card catalogue.
   Every entry is one Oxford Discover 1 flashcard, labelled by eye from contact
   sheets -- the source JPGs carry no word, only a number. `t` is the theme used
   to decide which region a card can drop in.

   Art is OPTIONAL. If assets/cards/cNNN.jpg is missing the UI draws a lettered
   fallback tile instead, so the game is fully playable without shipping the
   publisher's images. See README, "About the artwork". */
(function (global) {
  'use strict';

  var C = {
    /* --- family & people --- */
    '001': ['family', 'people'], '002': ['grandmother', 'people'], '003': ['mother', 'people'],
    '004': ['father', 'people'], '005': ['sister', 'people'], '006': ['brother', 'people'],
    '007': ['grandfather', 'people'], '008': ['friends', 'people'], '009': ['uncle', 'people'],
    '010': ['aunt', 'people'], '011': ['cousin', 'people'], '012': ['grandparents', 'people'],
    '013': ['daughter', 'people'], '014': ['son', 'people'],
    '017': ['playing', 'people'], '018': ['thinking', 'feelings'], '019': ['scared', 'feelings'],
    '020': ['happy', 'feelings'], '021': ['painting', 'play'], '022': ['sleeping', 'feelings'],
    '074': ['library', 'places'], '075': ['helping', 'people'], '076': ['bored', 'feelings'],
    '077': ['tired', 'feelings'], '155': ['jobs', 'jobs'], '156': ['doctor', 'jobs'],
    '157': ['police officer', 'jobs'], '158': ['teacher', 'jobs'], '231': ['crowd', 'people'],
    '241': ['playing together', 'people'], '244': ['cooking', 'people'], '245': ['smelling', 'people'],
    '246': ['door', 'home'], '247': ['in bed', 'home'], '248': ['running', 'play'],
    '249': ['lying down', 'feelings'], '250': ['asleep', 'feelings'],

    /* --- animals --- */
    '015': ['elephant', 'animals'], '016': ['tortoise', 'animals'], '023': ['hamster', 'animals'],
    '024': ['goldfish', 'animals'], '025': ['budgie', 'animals'], '026': ['rabbit', 'animals'],
    '027': ['gecko', 'animals'], '028': ['kitten', 'animals'], '057': ['eagle', 'animals'],
    '058': ['chick', 'animals'], '059': ['nest', 'animals'], '060': ['possum', 'animals'],
    '061': ['burrow', 'animals'], '062': ['bee', 'animals'], '063': ['bees', 'animals'],
    '064': ['crab', 'animals'], '068': ['squirrel', 'animals'], '069': ['mouse', 'animals'],
    '070': ['frog', 'animals'], '071': ['orangutan', 'animals'], '073': ['baby wombat', 'animals'],
    '078': ['bird feeder', 'animals'], '141': ['calf', 'animals'], '142': ['cow', 'animals'],
    '205': ['lion', 'animals'], '206': ['tortoise', 'animals'], '225': ['toad', 'animals'],
    '226': ['toy frog', 'play'], '049': ['jellyfish', 'animals'], '050': ['starfish', 'animals'],

    /* --- weather, seasons, sky --- */
    '037': ['fireworks', 'weather'], '038': ['night sky', 'weather'], '039': ['sunset', 'weather'],
    '081': ['sunrise', 'weather'], '082': ['blue sky', 'weather'], '083': ['sun', 'weather'],
    '084': ['sunset clouds', 'weather'], '085': ['windy day', 'weather'], '086': ['sunglasses', 'weather'],
    '087': ['autumn', 'weather'], '088': ['cold', 'weather'], '089': ['spring rain', 'weather'],
    '090': ['snowy road', 'weather'], '093': ['weather symbols', 'weather'], '094': ['cloudy', 'weather'],
    '095': ['sunny', 'weather'], '096': ['windy', 'weather'], '097': ['snowy', 'weather'],
    '098': ['rainy', 'weather'], '100': ['snowman', 'weather'], '108': ['at the beach', 'weather'],
    '110': ['hot drink', 'weather'], '111': ['flying a kite', 'weather'], '227': ['cold breath', 'weather'],
    '102': ['kite', 'play'],

    /* --- nature & places --- */
    '045': ['sea', 'nature'], '046': ['sand', 'nature'], '047': ['seaweed', 'nature'],
    '048': ['shell', 'nature'], '065': ['forest', 'nature'], '066': ['field', 'nature'],
    '067': ['pond', 'nature'], '072': ['jungle', 'nature'], '104': ['seedling', 'nature'],
    '112': ['flowers', 'nature'], '128': ['stone', 'nature'], '173': ['countryside', 'nature'],
    '176': ['Earth', 'nature'], '187': ['field of corn', 'nature'], '188': ['orchard', 'nature'],
    '232': ['plant', 'nature'], '234': ['bush', 'nature'], '236': ['grass', 'nature'],
    '237': ['rose', 'nature'], '239': ['path', 'nature'], '240': ['sand dunes', 'nature'],
    '099': ['looking closely', 'nature'],
    '079': ['city', 'places'], '080': ['city at night', 'places'], '169': ['street', 'places'],
    '170': ['square', 'places'], '171': ['town', 'places'], '172': ['city', 'places'],
    '175': ['office', 'places'], '191': ['park', 'places'], '192': ['library', 'places'],
    '193': ['market', 'places'], '194': ['supermarket', 'places'], '195': ['bakery', 'places'],
    '196': ['museum', 'places'], '233': ['bench', 'places'], '235': ['statue', 'places'],
    '238': ['fountain', 'places'], '182': ['science museum', 'places'], '183': ['shopping centre', 'places'],
    '184': ['restaurant', 'places'], '185': ['cinema', 'places'], '186': ['hotel', 'places'],
    '181': ['shoe shop', 'places'], '215': ['tickets', 'places'],
    '174': ['flat', 'home'], '189': ['house', 'home'], '190': ['wooden house', 'home'],

    /* --- clothes --- */
    '051': ['jacket', 'clothes'], '052': ['shorts', 'clothes'], '053': ['trainers', 'clothes'],
    '054': ['T-shirt', 'clothes'], '055': ['hat', 'clothes'], '056': ['trousers', 'clothes'],
    '147': ['school shoes', 'clothes'], '148': ['party shoes', 'clothes'],
    '159': ['shoelaces', 'clothes'], '161': ['washing line', 'clothes'],

    /* --- school & numbers --- */
    '113': ['numbers', 'numbers'], '114': ['plus', 'numbers'], '115': ['equals', 'numbers'],
    '116': ['a sum', 'numbers'], '117': ['adding', 'numbers'], '118': ['the answer', 'numbers'],
    '119': ['odd numbers', 'numbers'], '120': ['even numbers', 'numbers'],
    '091': ['calendar', 'numbers'], '092': ['week', 'numbers'], '160': ['money', 'numbers'],
    '121': ['marker', 'school'], '122': ['pencil', 'school'], '123': ['eraser', 'school'],
    '124': ['ruler', 'school'], '125': ['backpack', 'school'], '126': ['notebook', 'school'],
    '218': ['camera', 'school'],

    /* --- play --- */
    '213': ['building blocks', 'play'], '149': ['tablet', 'play'], '150': ['comic', 'play'],
    '151': ['board game', 'play'], '152': ['doll', 'play'], '153': ['stickers', 'play'],
    '154': ['badges', 'play'], '178': ['reading a comic', 'play'], '230': ['bubbles', 'play'],
    '101': ['climbing frame', 'play'], '107': ['bicycle', 'play'], '228': ['jumping', 'play'],
    '043': ['paint', 'play'], '044': ['mural', 'play'],

    /* --- food --- */
    '127': ['pot', 'food'], '129': ['a meal', 'food'], '130': ['sausages', 'food'],
    '131': ['carrots', 'food'], '132': ['onions', 'food'], '133': ['potatoes', 'food'],
    '134': ['soup', 'food'], '135': ['tomato', 'food'], '136': ['cucumber', 'food'],
    '137': ['avocado', 'food'], '138': ['orange', 'food'], '139': ['mango', 'food'],
    '140': ['peach', 'food'], '143': ['milk', 'food'], '144': ['fruit market', 'food'],
    '162': ['water', 'food'], '163': ['sandwich', 'food'], '164': ['grapes', 'food'],
    '165': ['orange juice', 'food'], '166': ['cookie', 'food'], '167': ['crisps', 'food'],
    '168': ['a can', 'food'], '103': ['baking', 'food'], '105': ['apple', 'food'],
    '106': ['breakfast', 'food'], '229': ['tomatoes', 'food'], '251': ['salad', 'food'],
    '252': ['chips', 'food'], '109': ['ice cream', 'food'],
    '145': ['customer', 'jobs'], '146': ['shopkeeper', 'jobs'],

    /* --- music & sound (Units 15-16) --- */
    '177': ['drum kit', 'music'], '197': ['percussion', 'music'], '198': ['cymbals', 'music'],
    '199': ['tambourine', 'music'], '200': ['xylophone', 'music'], '201': ['snare drum', 'music'],
    '202': ['triangle', 'music'], '203': ['maracas', 'music'], '204': ['drummer', 'music'],
    '207': ['loud', 'music'], '208': ['quiet', 'music'], '209': ['too loud', 'music'],
    '210': ['headphones', 'music'], '211': ['dancing', 'music'], '212': ['choir', 'music'],
    '214': ['piano', 'music'], '219': ['marching band', 'music'], '220': ['orchestra', 'music'],
    '221': ['ballet', 'music'], '222': ['a play', 'music'], '223': ['puppet show', 'music'],
    '224': ['circus', 'music'], '217': ['audience', 'music'], '216': ['collecting', 'people'],

    /* --- signs & the road --- */
    '179': ['crossing guard', 'signs'], '180': ['hurrying', 'signs'], '242': ['stop', 'signs'],
    '243': ['crossing the road', 'signs']
  };

  /* Which themes can drop in which region. */
  var THEMES = {
    1: ['weather', 'music'],
    2: ['school', 'numbers', 'play'],
    3: ['signs', 'places', 'home', 'clothes'],
    4: ['animals', 'nature', 'food'],
    5: ['people', 'feelings', 'jobs']
  };

  /* Cards awarded for a specific reason -- never random drops. */
  var SIGNATURE = {
    camera: '218',      /* the A2 word she spelt "camroa" */
    rainy: '098',       /* the l2-weather item she answered early */
    sunny: '095',
    stop: '242',
    percussion: '197',
    closed: '246'
  };

  function all() { return Object.keys(C).sort(); }
  function has(id) { return Object.prototype.hasOwnProperty.call(C, id); }
  function label(id) { return has(id) ? C[id][0] : ''; }
  function theme(id) { return has(id) ? C[id][1] : ''; }
  function pool(regionId) {
    var want = THEMES[regionId] || [];
    return all().filter(function (id) { return want.indexOf(C[id][1]) !== -1; });
  }
  function art(id) { return 'assets/cards/c' + id + '.jpg'; }

  global.Cards = {
    all: all, has: has, label: label, theme: theme, pool: pool, art: art,
    signature: SIGNATURE, themes: THEMES,
    get count() { return all().length; }
  };
})(window);
