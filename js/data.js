/* Seventy-Three — book data, sections, path stages, timeline eras. */
(function () {
  const BB = (window.BB = window.BB || {});

  BB.SECTIONS = [
    { id: 'pent', name: 'Pentateuch', testament: 'OT', blurb: 'The five books of Moses: creation, covenant, and the Law.' },
    { id: 'hist', name: 'Historical Books', testament: 'OT', blurb: "Israel's story from the conquest of Canaan to the Maccabees." },
    { id: 'wis', name: 'Wisdom Books', testament: 'OT', blurb: 'Poetry, prayer, and reflection on how to live wisely before God.' },
    { id: 'proph', name: 'Prophets', testament: 'OT', blurb: "God's messengers calling Israel back and pointing ahead to the Messiah." },
    { id: 'gosp', name: 'Gospels', testament: 'NT', blurb: 'The life, teaching, death, and resurrection of Jesus.' },
    { id: 'acts', name: 'History', testament: 'NT', blurb: 'The birth and spread of the early Church.' },
    { id: 'paul', name: 'Pauline Letters', testament: 'NT', blurb: 'Letters of St. Paul (traditionally with Hebrews) to churches and co-workers.' },
    { id: 'cath', name: 'Catholic Letters', testament: 'NT', blurb: 'Letters addressed to the whole ("catholic", universal) Church.' },
    { id: 'apoc', name: 'Apocalyptic', testament: 'NT', blurb: "John's vision of Christ's final victory and the new creation." },
  ];

  // [name, abbreviation, section, short tag, summary, extra accepted answers (|-separated)]
  const RAW = [
    ['Genesis', 'Gen', 'pent', 'Creation & the patriarchs', 'God creates a good world, humanity falls into sin, and God begins His plan of salvation by calling Abraham, Isaac, Jacob, and Joseph. It teaches that God is the Creator who keeps His covenant promises.', 'gn|ge'],
    ['Exodus', 'Exod', 'pent', 'Freedom from Egypt', 'God frees the Israelites from slavery in Egypt through Moses, gives the Ten Commandments at Mount Sinai, and comes to dwell among them in the tabernacle. It teaches that God saves His people and calls them into covenant.', 'ex|exo'],
    ['Leviticus', 'Lev', 'pent', 'Holiness & worship', 'Laws for priests, sacrifices, feasts, and purity that show Israel how to worship and live near a holy God. Its key message: "Be holy, for I am holy."', 'lv'],
    ['Numbers', 'Num', 'pent', 'Forty years in the desert', 'Israel is counted in a census and wanders forty years in the wilderness after refusing to trust God at the edge of the Promised Land. It teaches the cost of grumbling and unbelief, and God\'s faithfulness despite them.', 'nm|nb'],
    ['Deuteronomy', 'Deut', 'pent', "Moses' farewell sermons", 'Moses retells the Law in farewell speeches before Israel enters Canaan, urging the people to love the Lord with all their heart, soul, and strength. It teaches that obedience leads to life and blessing.', 'dt'],
    ['Joshua', 'Josh', 'hist', 'Conquest of Canaan', 'Joshua leads Israel across the Jordan, conquers Canaan, and divides the land among the twelve tribes. It teaches that God fulfills His promises when His people trust and obey.', 'jos|josue'],
    ['Judges', 'Judg', 'hist', 'Cycles of sin & rescue', 'Israel repeatedly falls into idolatry, suffers oppression, cries out, and is rescued by judges like Deborah, Gideon, and Samson. It shows the chaos that comes when "everyone did what was right in their own eyes."', 'jgs|jdg'],
    ['Ruth', 'Ruth', 'hist', 'Loyal love', 'Ruth, a Moabite widow, stays loyal to her mother-in-law Naomi and marries Boaz, becoming the great-grandmother of King David. It teaches faithful love and God\'s care for outsiders.', 'ru|rt'],
    ['1 Samuel', '1 Sam', 'hist', 'Samuel, Saul & young David', 'Samuel, the last judge, anoints Saul as Israel\'s first king; when Saul disobeys, God chooses the shepherd boy David, who defeats Goliath. It teaches that God looks at the heart.', '1 sm|1 sa'],
    ['2 Samuel', '2 Sam', 'hist', "King David's reign", 'David reigns as king, makes Jerusalem his capital, and receives God\'s promise of an everlasting dynasty, but his sin with Bathsheba brings turmoil. It teaches repentance and God\'s covenant with David.', '2 sm|2 sa'],
    ['1 Kings', '1 Kgs', 'hist', 'Solomon & a divided kingdom', 'Solomon builds the Temple in Jerusalem, but after his death the kingdom splits into Israel and Judah, and the prophet Elijah confronts idolatry. It shows how faithfulness or unfaithfulness shapes a nation.', '1 ki|1 kin|1 kg|3 kings'],
    ['2 Kings', '2 Kgs', 'hist', 'Fall of Israel & Judah', 'Elisha carries on Elijah\'s ministry as kings come and go, until Assyria conquers Israel and Babylon destroys Jerusalem. It teaches that persistent unfaithfulness leads to exile.', '2 ki|2 kin|2 kg|4 kings'],
    ['1 Chronicles', '1 Chr', 'hist', "David's line & worship", 'Retells history from Adam to David through genealogies, focusing on David\'s preparations for worship in the Temple. It reminded the returning exiles of who they were as God\'s people.', '1 chron|1 ch|1 paralipomenon'],
    ['2 Chronicles', '2 Chr', 'hist', "Judah's kings & the Temple", 'Retells the history of Solomon and the kings of Judah up to the Exile, highlighting the Temple and the kings who led reforms. It teaches that seeking God brings renewal.', '2 chron|2 ch|2 paralipomenon'],
    ['Ezra', 'Ezra', 'hist', 'Return & a rebuilt Temple', 'Jewish exiles return from Babylon, rebuild the Temple, and are renewed in the Law under Ezra the priest and scribe. It teaches restoration through worship and God\'s word.', 'ezr|1 esdras'],
    ['Nehemiah', 'Neh', 'hist', "Rebuilding Jerusalem's walls", 'Nehemiah leads the rebuilding of Jerusalem\'s walls despite opposition, and the people renew their covenant with God. It teaches prayerful leadership and perseverance.', 'ne|2 esdras'],
    ['Tobit', 'Tob', 'hist', 'A faithful family & an angel', 'A devout Israelite in exile is blinded, and his son Tobias travels with the angel Raphael, who heals Tobit and frees Sarah from a demon. It teaches prayer, almsgiving, holy marriage, and God\'s providence.', 'tb|tobias'],
    ['Judith', 'Jdt', 'hist', 'A widow saves her people', 'The brave and devout widow Judith saves her besieged town by defeating the Assyrian general Holofernes. It teaches trust in God, who saves His people through the weak.', 'jth'],
    ['Esther', 'Esth', 'hist', 'A queen saves her people', 'Queen Esther risks her life to save the Jews of Persia from Haman\'s plot to destroy them; the Catholic text includes Greek additions with her prayers. It teaches courage and God\'s hidden providence.', 'est|es'],
    ['1 Maccabees', '1 Macc', 'hist', 'The Maccabean revolt', 'Judas Maccabeus and his brothers lead a revolt against the Greek king Antiochus IV, who tried to force pagan worship, and rededicate the Temple (the origin of Hanukkah). It teaches fidelity to God under persecution.', '1 mac|1 mc|1 machabees'],
    ['2 Maccabees', '2 Macc', 'hist', 'Martyrs & resurrection hope', 'Retells the Maccabean struggle, including the martyrdom of a mother and her seven sons. It teaches belief in the resurrection of the dead and the value of praying for the dead.', '2 mac|2 mc|2 machabees'],
    ['Job', 'Job', 'wis', 'Why do the innocent suffer?', 'Righteous Job loses everything and wrestles with why the innocent suffer, until God answers him from the whirlwind. It teaches trust in God\'s wisdom beyond our understanding.', 'jb'],
    ['Psalms', 'Ps', 'wis', "Israel's prayer book", 'Prayer-songs of praise, lament, thanksgiving, and trust, many attributed to King David. It teaches us how to pray in every situation of life.', 'psalm|psa|pss|psalter'],
    ['Proverbs', 'Prov', 'wis', 'Practical wisdom for life', 'Short sayings of practical wisdom, many attributed to Solomon, about work, speech, family, and friendship. Its theme: "The fear of the Lord is the beginning of wisdom."', 'prv|pr|pro'],
    ['Ecclesiastes', 'Eccl', 'wis', '"Vanity of vanities"', 'The Teacher (Qoheleth) reflects that everything "under the sun" is fleeting. It teaches us to enjoy God\'s gifts and fear God, since only He gives life lasting meaning.', 'eccles|ecc|ec|qoheleth|qohelet'],
    ['Song of Songs', 'Song', 'wis', 'Poetry of love', 'Love poems between a bride and her bridegroom celebrating the goodness of human love. It is also read as a picture of God\'s love for His people and Christ\'s love for the Church.', 'sg|song of solomon|songs|canticle of canticles|canticles|sos'],
    ['Wisdom', 'Wis', 'wis', 'Wisdom & immortality', 'Written in the voice of King Solomon, it praises divine Wisdom and teaches that "the souls of the righteous are in the hand of God." It teaches immortality and warns against idolatry.', 'ws|wisdom of solomon'],
    ['Sirach', 'Sir', 'wis', "Ben Sira's teachings", 'Also called Ecclesiasticus, this collection of teachings by Jesus ben Sira gives wise guidance on family, friendship, speech, and worship. It teaches that true wisdom is found in keeping God\'s Law.', 'ecclesiasticus|ben sira|ben sirach|wisdom of ben sira'],
    ['Isaiah', 'Isa', 'proph', 'Emmanuel & the Suffering Servant', 'Isaiah warns Judah of judgment and foretells Emmanuel, the Suffering Servant, and a new creation. It is called the "Fifth Gospel" for its many prophecies of Christ.', 'is|isaias'],
    ['Jeremiah', 'Jer', 'proph', 'The weeping prophet', 'Jeremiah warns Judah to repent before Babylon destroys Jerusalem, and suffers greatly for his message. He promises a new covenant written on the heart.', 'jeremias|jr'],
    ['Lamentations', 'Lam', 'proph', 'Grief over Jerusalem', 'Five poems mourning the destruction of Jerusalem in 587 BC. In the midst of grief it teaches hope: the Lord\'s mercies are new every morning.', 'la'],
    ['Baruch', 'Bar', 'proph', "Exiles' confession & hope", 'Attributed to Jeremiah\'s secretary Baruch, it gives the exiles a prayer of repentance, a poem in praise of Wisdom, and a promise of return. It teaches repentance and hope.', 'ba'],
    ['Ezekiel', 'Ezek', 'proph', 'Visions in exile', 'Ezekiel, a priest in exile, sees visions of God\'s glory leaving and returning to the Temple and of dry bones coming to life. It teaches God\'s holiness and His promise of a new heart and a new spirit.', 'ez|eze|ezechiel'],
    ['Daniel', 'Dan', 'proph', 'Faith in Babylon & visions', 'Daniel and his friends stay faithful in Babylon (the fiery furnace, the lions\' den), and Daniel sees visions of God\'s coming kingdom and the Son of Man. It teaches that God rules over earthly empires.', 'dn|da'],
    ['Hosea', 'Hos', 'proph', 'Love for an unfaithful bride', 'Hosea\'s marriage to an unfaithful wife pictures God\'s faithful love for unfaithful Israel. It teaches God\'s steadfast love and His call to return.', 'ho|osee'],
    ['Joel', 'Joel', 'proph', 'The Day of the Lord', 'A plague of locusts becomes a call to repentance before the Day of the Lord. It promises that God will pour out His Spirit on all flesh, fulfilled at Pentecost.', 'jl'],
    ['Amos', 'Amos', 'proph', 'Justice for the poor', 'A shepherd from Tekoa condemns Israel\'s injustice toward the poor and its empty worship. It teaches: "Let justice roll down like waters."', 'am'],
    ['Obadiah', 'Obad', 'proph', 'Judgment on Edom', 'The shortest book of the Old Testament announces judgment on Edom for rejoicing over Jerusalem\'s fall. It teaches that pride comes before a fall and that God defends His people.', 'ob|abdias'],
    ['Jonah', 'Jonah', 'proph', 'The reluctant prophet', 'Jonah runs from God\'s call, is swallowed by a great fish, and finally preaches to Nineveh, which repents. It teaches that God\'s mercy reaches all nations.', 'jon|jonas'],
    ['Micah', 'Mic', 'proph', 'Do justice, love mercy', 'Micah condemns injustice and foretells that the Messiah will be born in Bethlehem. It sums up God\'s call: "Do justice, love kindness, and walk humbly with your God."', 'mi|micheas'],
    ['Nahum', 'Nah', 'proph', 'The fall of Nineveh', 'Nahum announces the fall of Nineveh, the cruel capital of Assyria. It teaches that God is patient but will judge oppression.', 'na'],
    ['Habakkuk', 'Hab', 'proph', 'Questions & faith', 'Habakkuk asks why God allows evil and why He would use Babylon to punish Judah, and learns that "the righteous shall live by faith."', 'hb|habacuc'],
    ['Zephaniah', 'Zeph', 'proph', 'Day of wrath, then joy', 'Zephaniah warns of the coming Day of the Lord, then promises a humble remnant over whom God will rejoice with singing.', 'zep|sophonias'],
    ['Haggai', 'Hag', 'proph', 'Rebuild the Temple!', 'Haggai urges the returned exiles to stop neglecting God\'s house and finish rebuilding the Temple. It teaches putting God first.', 'hg|aggeus|aggai'],
    ['Zechariah', 'Zech', 'proph', 'Visions & the coming King', 'Zechariah encourages the rebuilding with visions and foretells a humble king riding on a donkey. It teaches hope in the coming Messiah.', 'zec|zacharias'],
    ['Malachi', 'Mal', 'proph', 'The last Old Testament prophet', 'Malachi calls the people to sincere worship and foretells a messenger, Elijah, who will prepare the way of the Lord. It points ahead to John the Baptist.', 'ml|malachias'],
    ['Matthew', 'Matt', 'gosp', 'Jesus, the promised King', 'Written for Jewish believers, it presents Jesus as the Messiah who fulfills the prophecies, with the Sermon on the Mount and the founding of the Church on Peter. It teaches the Kingdom of Heaven.', 'mt|mat'],
    ['Mark', 'Mark', 'gosp', 'Jesus, the suffering Servant', 'The shortest and fastest-moving Gospel shows Jesus as the Son of God who serves and suffers. It teaches that true discipleship means taking up the cross.', 'mk|mrk|mar'],
    ['Luke', 'Luke', 'gosp', 'Jesus, Savior of all', 'A careful account highlighting Jesus\' mercy for the poor, sinners, and outsiders, with the Nativity story and parables like the Prodigal Son. It teaches that God\'s salvation is for everyone.', 'lk|luk'],
    ['John', 'John', 'gosp', 'Jesus, the Word made flesh', 'Reveals Jesus as the eternal Word and Son of God through seven signs and the "I AM" sayings. It teaches that believing in Jesus brings eternal life.', 'jn|joh'],
    ['Acts of the Apostles', 'Acts', 'acts', 'Birth & spread of the Church', 'The sequel to Luke\'s Gospel: the Holy Spirit comes at Pentecost and the Church spreads from Jerusalem to Rome through Peter and Paul. It teaches the Church\'s mission to all nations.', 'ac|act'],
    ['Romans', 'Rom', 'paul', 'Saved by grace through faith', 'Paul\'s fullest explanation of the Gospel: all have sinned, and all are justified by God\'s grace through faith in Christ. It teaches new life in the Spirit.', 'ro|rm'],
    ['1 Corinthians', '1 Cor', 'paul', 'Unity, love & resurrection', 'Paul corrects divisions in Corinth and teaches about the Eucharist, spiritual gifts, the resurrection, and love: "Love is patient, love is kind."', '1 co'],
    ['2 Corinthians', '2 Cor', 'paul', 'Strength in weakness', 'Paul defends his ministry and shares his sufferings. It teaches that God\'s power is made perfect in weakness and that we are ambassadors of reconciliation.', '2 co'],
    ['Galatians', 'Gal', 'paul', 'Freedom in Christ', 'Paul insists we are justified by faith in Christ, not by the works of the Mosaic Law, and urges living by the Spirit, whose fruit is love, joy, peace, and more.', 'ga'],
    ['Ephesians', 'Eph', 'paul', 'One Body in Christ', 'Paul celebrates the Church as the Body and Bride of Christ, uniting Jews and Gentiles. It teaches unity, Christian family life, and putting on the armor of God.', 'ephes'],
    ['Philippians', 'Phil', 'paul', 'Joy in the Lord', 'Written from prison, this warm letter urges joy and humility and includes the hymn of Christ who emptied Himself. It teaches: "Rejoice in the Lord always."', 'php|phi|pp'],
    ['Colossians', 'Col', 'paul', 'Christ above all', 'Paul proclaims Christ as supreme over all creation and head of the Church. It teaches that in Christ we have everything, so we should set our minds on things above.', 'co'],
    ['1 Thessalonians', '1 Thess', 'paul', 'Hope in Christ\'s return', 'Paul encourages a young church and comforts them about believers who have died, teaching about the Lord\'s Second Coming. It urges: "Pray without ceasing."', '1 thes|1 th|1 thess'],
    ['2 Thessalonians', '2 Thess', 'paul', 'Stand firm until He comes', 'Paul corrects confusion about the end times, explaining that the Day of the Lord has not yet come. It teaches perseverance and faithful work while we wait.', '2 thes|2 th'],
    ['1 Timothy', '1 Tim', 'paul', 'Guidance for a young pastor', 'Paul instructs Timothy on leading the Church in Ephesus: sound teaching, prayer, and the qualities required of bishops and deacons. It teaches good order in the Church.', '1 tm|1 ti'],
    ['2 Timothy', '2 Tim', 'paul', "Paul's last letter", 'Facing death, Paul urges Timothy to guard the faith and preach the word, for all Scripture is inspired by God. "I have fought the good fight."', '2 tm|2 ti'],
    ['Titus', 'Titus', 'paul', 'Good order in Crete', 'Paul instructs Titus on appointing elders and teaching sound doctrine in Crete. It teaches that God\'s grace trains us to live godly lives.', 'ti|tit'],
    ['Philemon', 'Phlm', 'paul', 'Welcome him as a brother', 'A short personal letter asking Philemon to welcome back his runaway slave Onesimus as a brother in Christ. It teaches forgiveness and Christian brotherhood.', 'phm|philem'],
    ['Hebrews', 'Heb', 'paul', 'Christ, our great High Priest', 'Shows that Jesus is greater than the angels, Moses, and the old priesthood, offering the perfect sacrifice once for all. It teaches perseverance in faith, with its "hall of faith" in chapter 11.', 'he|hbr'],
    ['James', 'Jas', 'cath', 'Faith that works', 'A practical letter teaching that faith without works is dead, with wisdom about trials, taming the tongue, and caring for the poor. It also describes the anointing of the sick.', 'jm|jms'],
    ['1 Peter', '1 Pet', 'cath', 'Hope in suffering', 'Peter encourages persecuted Christians to stand firm as "a chosen race, a royal priesthood, a holy nation." It teaches hope by sharing in the sufferings of Christ.', '1 pt|1 pe'],
    ['2 Peter', '2 Pet', 'cath', 'Beware of false teachers', 'Peter warns against false teachers and reminds believers that the Lord will return, for He is patient. It teaches growth in virtue and knowledge of Christ.', '2 pt|2 pe'],
    ['1 John', '1 John', 'cath', 'God is love', 'Teaches that God is light and God is love, and that true believers walk in the light and love one another. It gives assurance of eternal life.', '1 jn|1 jo|1 joh'],
    ['2 John', '2 John', 'cath', 'Walk in truth & love', 'A brief letter to "the elect lady" urging love for one another and warning against deceivers who deny that Christ came in the flesh.', '2 jn|2 jo|2 joh'],
    ['3 John', '3 John', 'cath', 'Hospitality to missionaries', 'A short note to Gaius praising his hospitality to traveling missionaries and criticizing the proud Diotrephes. It teaches support for those who spread the truth.', '3 jn|3 jo|3 joh'],
    ['Jude', 'Jude', 'cath', 'Contend for the faith', 'A brief, urgent letter urging believers to contend for the faith against false teachers and to keep themselves in the love of God.', 'jde'],
    ['Revelation', 'Rev', 'apoc', "Christ's final victory", "John's visions of the risen Christ, heavenly worship, and the battle between good and evil, ending with the New Jerusalem. It teaches that Christ, the Lamb, triumphs and makes all things new.", 'rv|apocalypse|apoc|revelations|apocalypse of john|revelation to john'],
  ];

  const DEUTERO = new Set(['Tobit', 'Judith', '1 Maccabees', '2 Maccabees', 'Wisdom', 'Sirach', 'Baruch']);
  const STRICT_ALT = { 51: ['Acts'] };

  BB.SECTION_MAP = {};
  BB.SECTIONS.forEach((s, i) => { s.index = i; s.books = []; BB.SECTION_MAP[s.id] = s; });

  BB.BOOKS = RAW.map((r, i) => {
    const n = i + 1;
    const b = {
      n, name: r[0], abbr: r[1], sec: r[2], tag: r[3], summary: r[4],
      aliases: r[5] ? r[5].split('|') : [],
      testament: n <= 46 ? 'OT' : 'NT',
      deutero: DEUTERO.has(r[0]),
      strictAlt: STRICT_ALT[n] || [],
    };
    BB.SECTION_MAP[b.sec].books.push(n);
    return b;
  });
  BB.SECTIONS.forEach((s) => { s.from = s.books[0]; s.to = s.books[s.books.length - 1]; });
  BB.book = (n) => BB.BOOKS[n - 1];
  BB.sec = (id) => BB.SECTION_MAP[id];

  // Path stages — one per section, long sections split into chunks of 4–8 books.
  BB.STAGES = [
    { id: 'pent', title: 'The Pentateuch', from: 1, to: 5, games: ['order', 'match'],
      mnemonic: 'Good Elephants Like Nice Dates',
      how: 'G · E · L · N · D — Genesis, Exodus, Leviticus, Numbers, Deuteronomy. The five "books of Moses".' },
    { id: 'hist1', title: 'Conquest & Kingdom', from: 6, to: 10, games: ['missing', 'first'],
      mnemonic: 'Just Judge Ruth, Sam & Sam',
      how: 'Joshua takes the land, the Judges rule, Ruth is loyal — then two books of Samuel.' },
    { id: 'hist2', title: 'Kings & Return', from: 11, to: 16, games: ['shelf', 'hood'],
      mnemonic: 'Kings Keep Crowns Carefully, Even Now',
      how: 'K · K · C · C · E · N — two Kings, two Chronicles, then the rebuilders Ezra and Nehemiah.' },
    { id: 'hist3', title: 'Heroes & Maccabees', from: 17, to: 21, games: ['unscramble', 'survival'],
      mnemonic: 'Tiny Judy Eats Many Muffins',
      how: 'T · J · E · M · M — three hero stories (Tobit, Judith, Esther), then 1 and 2 Maccabees.' },
    { id: 'wis', title: 'The Wisdom Books', from: 22, to: 28, games: ['mystery', 'match'],
      mnemonic: 'Just Pray, Ponder, Expect Songs of Wisdom, Sir!',
      how: 'J · P · P · E · S · W · S — Job, Psalms, Proverbs, Ecclesiastes, Song of Songs, Wisdom, Sirach.' },
    { id: 'proph1', title: 'The Major Prophets', from: 29, to: 34, games: ['order', 'unscramble'],
      mnemonic: 'I Just Love Big Eggs, Dad!',
      how: 'I · J · L · B · E · D — Isaiah, Jeremiah, then Jeremiah\'s two companions (Lamentations, Baruch), then Ezekiel and Daniel.' },
    { id: 'proph2', title: 'Minor Prophets I', from: 35, to: 40, games: ['survival', 'missing'],
      mnemonic: 'Hot Jam And Oatmeal, Just Mmm!',
      how: 'H · J · A · O · J · M — Hosea, Joel, Amos, Obadiah, Jonah, Micah.' },
    { id: 'proph3', title: 'Minor Prophets II', from: 41, to: 46, games: ['unscramble', 'shelf'],
      mnemonic: 'Nice Hats, Zany Hats, Zero Money',
      how: 'N · H · Z · H · Z · M — Nahum, Habakkuk, Zephaniah, Haggai, Zechariah, Malachi. Notice the H-Z, H-Z rhythm!' },
    { id: 'gosp', title: 'Gospels & Acts', from: 47, to: 51, games: ['speed', 'match'],
      mnemonic: "Many Men Love Jesus' Apostles",
      how: 'M · M · L · J · A — "Matthew, Mark, Luke, and John… then Acts carries the story on."' },
    { id: 'paul1', title: "Paul's Great Letters", from: 52, to: 55, games: ['hood', 'first'],
      mnemonic: 'Rich Cookies Crumble Gently',
      how: 'R · C · C · G — Romans, 1 and 2 Corinthians, Galatians.' },
    { id: 'paul2', title: 'Prison & Hope Letters', from: 56, to: 60, games: ['order', 'mystery'],
      mnemonic: 'Eat Pop Corn, Then Talk Twice',
      how: 'E · P · C · T · T — Ephesians, Philippians, Colossians, 1 and 2 Thessalonians. (Classic: "Go Eat Pop Corn" = Galatians, Ephesians, Philippians, Colossians.)' },
    { id: 'paul3', title: 'Pastors & Friends', from: 61, to: 65, games: ['unscramble', 'survival'],
      mnemonic: 'Tim, Tim, Titus Plays Hide-and-seek',
      how: 'T · T · T · P · H — 1 and 2 Timothy, Titus, Philemon, Hebrews.' },
    { id: 'cath', title: 'Catholic Letters & Revelation', from: 66, to: 73, games: ['shelf', 'speed'],
      mnemonic: 'James, Peter ×2, John ×3, Jude — then Revelation!',
      how: 'Count 1-2-3-1-1: one James, two Peters, three Johns, one Jude, and the grand finale, Revelation.' },
  ];
  BB.STAGE_MAP = {};
  BB.STAGES.forEach((s, i) => {
    s.index = i;
    s.books = [];
    for (let n = s.from; n <= s.to; n++) s.books.push(n);
    s.sec = BB.book(s.from).sec;
    BB.STAGE_MAP[s.id] = s;
  });
  BB.stageOf = (n) => BB.STAGES.find((s) => n >= s.from && n <= s.to);

  BB.COUNT_TIP = 'Section counts — Old Testament 5 · 16 · 7 · 18 = 46; New Testament 4 · 1 · 14 · 7 · 1 = 27.';

  // The larger story, ordered by when each book is set.
  BB.ERAS = [
    { id: 'origins', title: 'Creation & the Patriarchs', dates: 'Beginnings – c. 1700 BC',
      story: 'God creates the world, humanity falls, and God calls Abraham and his family — Isaac, Jacob, Joseph — to carry His promise.',
      books: [1, 22] },
    { id: 'exodus', title: 'Exodus & the Wilderness', dates: 'c. 1300 – 1250 BC',
      story: 'Moses leads Israel out of Egypt; at Sinai God gives the Law and the covenant, and Israel wanders forty years before reaching the Promised Land.',
      books: [2, 3, 4, 5] },
    { id: 'conquest', title: 'Conquest & the Judges', dates: 'c. 1250 – 1050 BC',
      story: 'Joshua leads Israel into Canaan; judges rescue the tribes from cycles of sin; Ruth shows faithful love in dark days.',
      books: [6, 7, 8] },
    { id: 'kingdom', title: 'The United Kingdom', dates: 'c. 1050 – 930 BC',
      story: 'Saul, David, and Solomon reign over one Israel. David sings the Psalms; Solomon builds the Temple and gathers wisdom.',
      books: [9, 10, 13, 23, 24, 25, 26] },
    { id: 'divided', title: 'The Divided Kingdom', dates: 'c. 930 – 587 BC',
      story: 'The kingdom splits into Israel (north) and Judah (south). Prophets warn both; Assyria conquers Israel in 722 BC and Babylon threatens Judah.',
      books: [11, 12, 14, 29, 30, 35, 36, 37, 39, 40, 41, 42, 43] },
    { id: 'exile', title: 'Exile', dates: '587 – 538 BC',
      story: 'Babylon destroys Jerusalem and the Temple. In exile, God\'s people mourn, repent, and hold on to hope through prophets and faithful heroes.',
      books: [31, 32, 33, 34, 38, 17, 18] },
    { id: 'return', title: 'Return & Rebuilding', dates: '538 – c. 400 BC',
      story: 'Persia lets the exiles go home. They rebuild the Temple and the walls of Jerusalem, while Esther protects the Jews who remain abroad.',
      books: [15, 16, 19, 44, 45, 46] },
    { id: 'greek', title: 'Greek Rule & the Maccabees', dates: 'c. 333 – 63 BC',
      story: 'After Alexander the Great, Greek kings rule. The Maccabees resist forced paganism, and Jewish sages write on wisdom and the afterlife.',
      books: [20, 21, 27, 28] },
    { id: 'christ', title: 'The Life of Christ', dates: 'c. 6 BC – AD 30',
      story: 'The Word becomes flesh: Jesus is born, teaches, works signs, dies on the Cross, and rises from the dead.',
      books: [47, 48, 49, 50] },
    { id: 'church', title: 'The Early Church', dates: 'AD 30 – c. 100',
      story: 'The Holy Spirit comes at Pentecost. The Apostles spread the Gospel to the nations and write letters to guide the young churches.',
      books: [51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72] },
    { id: 'end', title: 'The End & the New Creation', dates: 'Until Christ returns',
      story: 'Christ will come again in glory. Revelation unveils His victory over evil and the New Jerusalem where God dwells with His people.',
      books: [73] },
  ];
  BB.eraOf = (n) => BB.ERAS.find((e) => e.books.includes(n));
})();
